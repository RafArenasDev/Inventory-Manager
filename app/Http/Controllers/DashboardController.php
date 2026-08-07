<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
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

        $salesClients = Client::select(
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
        )->where('is_active', true)->get();

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
        ]);
    }

    /**
     * Umbral de alerta de stock: coincide con las franjas "Bajo" (crítico) y
     * "Medio" (advertencia) del semáforo ya usado en el módulo de Productos
     * (ver productsTable.tsx). Las franjas "Bueno"/"Óptimo" no son alertables.
     */
    private const ALERT_STOCK_THRESHOLD = 7;

    private function stockTier(int $stock): string
    {
        if ($stock === 0) {
            return 'agotado';
        }

        if ($stock <= 3) {
            return 'critico';
        }

        return 'advertencia';
    }

    public function lowStockNotifications()
    {
        $products = Product::where('stock', '<=', self::ALERT_STOCK_THRESHOLD)
            ->select('id', 'code', 'name', 'stock')
            ->orderBy('stock')
            ->limit(200)
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'code' => $product->code,
                    'name' => $product->name,
                    'stock' => $product->stock,
                    'tier' => $this->stockTier($product->stock),
                ];
            });

        return response()->json([
            'products' => $products,
            'total' => Product::where('stock', '<=', self::ALERT_STOCK_THRESHOLD)->count(),
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

        $allPeriods = ['diario', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'];
        $allFinancials = [];
        $allSalesData = [];
        $categoryData = $this->getCategoryChartData($period);

        foreach ($allPeriods as $p) {
            $allFinancials[$p] = [
                'sales' => $this->getSalesData($p),
                'incomes' => $this->getTransactionData('Ingreso', $p),
                'expenses' => $this->getTransactionData('Gasto', $p),
            ];
            $allSalesData[$p] = $this->getSalesChartData($p);
        }

        if ($format === 'excel') {
            return $this->exportToExcel($allPeriods, $allFinancials, $allSalesData, $categoryData);
        } else {
            return $this->exportToPDF($allPeriods, $allFinancials, $allSalesData, $categoryData);
        }
    }

    private function exportToExcel($allPeriods, $allFinancials, $allSalesData, $categoryData)
    {
        $spreadsheet = new Spreadsheet;
        $financialSheet = $spreadsheet->getActiveSheet();
        $financialSheet->setTitle('Dashboard Report');

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

        // Título principal
        $financialSheet->setCellValue('A1', 'Dashboard Report Completo');
        $financialSheet->mergeCells('A1:H1');
        $financialSheet->getStyle('A1:H1')->applyFromArray($titleStyle);

        // Fecha CON HORA (HH-MM-SS)
        $financialSheet->setCellValue('A2', 'Fecha: '.now()->format('Y-m-d H:i:s'));
        $financialSheet->mergeCells('A2:H2');
        $financialSheet->getStyle('A2:H2')->applyFromArray($dateStyle);

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

        // Ventas por Categoría
        $financialSheet->setCellValue('A'.$startRow, 'Ventas por Categoría (Mensual)');
        $financialSheet->mergeCells('A'.$startRow.':C'.$startRow);
        $financialSheet->getStyle('A'.$startRow.':C'.$startRow)->applyFromArray($headerStyle);

        $financialSheet->setCellValue('A'.($startRow + 1), 'Categoría');
        $financialSheet->setCellValue('B'.($startRow + 1), 'Porcentaje (%)');
        $financialSheet->setCellValue('C'.($startRow + 1), 'Monto (COP)');
        $financialSheet->getStyle('A'.($startRow + 1).':C'.($startRow + 1))->applyFromArray($headerStyle);

        // Datos de categorías - USANDO FORMATO DE NÚMERO DE EXCEL
        $dataRow = $startRow + 2;
        foreach ($categoryData as $category) {
            $financialSheet->setCellValue('A'.$dataRow, $category['label']);
            $financialSheet->setCellValue('B'.$dataRow, $category['value'].'%');
            $financialSheet->setCellValue('C'.$dataRow, $category['amount']); // Valor numérico
            $dataRow++;
        }

        // Aplicar estilos específicos (TODOS CENTRADOS)
        $financialSheet->getStyle('A'.($startRow + 2).':A'.($dataRow - 1))->applyFromArray($dataStyle);   // Categorías
        $financialSheet->getStyle('B'.($startRow + 2).':B'.($dataRow - 1))->applyFromArray($dataStyle);   // Porcentajes
        $financialSheet->getStyle('C'.($startRow + 2).':C'.($dataRow - 1))->applyFromArray($numberStyle); // Montos (numérico)

        // Auto-size columns para mejor visualización
        foreach (range('A', 'H') as $col) {
            $financialSheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Nombre del archivo CON HORA (HH-MM-SS)
        $filename = 'Informe-Dashboard-Ventas-Ingresos-Egresos-'.now()->format('Y-m-d').'.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openformats-officedocument.spreadsheetml.sheet',
        ]);

    }

    private function exportToPDF($allPeriods, $allFinancials, $allSalesData, $categoryData)
    {
        // Sanitize data to prevent HTML injection
        $sanitizedCategoryData = array_map(function ($category) {
            return [
                'label' => htmlspecialchars($category['label'], ENT_QUOTES, 'UTF-8'),
                'value' => $category['value'],
                'amount' => $category['amount'],
                'color' => $category['color'],
            ];
        }, $categoryData);

        $sanitizedAllSalesData = [];
        foreach ($allPeriods as $p) {
            $sData = $allSalesData[$p];
            $sanitizedAllSalesData[$p] = [
                'labels' => array_map(function ($label) {
                    return htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
                }, $sData['labels']),
                'ventas' => $sData['ventas'],
                'cantidad' => $sData['cantidad'],
            ];
        }

        // HTML content for PDF
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Dashboard Report Completo</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 10px; }
                h1 { text-align: center; color: #333; font-size: 18px; }
                h2 { color: #444; margin-top: 20px; font-size: 14px; }
                h3 { color: #555; margin-top: 15px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
                th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                th { background-color: #4472C4; color: white; text-align: center; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                .financial-table th, .financial-table td { text-align: center; }
                .period-section { page-break-inside: avoid; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <h1>Dashboard Report Completo</h1>
            <p>Fecha: '.now()->format('Y-m-d H:i:s').'</p>

            <div class="period-section">
                <h2>Resumen Financiero por Período</h2>
                <table class="financial-table">
                    <tr>
                        <th>Período</th>
                        <th>Ventas Monto (COP)</th>
                        <th>Ventas Cantidad</th>
                        <th>Ventas Crecimiento %</th>
                        <th>Ingresos Monto (COP)</th>
                        <th>Ingresos Crecimiento %</th>
                        <th>Egresos Monto (COP)</th>
                        <th>Egresos Crecimiento %</th>
                    </tr>';

        foreach ($allPeriods as $p) {
            $sales = $allFinancials[$p]['sales'];
            $incomes = $allFinancials[$p]['incomes'];
            $expenses = $allFinancials[$p]['expenses'];

            $html .= '
                <tr>
                    <td>'.ucfirst($p).'</td>
                    <td>'.number_format($sales['amount'], 0, ',', '.').'</td>
                    <td>'.$sales['count'].'</td>
                    <td>'.$sales['growth'].'%</td>
                    <td>'.number_format($incomes['amount'], 0, ',', '.').'</td>
                    <td>'.$incomes['growth'].'%</td>
                    <td>'.number_format($expenses['amount'], 0, ',', '.').'</td>
                    <td>'.$expenses['growth'].'%</td>
                </tr>';
        }

        $html .= '
                </table>
            </div>';

        foreach ($allPeriods as $p) {
            $sData = $sanitizedAllSalesData[$p];
            $html .= '
            <div class="period-section">
                <h2>Datos de Ventas - '.ucfirst($p).'</h2>
                <table>
                    <tr>
                        <th>Etiqueta</th>
                        <th>Ventas (COP)</th>
                        <th>Cantidad</th>
                    </tr>';

            foreach ($sData['labels'] as $index => $label) {
                $html .= '
                    <tr>
                        <td>'.$label.'</td>
                        <td>'.number_format($sData['ventas'][$index], 0, ',', '.').'</td>
                        <td>'.$sData['cantidad'][$index].'</td>
                    </tr>';
            }

            $html .= '
                </table>
            </div>';
        }

        $html .= '
            <div class="period-section">
                <h2>Ventas por Categoría (Mensual)</h2>
                <table>
                    <tr>
                        <th>Categoría</th>
                        <th>Porcentaje (%)</th>
                        <th>Monto (COP)</th>
                    </tr>';

        foreach ($sanitizedCategoryData as $category) {
            $html .= '
                <tr>
                    <td>'.$category['label'].'</td>
                    <td>'.$category['value'].'%</td>
                    <td>'.number_format($category['amount'], 0, ',', '.').'</td>
                </tr>';
        }

        $html .= '
                </table>
            </div>
        </body>
        </html>';

        // Generate PDF using DOMPDF in landscape
        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'landscape');
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
                $end = $today;
                $previousStart = Carbon::yesterday();
                $previousEnd = Carbon::yesterday();
                break;
            case 'semanal':
                $start = $today->copy()->startOfWeek();
                $end = $today->copy()->endOfWeek();
                $previousStart = $today->copy()->subWeek()->startOfWeek();
                $previousEnd = $today->copy()->subWeek()->endOfWeek();
                break;
            case 'mensual':
                $start = Carbon::now()->startOfMonth();
                $end = Carbon::now()->endOfMonth();
                $previousStart = Carbon::now()->subMonth()->startOfMonth();
                $previousEnd = Carbon::now()->subMonth()->endOfMonth();
                break;
            case 'trimestral':
                $start = Carbon::now()->firstOfQuarter();
                $end = Carbon::now()->lastOfQuarter();
                $previousStart = Carbon::now()->subQuarter()->firstOfQuarter();
                $previousEnd = Carbon::now()->subQuarter()->lastOfQuarter();
                break;
            case 'semestral':
                $start = ($currentMonth <= 6) ? Carbon::create($currentYear, 1, 1) : Carbon::create($currentYear, 7, 1);
                $end = ($currentMonth <= 6) ? Carbon::create($currentYear, 6, 30) : Carbon::create($currentYear, 12, 31);
                $previousStart = ($currentMonth <= 6) ? Carbon::create($currentYear - 1, 7, 1) : Carbon::create($currentYear - 1, 1, 1);
                $previousEnd = ($currentMonth <= 6) ? Carbon::create($currentYear - 1, 12, 31) : Carbon::create($currentYear - 1, 6, 30);
                break;
            case 'anual':
                $start = Carbon::create($currentYear, 1, 1);
                $end = Carbon::create($currentYear, 12, 31);
                $previousStart = Carbon::create($currentYear - 1, 1, 1);
                $previousEnd = Carbon::create($currentYear - 1, 12, 31);
                break;
            default:
                $start = $today;
                $end = $today;
                $previousStart = Carbon::yesterday();
                $previousEnd = Carbon::yesterday();
        }

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
