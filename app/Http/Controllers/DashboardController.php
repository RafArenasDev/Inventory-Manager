<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Models\Category;
use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use App\Support\ChartSvg;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Chart\Chart;
use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;
use PhpOffice\PhpSpreadsheet\Chart\Legend;
use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
use PhpOffice\PhpSpreadsheet\Chart\Title;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = Carbon::today();
        $periods = ['diario', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'];
        $financials = [];

        foreach ($periods as $period) {
            $financials[$period] = [
                'sales' => $this->getSalesData($period),
                'incomes' => $this->getTransactionData('Ingreso', $period),
                'expenses' => $this->getTransactionData('Gasto', $period),
            ];
        }

        $salesProducts = Product::select(
            'id',
            'code',
            'category_id',
            'name',
            'description',
            'image_path',
            'price_without_tax',
            'price_with_tax',
            'iva_value',
            'sale_price',
            'supplier_id',
            'stock',
            'created_at',
            'updated_at'
        )->get();

        $salesClients = Client::with(['department', 'city'])
            ->select(
                'id',
                'document_type',
                'document_number',
                'verification_digit',
                'name',
                'department_id',
                'city_id',
                'phone',
                'cellphone',
                'address',
                'email',
                'is_active'
            )
            ->get()
            ->map(function ($client) {
                return [
                    'id' => $client->id,
                    'document_type' => $client->document_type,
                    'document_number' => $client->document_number,
                    'verification_digit' => $client->verification_digit,
                    'name' => $client->name,
                    'department_id' => $client->department_id,
                    'department' => $client->department?->name,
                    'city_id' => $client->city_id,
                    'city' => $client->city?->name,
                    'phone' => $client->phone,
                    'cellphone' => $client->cellphone,
                    'address' => $client->address,
                    'email' => $client->email,
                    'is_active' => $client->is_active,
                ];
            });

        $salesDepartments = Department::select('id', 'name')->get();
        $salesCities = City::select('id', 'name', 'department_id')->get();

        return Inertia::render('dashboard', [
            'stats' => [
                'usuarios' => User::count(),
                'proveedores' => Supplier::count(),
                'clientes' => Client::count(),
                'ventas' => Sale::where('is_cancelled', false)->count(),
                'movimientos' => InventoryMovement::count(),
                'categorias' => Category::count(),
                'productos' => Product::count(),
                'roles' => Role::count(),
                'pedidos' => PurchaseOrder::count(),
                'caja' => CashRegister::count(),
                'finanzas' => Transaction::count(),
            ],
            'financials' => $financials,
            'charts' => [
                'sales_data' => $this->getSalesChartData('diario'),
                'category_data' => $this->getCategoryChartData('diario'),
            ],
            'salesProducts' => $salesProducts,
            'salesClients' => $salesClients,
            'salesDepartments' => $salesDepartments,
            'salesCities' => $salesCities,
            'annualInvoicingAlert' => $this->annualInvoicingAlert(),
        ]);
    }

    /**
     * Aviso informativo (nunca bloquea nada) de cuándo el negocio se acerca
     * al tope de ingresos brutos anuales que obliga a facturación
     * electrónica ante la DIAN: 3.500 UVT — ver config/business.php para la
     * fuente y el valor de UVT vigente. Solo se muestra a partir del 70% del
     * tope para no generar ruido el resto del año.
     */
    private function annualInvoicingAlert(): ?array
    {
        $threshold = (int) round(config('business.uvt_value') * config('business.annual_invoicing_threshold_uvt'));

        $yearToDate = (int) Sale::where('is_cancelled', false)
            ->whereYear('sale_date', now()->year)
            ->sum('total_paid');

        $percentage = $threshold > 0 ? round(($yearToDate / $threshold) * 100, 1) : 0;

        if ($percentage < 70) {
            return null;
        }

        return [
            'year_to_date' => $yearToDate,
            'threshold' => $threshold,
            'percentage' => min($percentage, 999),
            'exceeded' => $yearToDate >= $threshold,
        ];
    }

    /**
     * Umbral de alerta de stock por defecto, usado cuando el producto no
     * define uno propio — ver `Product::DEFAULT_LOW_STOCK_THRESHOLD` y
     * `Product::$effective_low_stock_threshold`.
     */
    public const ALERT_STOCK_THRESHOLD = Product::DEFAULT_LOW_STOCK_THRESHOLD;

    public function lowStockNotifications()
    {
        // Cada producto puede definir su propio umbral (`low_stock_threshold`);
        // sin uno propio, cae al default general (COALESCE en SQL, portable
        // entre MySQL/Postgres/SQLite).
        $lowStockQuery = fn () => Product::whereRaw(
            'stock <= COALESCE(low_stock_threshold, ?)',
            [self::ALERT_STOCK_THRESHOLD]
        );

        $products = $lowStockQuery()
            ->select('id', 'code', 'name', 'stock', 'low_stock_threshold')
            ->orderBy('stock')
            ->limit(200)
            ->get();

        $activeProductIds = PurchaseOrderItem::query()
            ->whereHas('purchaseOrder', fn ($q) => $q->where('status', 'Solicitado'))
            ->whereIn('product_id', $products->pluck('id'))
            ->pluck('product_id')
            ->unique();

        $products = $products->map(function ($product) use ($activeProductIds) {
            return [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'stock' => $product->stock,
                'tier' => Product::stockTier($product->stock, $product->effective_low_stock_threshold),
                'has_active_order' => $activeProductIds->contains($product->id),
            ];
        });

        return response()->json([
            'products' => $products,
            'total' => $lowStockQuery()->count(),
        ]);
    }

    /**
     * Export dashboard data to Excel or PDF
     *
     * @param  string  $period
     * @param  string  $format
     * @return StreamedResponse
     */
    public function export(Request $request, $period, $format)
    {
        $validPeriods = ['diario', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'];
        if (! in_array($period, $validPeriods)) {
            abort(400, 'Invalid period');
        }

        if (! in_array($format, ['excel', 'pdf'])) {
            abort(400, 'Invalid format');
        }

        // El reporte exportado siempre incluye TODOS los períodos y TODA la
        // información, sin importar qué filtro esté seleccionado en el
        // dashboard visual (ahí se filtra solo para ocupar menos espacio en
        // pantalla; el reporte es para revisar completo).
        $allPeriods = ['diario', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'];
        $allFinancials = [];
        $allSalesData = [];
        $allCategoryData = [];

        foreach ($allPeriods as $p) {
            $allFinancials[$p] = [
                'sales' => $this->getSalesData($p),
                'incomes' => $this->getTransactionData('Ingreso', $p),
                'expenses' => $this->getTransactionData('Gasto', $p),
            ];
            $allSalesData[$p] = $this->getSalesChartData($p);
            $allCategoryData[$p] = $this->getCategoryChartData($p);
        }

        if ($format === 'excel') {
            return $this->exportToExcel($allPeriods, $allFinancials, $allSalesData, $allCategoryData);
        } else {
            return $this->exportToPDF($allPeriods, $allFinancials, $allSalesData, $allCategoryData);
        }
    }

    private function exportToExcel($allPeriods, $allFinancials, $allSalesData, $allCategoryData)
    {
        $spreadsheet = new Spreadsheet;
        $financialSheet = $spreadsheet->getActiveSheet();
        $financialSheet->setTitle('Dashboard Report');

        $logoPath = public_path('assets/img/black.png');
        if (file_exists($logoPath)) {
            $drawing = new Drawing;
            $drawing->setPath($logoPath);
            $drawing->setHeight(40);
            $drawing->setCoordinates('A1');
            $drawing->setOffsetX(5);
            $drawing->setOffsetY(5);
            $drawing->setWorksheet($financialSheet);
            $financialSheet->getRowDimension(1)->setRowHeight(45);
        }

        // Estilos
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];

        $dataStyle = [
            'font' => [
                'size' => 10,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        $numberStyle = [
            'font' => [
                'size' => 10,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER, // CENTRADO en lugar de RIGHT
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'numberFormat' => [
                'formatCode' => '#,##0',
            ],
        ];

        $titleStyle = [
            'font' => [
                'bold' => true,
                'size' => 16,
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
            ],
        ];

        $dateStyle = [
            'font' => [
                'size' => 11,
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
            ],
        ];

        // Título principal (columnas A:B quedan libres para el logo)
        $financialSheet->setCellValue('C1', config('business.name').' — Dashboard Report Completo');
        $financialSheet->mergeCells('C1:H1');
        $financialSheet->getStyle('C1:H1')->applyFromArray($titleStyle);

        $financialSheet->setCellValue('C2', 'Fecha: '.now()->format('Y-m-d'));
        $financialSheet->mergeCells('C2:H2');
        $financialSheet->getStyle('C2:H2')->applyFromArray($dateStyle);

        // Resumen Financiero - Título
        $financialSheet->setCellValue('A4', 'Resumen Financiero por Período');
        $financialSheet->mergeCells('A4:H4');
        $financialSheet->getStyle('A4:H4')->applyFromArray($headerStyle);

        // Encabezados de la tabla financiera
        $financialHeaders = [
            'A5' => 'Período',
            'B5' => 'Ventas Monto (COP)',
            'C5' => 'Ventas Cantidad',
            'D5' => 'Ventas Crecimiento %',
            'E5' => 'Ingresos Monto (COP)',
            'F5' => 'Ingresos Crecimiento %',
            'G5' => 'Egresos Monto (COP)',
            'H5' => 'Egresos Crecimiento %',
        ];

        foreach ($financialHeaders as $cell => $header) {
            $financialSheet->setCellValue($cell, $header);
        }
        $financialSheet->getStyle('A5:H5')->applyFromArray($headerStyle);

        // Datos financieros - USANDO FORMATO DE NÚMERO DE EXCEL
        $row = 6;
        foreach ($allPeriods as $p) {
            $sales = $allFinancials[$p]['sales'];
            $incomes = $allFinancials[$p]['incomes'];
            $expenses = $allFinancials[$p]['expenses'];

            $financialSheet->setCellValue('A'.$row, ucfirst($p));

            // Para montos numéricos, establecer el valor numérico y aplicar formato
            $financialSheet->setCellValue('B'.$row, $sales['amount']);
            $financialSheet->setCellValue('E'.$row, $incomes['amount']);
            $financialSheet->setCellValue('G'.$row, $expenses['amount']);

            // Para cantidades y porcentajes
            $financialSheet->setCellValue('C'.$row, $sales['count']);
            $financialSheet->setCellValue('D'.$row, $sales['growth'].'%');
            $financialSheet->setCellValue('F'.$row, $incomes['growth'].'%');
            $financialSheet->setCellValue('H'.$row, $expenses['growth'].'%');

            $row++;
        }

        // Aplicar estilos específicos para números (TODOS CENTRADOS)
        $financialSheet->getStyle('A6:A'.($row - 1))->applyFromArray($dataStyle);   // Períodos
        $financialSheet->getStyle('B6:B'.($row - 1))->applyFromArray($numberStyle); // Ventas Monto
        $financialSheet->getStyle('C6:C'.($row - 1))->applyFromArray($dataStyle);   // Ventas Cantidad
        $financialSheet->getStyle('D6:D'.($row - 1))->applyFromArray($dataStyle);   // Ventas Crecimiento %
        $financialSheet->getStyle('E6:E'.($row - 1))->applyFromArray($numberStyle); // Ingresos Monto
        $financialSheet->getStyle('F6:F'.($row - 1))->applyFromArray($dataStyle);   // Ingresos Crecimiento %
        $financialSheet->getStyle('G6:G'.($row - 1))->applyFromArray($numberStyle); // Egresos Monto
        $financialSheet->getStyle('H6:H'.($row - 1))->applyFromArray($dataStyle);   // Egresos Crecimiento %

        // Datos de Ventas por Período
        $startRow = $row + 2;
        foreach ($allPeriods as $p) {
            $sData = $allSalesData[$p];

            // Título de la sección
            $financialSheet->setCellValue('A'.$startRow, 'Datos de Ventas - '.ucfirst($p));
            $financialSheet->mergeCells('A'.$startRow.':C'.$startRow);
            $financialSheet->getStyle('A'.$startRow.':C'.$startRow)->applyFromArray($headerStyle);

            // Encabezados
            $financialSheet->setCellValue('A'.($startRow + 1), 'Etiqueta');
            $financialSheet->setCellValue('B'.($startRow + 1), 'Ventas (COP)');
            $financialSheet->setCellValue('C'.($startRow + 1), 'Cantidad');
            $financialSheet->getStyle('A'.($startRow + 1).':C'.($startRow + 1))->applyFromArray($headerStyle);

            // Datos - USANDO FORMATO DE NÚMERO DE EXCEL
            $dataRow = $startRow + 2;
            foreach ($sData['labels'] as $index => $label) {
                $financialSheet->setCellValue('A'.$dataRow, $label);
                $financialSheet->setCellValue('B'.$dataRow, $sData['ventas'][$index]); // Valor numérico
                $financialSheet->setCellValue('C'.$dataRow, $sData['cantidad'][$index]);
                $dataRow++;
            }

            // Aplicar estilos específicos (TODOS CENTRADOS)
            $financialSheet->getStyle('A'.($startRow + 2).':A'.($dataRow - 1))->applyFromArray($dataStyle);   // Etiquetas
            $financialSheet->getStyle('B'.($startRow + 2).':B'.($dataRow - 1))->applyFromArray($numberStyle); // Ventas (numérico)
            $financialSheet->getStyle('C'.($startRow + 2).':C'.($dataRow - 1))->applyFromArray($dataStyle);   // Cantidades

            $startRow = $dataRow + 2;
        }

        // Ventas por Categoría — una tabla por período, igual que Ventas
        $categoryChartAnchorRow = null;
        foreach ($allPeriods as $p) {
            $cData = $allCategoryData[$p];

            $financialSheet->setCellValue('A'.$startRow, 'Ventas por Categoría - '.ucfirst($p));
            $financialSheet->mergeCells('A'.$startRow.':C'.$startRow);
            $financialSheet->getStyle('A'.$startRow.':C'.$startRow)->applyFromArray($headerStyle);

            $financialSheet->setCellValue('A'.($startRow + 1), 'Categoría');
            $financialSheet->setCellValue('B'.($startRow + 1), 'Porcentaje (%)');
            $financialSheet->setCellValue('C'.($startRow + 1), 'Monto (COP)');
            $financialSheet->getStyle('A'.($startRow + 1).':C'.($startRow + 1))->applyFromArray($headerStyle);

            if ($p === 'mensual') {
                $categoryChartAnchorRow = $startRow + 2;
            }

            $dataRow = $startRow + 2;
            foreach ($cData as $category) {
                $financialSheet->setCellValue('A'.$dataRow, $category['label']);
                $financialSheet->setCellValue('B'.$dataRow, $category['value'].'%');
                $financialSheet->setCellValue('C'.$dataRow, $category['amount']);
                $dataRow++;
            }

            if ($dataRow > $startRow + 2) {
                $financialSheet->getStyle('A'.($startRow + 2).':A'.($dataRow - 1))->applyFromArray($dataStyle);
                $financialSheet->getStyle('B'.($startRow + 2).':B'.($dataRow - 1))->applyFromArray($dataStyle);
                $financialSheet->getStyle('C'.($startRow + 2).':C'.($dataRow - 1))->applyFromArray($numberStyle);
            }

            $startRow = $dataRow + 2;
        }

        // Gráfico de barras: ventas por período (resumen del inicio del reporte)
        $barLabels = new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, "'Dashboard Report'!\$A\$6:\$A\$".(5 + count($allPeriods)), null, count($allPeriods));
        $barValues = new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, "'Dashboard Report'!\$B\$6:\$B\$".(5 + count($allPeriods)), null, count($allPeriods));
        $barSeriesLabel = new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, null, null, 1, ['Ventas (COP)']);
        $barSeries = new DataSeries(DataSeries::TYPE_BARCHART, DataSeries::GROUPING_CLUSTERED, range(0, 0), [$barSeriesLabel], [$barLabels], [$barValues]);
        $barPlotArea = new PlotArea(null, [$barSeries]);
        $barChart = new Chart('ventasPorPeriodo', new Title('Ventas por Período'), new Legend(Legend::POSITION_BOTTOM, null, false), $barPlotArea);
        $barChart->setTopLeftPosition('J4');
        $barChart->setBottomRightPosition('R20');
        $financialSheet->addChart($barChart);

        // Gráfico de torta: categorías del período mensual
        if ($categoryChartAnchorRow && ! empty($allCategoryData['mensual'])) {
            $pieCount = count($allCategoryData['mensual']);
            $pieLabels = new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, "'Dashboard Report'!\$A\$".$categoryChartAnchorRow.':$A$'.($categoryChartAnchorRow + $pieCount - 1), null, $pieCount);
            $pieValues = new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, "'Dashboard Report'!\$C\$".$categoryChartAnchorRow.':$C$'.($categoryChartAnchorRow + $pieCount - 1), null, $pieCount);
            $pieSeriesLabel = new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, null, null, 1, ['Categoría']);
            $pieSeries = new DataSeries(DataSeries::TYPE_PIECHART, null, range(0, 0), [$pieSeriesLabel], [$pieLabels], [$pieValues]);
            $piePlotArea = new PlotArea(null, [$pieSeries]);
            $pieChart = new Chart('categoriasMensual', new Title('Ventas por Categoría (Mensual)'), new Legend(Legend::POSITION_RIGHT, null, false), $piePlotArea);
            $pieChart->setTopLeftPosition('J22');
            $pieChart->setBottomRightPosition('R38');
            $financialSheet->addChart($pieChart);
        }

        // Auto-size columns para mejor visualización
        foreach (range('A', 'H') as $col) {
            $financialSheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'Informe-Dashboard-Ventas-Ingresos-Egresos-'.now()->format('Y-m-d').'.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->setIncludeCharts(true);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function exportToPDF($allPeriods, $allFinancials, $allSalesData, $allCategoryData)
    {
        $summaryChart = ChartSvg::bars(
            array_map(fn ($p) => ['label' => ucfirst($p), 'value' => $allFinancials[$p]['sales']['amount']], $allPeriods)
        );

        $salesCharts = [];
        $categoryCharts = [];
        foreach ($allPeriods as $p) {
            $sData = $allSalesData[$p];
            $salesCharts[$p] = ChartSvg::bars(array_map(
                fn ($label, $value) => ['label' => $label, 'value' => $value],
                $sData['labels'],
                $sData['ventas']
            ));
            $categoryCharts[$p] = ChartSvg::pie($allCategoryData[$p]);
        }

        $pdf = Pdf::loadView('dashboard.report', [
            'businessName' => config('business.name'),
            'logoPath' => public_path('assets/img/black.png'),
            'generatedAt' => now()->format('Y-m-d'),
            'allPeriods' => $allPeriods,
            'allFinancials' => $allFinancials,
            'allSalesData' => $allSalesData,
            'allCategoryData' => $allCategoryData,
            'summaryChart' => $summaryChart,
            'salesCharts' => $salesCharts,
            'categoryCharts' => $categoryCharts,
        ])->setPaper('a4', 'landscape');

        $filename = 'Informe-Dashboard-Ventas-Ingresos-Egresos-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }

    /**
     * Fragmento SQL de extracción de fecha compatible con MySQL (prod/Aiven),
     * PostgreSQL (local) y SQLite (tests).
     */
    private function dateExtract(string $unit, string $column): string
    {
        $token = match ($unit) {
            'HOUR' => '%H',
            'MONTH' => '%m',
            'YEAR' => '%Y',
            default => '%H',
        };

        return match (DB::connection()->getDriverName()) {
            'pgsql' => "EXTRACT({$unit} FROM {$column})::int",
            'sqlite' => "CAST(strftime('{$token}', {$column}) AS INTEGER)",
            default => "{$unit}({$column})",
        };
    }

    /**
     * Número de semana relativo a una fecha de referencia, compatible con
     * MySQL, PostgreSQL y SQLite.
     */
    private function weekNumberExpression(string $column, Carbon $reference): string
    {
        $date = $reference->format('Y-m-d');

        return match (DB::connection()->getDriverName()) {
            'pgsql' => "(EXTRACT(WEEK FROM {$column}) - EXTRACT(WEEK FROM DATE '{$date}') + 1)::int",
            'sqlite' => "(CAST(strftime('%W', {$column}) AS INTEGER) - CAST(strftime('%W', '{$date}') AS INTEGER) + 1)",
            default => "WEEK({$column}, 1) - WEEK('{$date}', 1) + 1",
        };
    }

    private function getSalesChartData($period)
    {
        $today = Carbon::today();
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        switch ($period) {
            case 'diario':
                $sales = Sale::where('is_cancelled', false)
                    ->whereDate('sale_date', $today)
                    ->select(
                        DB::raw($this->dateExtract('HOUR', 'sale_time').' as hour'),
                        DB::raw('SUM(total_paid) as total_sales'),
                        DB::raw('COUNT(*) as sales_count')
                    )
                    ->groupBy(DB::raw($this->dateExtract('HOUR', 'sale_time')))
                    ->orderBy('hour')
                    ->get();

                $labels = [];
                $ventas = [];
                $cantidad = [];

                for ($hour = 8; $hour <= 18; $hour++) {
                    $label = $hour.':00';
                    $hourSale = $sales->firstWhere('hour', $hour);

                    $labels[] = $label;
                    // DIVIDIMOS POR 100 para corregir el valor
                    $ventas[] = $hourSale ? (int) ($hourSale->total_sales / 100) : 0;
                    $cantidad[] = $hourSale ? $hourSale->sales_count : 0;
                }

                return [
                    'labels' => $labels,
                    'ventas' => $ventas,
                    'cantidad' => $cantidad,
                ];

            case 'semanal':
                $weekStart = $today->copy()->startOfWeek();
                $weekEnd = $today->copy()->endOfWeek();

                $sales = Sale::where('is_cancelled', false)
                    ->whereBetween('sale_date', [$weekStart, $weekEnd])
                    ->select(
                        DB::raw($this->weekNumberExpression('sale_date', $weekStart).' as week_number'),
                        DB::raw('SUM(total_paid) as total_sales'),
                        DB::raw('COUNT(*) as sales_count')
                    )
                    ->groupBy('week_number')
                    ->orderBy('week_number')
                    ->get();

                $labels = ['Semana Actual'];
                // DIVIDIMOS POR 100 para corregir el valor
                $ventas = [$sales->sum('total_sales') ? (int) ($sales->sum('total_sales') / 100) : 0];
                $cantidad = [$sales->sum('sales_count') ? (int) $sales->sum('sales_count') : 0];

                return [
                    'labels' => $labels,
                    'ventas' => $ventas,
                    'cantidad' => $cantidad,
                ];

            case 'mensual':
                $monthStart = Carbon::now()->startOfMonth();
                $monthEnd = Carbon::now()->endOfMonth();

                $sales = Sale::where('is_cancelled', false)
                    ->whereBetween('sale_date', [$monthStart, $monthEnd])
                    ->select(
                        DB::raw($this->weekNumberExpression('sale_date', $monthStart).' as week_number'),
                        DB::raw('SUM(total_paid) as total_sales'),
                        DB::raw('COUNT(*) as sales_count')
                    )
                    ->groupBy('week_number')
                    ->orderBy('week_number')
                    ->get();

                $labels = [];
                $ventas = [];
                $cantidad = [];

                $weeksInMonth = ceil(($monthStart->daysInMonth + $monthStart->dayOfWeek) / 7);

                for ($week = 1; $week <= $weeksInMonth; $week++) {
                    $weekSale = $sales->firstWhere('week_number', $week);

                    $labels[] = 'Sem '.$week;
                    // DIVIDIMOS POR 100 para corregir el valor
                    $ventas[] = $weekSale ? (int) ($weekSale->total_sales / 100) : 0;
                    $cantidad[] = $weekSale ? $weekSale->sales_count : 0;
                }

                return [
                    'labels' => $labels,
                    'ventas' => $ventas,
                    'cantidad' => $cantidad,
                ];

            case 'trimestral':
                $quarterStart = Carbon::now()->firstOfQuarter();
                $quarterEnd = Carbon::now()->lastOfQuarter();

                $sales = Sale::where('is_cancelled', false)
                    ->whereBetween('sale_date', [$quarterStart, $quarterEnd])
                    ->select(
                        DB::raw($this->dateExtract('MONTH', 'sale_date').' as month'),
                        DB::raw('SUM(total_paid) as total_sales'),
                        DB::raw('COUNT(*) as sales_count')
                    )
                    ->groupBy(DB::raw($this->dateExtract('MONTH', 'sale_date')))
                    ->orderBy('month')
                    ->get();

                $labels = [];
                $ventas = [];
                $cantidad = [];

                $monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                $startMonth = $quarterStart->month;
                $endMonth = $quarterEnd->month;

                for ($month = $startMonth; $month <= $endMonth; $month++) {
                    $monthSale = $sales->firstWhere('month', $month);
                    $labels[] = $monthNames[$month - 1];
                    // DIVIDIMOS POR 100 para corregir el valor
                    $ventas[] = $monthSale ? (int) ($monthSale->total_sales / 100) : 0;
                    $cantidad[] = $monthSale ? $monthSale->sales_count : 0;
                }

                return [
                    'labels' => $labels,
                    'ventas' => $ventas,
                    'cantidad' => $cantidad,
                ];

            case 'semestral':
                $semesterStart = ($currentMonth <= 6)
                    ? Carbon::create($currentYear, 1, 1)
                    : Carbon::create($currentYear, 7, 1);
                $semesterEnd = ($currentMonth <= 6)
                    ? Carbon::create($currentYear, 6, 30)
                    : Carbon::create($currentYear, 12, 31);

                $sales = Sale::where('is_cancelled', false)
                    ->whereBetween('sale_date', [$semesterStart, $semesterEnd])
                    ->select(
                        DB::raw($this->dateExtract('MONTH', 'sale_date').' as month'),
                        DB::raw('SUM(total_paid) as total_sales'),
                        DB::raw('COUNT(*) as sales_count')
                    )
                    ->groupBy(DB::raw($this->dateExtract('MONTH', 'sale_date')))
                    ->orderBy('month')
                    ->get();

                $labels = [];
                $ventas = [];
                $cantidad = [];

                $monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                $startMonth = ($currentMonth <= 6) ? 1 : 7;
                $endMonth = ($currentMonth <= 6) ? 6 : 12;

                for ($month = $startMonth; $month <= $endMonth; $month++) {
                    $monthSale = $sales->firstWhere('month', $month);
                    $labels[] = $monthNames[$month - 1];
                    // DIVIDIMOS POR 100 para corregir el valor
                    $ventas[] = $monthSale ? (int) ($monthSale->total_sales / 100) : 0;
                    $cantidad[] = $monthSale ? $monthSale->sales_count : 0;
                }

                return [
                    'labels' => $labels,
                    'ventas' => $ventas,
                    'cantidad' => $cantidad,
                ];

            case 'anual':
                $yearStart = Carbon::create($currentYear, 1, 1);
                $yearEnd = Carbon::create($currentYear, 12, 31);

                $sales = Sale::where('is_cancelled', false)
                    ->whereBetween('sale_date', [$yearStart, $yearEnd])
                    ->select(
                        DB::raw($this->dateExtract('MONTH', 'sale_date').' as month'),
                        DB::raw('SUM(total_paid) as total_sales'),
                        DB::raw('COUNT(*) as sales_count')
                    )
                    ->groupBy(DB::raw($this->dateExtract('MONTH', 'sale_date')))
                    ->orderBy('month')
                    ->get();

                $monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                $labels = [];
                $ventas = [];
                $cantidad = [];

                for ($month = 1; $month <= 12; $month++) {
                    $monthSale = $sales->firstWhere('month', $month);
                    $labels[] = $monthNames[$month - 1];
                    // DIVIDIMOS POR 100 para corregir el valor
                    $ventas[] = $monthSale ? (int) ($monthSale->total_sales / 100) : 0;
                    $cantidad[] = $monthSale ? $monthSale->sales_count : 0;
                }

                return [
                    'labels' => $labels,
                    'ventas' => $ventas,
                    'cantidad' => $cantidad,
                ];
        }
    }

    private function getCategoryChartData($period)
    {
        [$start, $end] = $this->getPeriodDateRange($period);

        $categorySales = Category::leftJoin('products', 'categories.id', '=', 'products.category_id')
            ->leftJoin('sale_items', 'products.id', '=', 'sale_items.product_id')
            ->leftJoin('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.is_cancelled', false)
            ->whereBetween('sales.sale_date', [$start, $end])
            ->select(
                'categories.id',
                'categories.name',
                DB::raw('SUM(sale_items.subtotal) as total_sales')
            )
            ->groupBy('categories.id', 'categories.name')
            ->havingRaw('SUM(sale_items.subtotal) > 0')
            ->get();

        $totalSales = $categorySales->sum('total_sales');

        return $categorySales->map(function ($category) use ($totalSales) {
            return [
                'label' => $category->name,
                'value' => $totalSales > 0 ? round(($category->total_sales / $totalSales) * 100, 1) : 0,
                'amount' => (int) $category->total_sales,
                'color' => $this->generateColor($category->id),
            ];
        })->toArray();
    }

    private function generateColor($seed)
    {
        $baseColors = [
            ['#3b82f6', '#1e3a8a', '#60a5fa'],
            ['#14b8a6', '#0f766e', '#2dd4bf'],
            ['#f59e0b', '#b45309', '#fbbf24'],
            ['#6366f1', '#3730a3', '#818cf8'],
            ['#10b981', '#047857', '#34d399'],
            ['#ef4444', '#991b1b', '#f87171'],
            ['#8b5cf6', '#5b21b6', '#a78bfa'],
            ['#06b6d4', '#0e7490', '#22d3ee'],
            ['#84cc16', '#4d7c0f', '#a3e635'],
            ['#f97316', '#c2410c', '#fb923c'],
            ['#ec4899', '#9d174d', '#f472b6'],
            ['#eab308', '#a16207', '#facc15'],
            ['#8b5cf6', '#4c1d95', '#a78bfa'],
        ];

        $index = ($seed - 1) % count($baseColors);
        $shadeIndex = min(floor(($seed - 1) / count($baseColors)), 2);

        return $baseColors[$index][$shadeIndex];
    }

    /**
     * Rango [inicio, fin, inicio_periodo_anterior, fin_periodo_anterior] para
     * un período del dashboard. Compartido por las secciones de ventas,
     * transacciones y categorías para que todas midan exactamente el mismo
     * rango al cambiar de período.
     */
    private function getPeriodDateRange(string $period): array
    {
        $today = Carbon::today();
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        switch ($period) {
            case 'diario':
                $start = $today;
                $previousStart = Carbon::yesterday();
                break;
            case 'semanal':
                $start = $today->copy()->startOfWeek();
                $previousStart = $start->copy()->subWeek();
                break;
            case 'mensual':
                $start = Carbon::now()->startOfMonth();
                $previousStart = $start->copy()->subMonth();
                break;
            case 'trimestral':
                $start = Carbon::now()->firstOfQuarter();
                $previousStart = $start->copy()->subQuarter();
                break;
            case 'semestral':
                $start = ($currentMonth <= 6) ? Carbon::create($currentYear, 1, 1) : Carbon::create($currentYear, 7, 1);
                // El semestre anterior al 2º semestre es el 1º del MISMO año,
                // no del año pasado (antes saltaba 1.5 años sin querer).
                $previousStart = ($currentMonth <= 6) ? Carbon::create($currentYear - 1, 7, 1) : Carbon::create($currentYear, 1, 1);
                break;
            case 'anual':
                $start = Carbon::create($currentYear, 1, 1);
                $previousStart = Carbon::create($currentYear - 1, 1, 1);
                break;
            default:
                $start = $today;
                $previousStart = Carbon::yesterday();
        }

        // El período actual siempre corre hasta hoy (no hay ventas futuras,
        // así que usar "hoy" en vez del fin de período calendario no cambia
        // el resultado). Lo que sí importa es que el período ANTERIOR se
        // compare con la misma cantidad de días transcurridos, no con el
        // período completo — si no, un mes que recién empezó (ej. 6 días de
        // agosto) siempre se ve como una caída enorme frente a un mes
        // anterior completo (31 días de julio), aunque el ritmo de ventas
        // sea igual o mejor.
        $end = $today;
        $daysElapsed = $start->diffInDays($today);
        $previousEnd = $previousStart->copy()->addDays($daysElapsed);

        return [$start, $end, $previousStart, $previousEnd];
    }

    private function getSalesData($period)
    {
        [$start, $end, $previousStart, $previousEnd] = $this->getPeriodDateRange($period);

        $current = Sale::where('is_cancelled', false)
            ->whereBetween('sale_date', [$start, $end])
            ->select(
                DB::raw('SUM(total_paid) as amount'),
                DB::raw('COUNT(*) as count')
            )
            ->first();

        $previous = Sale::where('is_cancelled', false)
            ->whereBetween('sale_date', [$previousStart, $previousEnd])
            ->sum('total_paid');

        // DIVIDIMOS POR 100 para corregir el valor en los sliders
        $currentAmount = $current ? ($current->amount / 100) : 0;
        $previousAmount = $previous ? ($previous / 100) : 0;

        $growth = $previousAmount > 0 ? round((($currentAmount - $previousAmount) / $previousAmount) * 100, 2) : ($currentAmount > 0 ? 100 : 0);

        return [
            'amount' => (int) $currentAmount,
            'count' => (int) ($current->count ?? 0),
            'growth' => $growth,
        ];
    }

    private function getTransactionData($type, $period)
    {
        [$start, $end, $previousStart, $previousEnd] = $this->getPeriodDateRange($period);

        $current = Transaction::where('type', $type)
            ->whereBetween('transaction_date', [$start, $end])
            ->sum('amount');

        $previous = Transaction::where('type', $type)
            ->whereBetween('transaction_date', [$previousStart, $previousEnd])
            ->sum('amount');

        $growth = $previous > 0 ? round((($current - $previous) / $previous) * 100, 2) : ($current > 0 ? 100 : 0);

        return [
            'amount' => (int) ($current ?? 0),
            'growth' => $growth,
        ];
    }

    public function getChartData($period)
    {
        $salesData = $this->getSalesChartData($period);
        $categoryData = $this->getCategoryChartData($period);
        $financials = [
            'sales' => $this->getSalesData($period),
            'incomes' => $this->getTransactionData('Ingreso', $period),
            'expenses' => $this->getTransactionData('Gasto', $period),
        ];

        return response()->json([
            'sales_data' => $salesData,
            'category_data' => $categoryData,
            'financials' => $financials,
        ]);
    }
}
