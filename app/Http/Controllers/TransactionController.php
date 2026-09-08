<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransactionRequest;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class TransactionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $categories = TransactionCategory::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        $transactionsQuery = Transaction::with(['category', 'user', 'sale.items.product'])
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $transactionsQuery->where(function ($query) use ($search) {
                $query->whereLikeUnaccent('description', "%{$search}%")
                    ->orWhereLike('invoice_number', "%{$search}%");
            });
        }

        // Sin filtro explícito, se limita al mes actual — nunca se pinta el
        // histórico completo de una sola vez.
        $dateFrom = $request->filled('date_from') ? $request->date_from : today()->startOfMonth()->toDateString();
        $dateTo = $request->filled('date_to') ? $request->date_to : today()->endOfMonth()->toDateString();
        $transactionsQuery->whereDate('transaction_date', '>=', $dateFrom)
            ->whereDate('transaction_date', '<=', $dateTo);

        if ($request->filled('category_id')) {
            $transactionsQuery->where('transaction_category_id', $request->category_id);
        }

        if ($request->filled('type')) {
            $transactionsQuery->where('type', $request->type);
        }

        $totalCount = $transactionsQuery->count();
        $filteredCount = $totalCount;

        // Los totales deben corresponder a lo que se ve filtrado, no a todo
        // el histórico — si no, la tarjeta de totales nunca coincide con las
        // filas que realmente se están mostrando. reorder() es obligatorio:
        // el ORDER BY id heredado del query base + un SELECT solo de
        // agregados (SUM/COUNT) sin GROUP BY revienta en Postgres.
        $totals = (clone $transactionsQuery)->reorder()->selectRaw('
            SUM(amount) as total_amount,
            COUNT(*) as total_count
        ')->first();

        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $transactions = $transactionsQuery->paginate($perPage)->withQueryString();
        $transactions->getCollection()->transform(function ($transaction) {
            return [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'transaction_category_id' => $transaction->transaction_category_id,
                'category' => [
                    'id' => $transaction->category->id,
                    'name' => $transaction->category->name,
                    'type' => $transaction->category->type,
                ],
                'amount' => $transaction->amount,
                'transaction_date' => $transaction->transaction_date,
                'transaction_time' => $transaction->transaction_time,
                'payment_method' => $transaction->payment_method,
                'invoice_number' => $transaction->invoice_number,
                'description' => $transaction->description,
                'notes' => $transaction->notes,
                'sale_id' => $transaction->sale_id,
                'sale' => $transaction->sale ? [
                    'id' => $transaction->sale->id,
                    'invoice_number' => $transaction->sale->invoice_number,
                    'items' => $transaction->sale->items->map(function ($item) {
                        return [
                            'name' => $item->product->name ?? 'Producto no encontrado',
                            'quantity' => $item->quantity,
                            'price' => $item->price_at_sale,
                        ];
                    })->toArray(),
                ] : null,
            ];
        });

        return Inertia::render('transactions/index', [
            'transactions' => $transactions,
            'categories' => $categories,
            'filters' => [...$request->only(['search', 'per_page', 'category_id', 'type']), 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
            'totals' => $totals,
        ]);
    }

    /**
     * Export transactions to Excel
     */
    public function export(Request $request)
    {
        \Log::info('Exporting transactions for user: '.auth()->user()->id.', Permissions: '.json_encode(auth()->user()->getAllPermissions()->pluck('name')));

        $transactions = Transaction::with(['category', 'sale'])
            ->orderBy('id', 'asc')
            ->get();

        $spreadsheet = new Spreadsheet;

        // Ingresos Sheet
        $ingresosSheet = $spreadsheet->getActiveSheet();
        $ingresosSheet->setTitle('Ingresos');

        // Egresos Sheet
        $egresosSheet = $spreadsheet->createSheet();
        $egresosSheet->setTitle('Egresos');

        $headers = [
            'A1' => 'ID',
            'B1' => 'Tipo',
            'C1' => 'Categoría',
            'D1' => 'Monto',
            'E1' => 'Medio de Pago',
            'F1' => 'Fecha',
            'G1' => 'Hora',
            'H1' => 'N° Factura/Recibo',
            'I1' => 'Descripción',
            'J1' => 'Notas',
            'K1' => 'Fecha Registro',
        ];

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
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
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        $totalStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => '000000'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'D9D9D9'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_RIGHT,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];

        // Set headers for Ingresos
        foreach ($headers as $cell => $value) {
            $ingresosSheet->setCellValue($cell, $value);
        }
        $ingresosSheet->getStyle('A1:K1')->applyFromArray($headerStyle);
        $ingresosSheet->getRowDimension(1)->setRowHeight(25);

        // Set headers for Egresos
        foreach ($headers as $cell => $value) {
            $egresosSheet->setCellValue($cell, $value);
        }
        $egresosSheet->getStyle('A1:K1')->applyFromArray($headerStyle);
        $egresosSheet->getRowDimension(1)->setRowHeight(25);

        // Write data
        $ingresosRow = 2;
        $egresosRow = 2;

        foreach ($transactions as $transaction) {
            $sheet = $transaction->type === 'Ingreso' ? $ingresosSheet : $egresosSheet;
            $row = $transaction->type === 'Ingreso' ? $ingresosRow : $egresosRow;

            $sheet->setCellValue('A'.$row, $transaction->id);
            $sheet->setCellValue('B'.$row, $transaction->type);
            $sheet->setCellValue('C'.$row, $transaction->category->name ?? 'Sin categoría');
            $sheet->setCellValue('D'.$row, $transaction->amount); // Guardar como número para poder sumar
            $sheet->setCellValue('E'.$row, $transaction->payment_method ?? '');
            $sheet->setCellValue('F'.$row, $transaction->transaction_date ? date('d/m/Y', strtotime($transaction->transaction_date)) : '');
            $sheet->setCellValue('G'.$row, $transaction->transaction_time ? date('h:i A', strtotime($transaction->transaction_time)) : '');
            $sheet->setCellValue('H'.$row, $transaction->invoice_number ?? ($transaction->sale->invoice_number ?? ''));
            $sheet->setCellValue('I'.$row, $transaction->description ?? '');
            $sheet->setCellValue('J'.$row, $transaction->notes ?? '');
            $sheet->setCellValue('K'.$row, $transaction->created_at->format('d/m/Y H:i:s'));

            if ($transaction->type === 'Ingreso') {
                $ingresosRow++;
            } else {
                $egresosRow++;
            }
        }

        // Aplicar formato de moneda a las celdas de montos (después de escribir los datos)
        if ($ingresosRow > 2) {
            $ingresosSheet->getStyle('D2:D'.($ingresosRow - 1))->getNumberFormat()->setFormatCode('"$" #,##0');
        }
        if ($egresosRow > 2) {
            $egresosSheet->getStyle('D2:D'.($egresosRow - 1))->getNumberFormat()->setFormatCode('"$" #,##0');
        }

        // Agregar fila de totales para Ingresos
        if ($ingresosRow > 2) {
            $ingresosSheet->setCellValue('C'.$ingresosRow, 'TOTAL');
            $ingresosSheet->setCellValue('D'.$ingresosRow, '=SUM(D2:D'.($ingresosRow - 1).')');
            $ingresosSheet->getStyle('C'.$ingresosRow.':D'.$ingresosRow)->applyFromArray($totalStyle);

            // Formatear la celda del total como moneda
            $ingresosSheet->getStyle('D'.$ingresosRow)->getNumberFormat()->setFormatCode('"$" #,##0');
        }

        // Agregar fila de totales para Egresos
        if ($egresosRow > 2) {
            $egresosSheet->setCellValue('C'.$egresosRow, 'TOTAL');
            $egresosSheet->setCellValue('D'.$egresosRow, '=SUM(D2:D'.($egresosRow - 1).')');
            $egresosSheet->getStyle('C'.$egresosRow.':D'.$egresosRow)->applyFromArray($totalStyle);

            // Formatear la celda del total como moneda
            $egresosSheet->getStyle('D'.$egresosRow)->getNumberFormat()->setFormatCode('"$" #,##0');
        }

        // Apply data styles
        if ($ingresosRow > 2) {
            $ingresosSheet->getStyle('A2:K'.($ingresosRow - 1))->applyFromArray($dataStyle);
        }
        if ($egresosRow > 2) {
            $egresosSheet->getStyle('A2:K'.($egresosRow - 1))->applyFromArray($dataStyle);
        }

        // Center columns
        foreach (['ingresosSheet', 'egresosSheet'] as $sheetName) {
            $$sheetName->getStyle('A2:A'.(max($ingresosRow, $egresosRow) - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $$sheetName->getStyle('D2:D'.(max($ingresosRow, $egresosRow) - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $$sheetName->getStyle('F2:G'.(max($ingresosRow, $egresosRow) - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $$sheetName->getStyle('K2:K'.(max($ingresosRow, $egresosRow) - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        // Auto-size columns
        foreach (range('A', 'K') as $col) {
            $ingresosSheet->getColumnDimension($col)->setAutoSize(true);
            $egresosSheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'Transacciones_'.now()->format('Y-m-d').'.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);

    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(TransactionRequest $request)
    {
        $transaction = Transaction::create([
            'user_id' => auth()->id(),
            'type' => $request->type,
            'transaction_category_id' => $request->transaction_category_id,
            'amount' => $request->amount,
            'transaction_date' => $request->transaction_date,
            'transaction_time' => $request->transaction_time,
            'payment_method' => $request->payment_method,
            'invoice_number' => $request->invoice_number,
            'description' => $request->description,
            'notes' => $request->notes,
        ]);

        return redirect()->route('transactions.index')
            ->with('success', 'Transacción creada correctamente');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(TransactionRequest $request, Transaction $transaction)
    {
        if ($transaction->sale_id !== null) {
            return redirect()->back()->with('error', 'Esta transacción proviene de una venta y no puede editarse manualmente.');
        }

        $transaction->update([
            'type' => $request->type,
            'transaction_category_id' => $request->transaction_category_id,
            'amount' => $request->amount,
            'transaction_date' => $request->transaction_date,
            'transaction_time' => $request->transaction_time,
            'payment_method' => $request->payment_method,
            'invoice_number' => $request->invoice_number,
            'description' => $request->description,
            'notes' => $request->notes,
        ]);

        return redirect()->route('transactions.index')
            ->with('success', 'Transacción actualizada correctamente');
    }
}
