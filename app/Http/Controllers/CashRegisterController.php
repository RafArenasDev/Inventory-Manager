<?php

namespace App\Http\Controllers;

use App\Http\Requests\CashRegisterCloseRequest;
use App\Http\Requests\CashRegisterOpenRequest;
use App\Models\CashRegister;
use App\Models\Sale;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class CashRegisterController extends Controller
{
    public function index(Request $request)
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        $cashQuery = CashRegister::with(['openedBy' => function ($query) {
            $query->select('id', 'name');
        }, 'closedBy' => function ($query) {
            $query->select('id', 'name');
        }])
            ->orderBy('register_date', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $cashQuery->where(function ($query) use ($search) {
                $query->whereDate('register_date', 'like', "%{$search}%")
                    ->orWhereHas('openedBy', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $totalCount = CashRegister::count();
        $filteredCount = $cashQuery->count();
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $cashRegisters = $cashQuery->paginate($perPage)->withQueryString();
        $cashRegisters->getCollection()->transform(function ($register) {
            return $this->formatCashRegister($register);
        });

        $todayRegister = CashRegister::where('register_date', today())
            ->where('is_closed', false)
            ->first();

        if ($todayRegister) {
            $todayRegister = $this->formatCashRegister($todayRegister);
        }

        return Inertia::render('cashRegister/index', [
            'cashRegisters' => $cashRegisters,
            'filters' => $request->only(['search', 'per_page']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
            'todayRegister' => $todayRegister,
        ]);
    }

    public function store(CashRegisterOpenRequest $request)
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        $existingRegister = CashRegister::where('register_date', today())->first();
        if ($existingRegister) {
            return back()->with('error', 'Ya existe una caja registrada para esta fecha.');
        }

        $totalIncome = Transaction::where('type', 'Ingreso')->sum('amount');
        $totalExpenses = Transaction::where('type', 'Gasto')->sum('amount');
        $opening_amount = $totalIncome - $totalExpenses;

        DB::beginTransaction();
        try {
            CashRegister::create([
                'register_date' => today(),
                'opening_amount' => max(0, $opening_amount),
                'closing_amount' => null,
                'total_sales' => 0,
                'total_income' => 0,
                'total_expenses' => 0,
                'difference' => null,
                'opened_by' => auth()->id(),
                'opened_at' => now(),
                'closed_by' => null,
                'closed_at' => null,
                'is_closed' => false,
                'notes' => $request->notes ?? '',
            ]);

            DB::commit();

            // Calcular props actualizados como en index
            $updatedRequest = new Request; // Filtros por defecto

            return $this->index($updatedRequest)->with('success', 'Caja abierta correctamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al abrir caja: '.$e->getMessage());

            return back()->with('error', 'Error al abrir la caja: '.$e->getMessage());
        }
    }

    public function update(CashRegisterCloseRequest $request, CashRegister $cashRegister)
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        if ($cashRegister->is_closed) {
            return back()->with('error', 'La caja ya está cerrada.');
        }

        DB::beginTransaction();
        try {
            $salesTotal = Sale::whereDate('sale_date', $cashRegister->register_date)
                ->where('is_cancelled', false)
                ->sum('total_paid');

            $otherIncome = Transaction::whereDate('transaction_date', $cashRegister->register_date)
                ->where('type', 'Ingreso')
                ->sum('amount');

            $totalIncome = $otherIncome;

            $expensesTotal = Transaction::whereDate('transaction_date', $cashRegister->register_date)
                ->where('type', 'Gasto')
                ->sum('amount');

            $closingAmount = $cashRegister->opening_amount + $totalIncome - $expensesTotal;
            $difference = $closingAmount - $cashRegister->opening_amount;

            Log::info('Cerrando caja', [
                'id' => $cashRegister->id,
                'sales_total' => $salesTotal,
                'total_income' => $totalIncome,
                'expenses_total' => $expensesTotal,
                'closing_amount' => $closingAmount,
                'difference' => $difference,
            ]);

            $cashRegister->update([
                'closing_amount' => $closingAmount,
                'total_sales' => $salesTotal,
                'total_income' => $totalIncome,
                'total_expenses' => $expensesTotal,
                'difference' => $difference,
                'closed_by' => auth()->id(),
                'closed_at' => now(),
                'is_closed' => true,
                'notes' => $request->notes ?? $cashRegister->notes,
            ]);

            DB::commit();

            // Calcular props actualizados como en index
            $updatedRequest = new Request; // Filtros por defecto

            return $this->index($updatedRequest)->with('success', 'Caja cerrada correctamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al cerrar caja: '.$e->getMessage());

            return back()->with('error', 'Error al cerrar la caja: '.$e->getMessage());
        }
    }

    private function formatCashRegister($register)
    {
        return [
            'id' => $register->id,
            'register_date' => $register->register_date->format('Y-m-d'),
            'opening_amount' => $register->opening_amount,
            'closing_amount' => $register->closing_amount ?? 0,
            'total_sales' => $register->total_sales / 100,
            'total_income' => $register->total_income,
            'total_expenses' => $register->total_expenses,
            'difference' => $register->difference ?? 0,
            'opened_by' => $register->opened_by,
            'closed_by' => $register->closed_by,
            'opened_at' => $register->opened_at,
            'closed_at' => $register->closed_at,
            'opened_at_formatted' => $register->opened_at
                ? $register->opened_at->format('d/m/Y - h:i A')
                : null,
            'closed_at_formatted' => $register->closed_at
                ? $register->closed_at->format('d/m/Y - h:i A')
                : null,
            'is_closed' => $register->is_closed,
            'notes' => $register->notes ?? '',
            'openedBy' => $register->openedBy ? ['id' => $register->openedBy->id, 'name' => $register->openedBy->name] : ['id' => 0, 'name' => '-'],
            'closedBy' => $register->closedBy ? ['id' => $register->closedBy->id, 'name' => $register->closedBy->name] : ['id' => 0, 'name' => '-'],
        ];
    }

    public function export(Request $request)
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        $cashQuery = CashRegister::with(['openedBy' => function ($query) {
            $query->select('id', 'name');
        }, 'closedBy' => function ($query) {
            $query->select('id', 'name');
        }])
            ->orderBy('register_date', 'desc');

        $cashRegisters = $cashQuery->get()->map(function ($register) {
            return $this->formatCashRegister($register);
        });

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Cajas');

        $headers = [
            'A1' => 'ID',
            'B1' => 'Fecha Apertura',
            'C1' => 'Monto Apertura',
            'D1' => 'Ventas',
            'E1' => 'Ingresos',
            'F1' => 'Egresos',
            'G1' => 'Monto Cierre',
            'H1' => 'Diferencia',
            'I1' => 'Notas',
            'J1' => 'Estado',
            'K1' => 'Abierto por',
            'L1' => 'Cerrado por',
            'M1' => 'Fecha Cierre',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

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

        $sheet->getStyle('A1:M1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($cashRegisters as $register) {
            $sheet->setCellValue('A'.$row, $register['id']);
            $sheet->setCellValue('B'.$row, $register['opened_at_formatted'] ?? '');
            $sheet->setCellValue('C'.$row, $register['opening_amount'] ? '$'.number_format($register['opening_amount'], 0, ',', '.') : '$0');
            $sheet->setCellValue('D'.$row, $register['total_sales'] ? '$'.number_format($register['total_sales'], 0, ',', '.') : '$0');
            $sheet->setCellValue('E'.$row, $register['total_income'] ? '$'.number_format($register['total_income'], 0, ',', '.') : '$0');
            $sheet->setCellValue('F'.$row, $register['total_expenses'] ? '$'.number_format($register['total_expenses'], 0, ',', '.') : '$0');
            $sheet->setCellValue('G'.$row, $register['is_closed'] ? ($register['closing_amount'] ? '$'.number_format($register['closing_amount'], 0, ',', '.') : '$0') : '');
            $sheet->setCellValue('H'.$row, $register['is_closed'] ? ($register['difference'] ? ($register['difference'] >= 0 ? '+' : '').'$'.number_format(abs($register['difference']), 0, ',', '.') : '$0') : '');
            $sheet->setCellValue('I'.$row, $register['notes'] ?? '');
            $sheet->setCellValue('J'.$row, $register['is_closed'] ? 'Cerrada' : 'Abierta');
            $sheet->setCellValue('K'.$row, $register['openedBy']['name'] ?? '');
            $sheet->setCellValue('L'.$row, $register['closedBy']['name'] ?? '');
            $sheet->setCellValue('M'.$row, $register['closed_at_formatted'] ?? '');
            $row++;
        }

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

        if ($row > 2) {
            $sheet->getStyle('A1:M'.($row - 1))->applyFromArray($dataStyle);
        }

        $sheet->getStyle('A2:A'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('J2:J'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        foreach (range('A', 'M') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getRowDimension(1)->setRowHeight(25);

        $filename = 'Movimientos_Caja_'.now()->format('Y-m-d').'.xlsx';

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
