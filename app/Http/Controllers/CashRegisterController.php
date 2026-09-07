<?php

namespace App\Http\Controllers;

use App\Http\Requests\CashRegisterCloseRequest;
use App\Http\Requests\CashRegisterOpenRequest;
use App\Models\CashRegister;
use App\Models\Sale;
use App\Models\Transaction;
use App\Models\User;
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
            // La fecha ya se filtra con el selector de Año/Mes de abajo (con
            // opciones claras, sin adivinar formato) — buscar fechas como
            // texto libre era incoherente con cómo se ve la fecha en la
            // tabla (dd/mm/aaaa) y encima rompía la consulta en Postgres.
            $search = $request->search;
            $cashQuery->where(function ($query) use ($search) {
                $query->whereLikeUnaccent('notes', "%{$search}%")
                    ->orWhereHas('openedBy', function ($q) use ($search) {
                        $q->whereLikeUnaccent('name', "%{$search}%");
                    });
            });
        }

        // Sin filtro explícito, se limita al mes actual — nunca se pinta el
        // histórico completo de una sola vez (puede ser años de registros).
        $dateFrom = $request->filled('date_from') ? $request->date_from : today()->startOfMonth()->toDateString();
        $dateTo = $request->filled('date_to') ? $request->date_to : today()->endOfMonth()->toDateString();

        $cashQuery->whereDate('register_date', '>=', $dateFrom)
            ->whereDate('register_date', '<=', $dateTo);

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
            'filters' => [...$request->only(['search', 'per_page']), 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
            'todayRegister' => $todayRegister,
        ]);
    }

    public function store(CashRegisterOpenRequest $request)
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        if (CashRegister::where('register_date', today())->exists()) {
            return back()->with('error', 'Ya existe una caja registrada para esta fecha.');
        }

        try {
            $this->openRegisterForToday(auth()->id(), $request->notes ?? '');

            // redirect() en vez de devolver $this->index() directo: Inertia
            // fija la URL del navegador en la de la petición que respondió
            // (POST /cash-register), no en la página que en realidad se ve.
            // Con un redirect de verdad, la URL queda correcta en
            // /cash-register — si no, cualquier refresco posterior (F5,
            // sincronización en tiempo real) termina pegado ahí y revienta
            // porque esa ruta no acepta GET.
            return redirect()->route('cash-register.index')->with('success', 'Caja abierta correctamente.');
        } catch (\Exception $e) {
            Log::error('Error al abrir caja: '.$e->getMessage());

            return back()->with('error', 'Error al abrir la caja: '.$e->getMessage());
        }
    }

    /**
     * Horario comercial: 8:00am - 6:30pm, cotejado con la hora del PC. Sin
     * restricción de días — solo de hora, tal como se pidió.
     */
    private const BUSINESS_OPEN = '08:00';

    private const BUSINESS_CLOSE = '18:30';

    private function isWithinBusinessHours(): bool
    {
        $now = now()->format('H:i');

        return $now >= self::BUSINESS_OPEN && $now <= self::BUSINESS_CLOSE;
    }

    private function openRegisterForToday(?int $openedBy, string $notes = ''): CashRegister
    {
        // El saldo de apertura es el cierre de la última caja cerrada — así
        // se abre exactamente donde quedó el efectivo la vez anterior. Solo
        // si nunca hubo una caja cerrada (negocio nuevo) se calcula desde el
        // histórico de transacciones como respaldo.
        $lastClosingAmount = CashRegister::whereNotNull('closing_amount')
            ->orderByDesc('register_date')
            ->value('closing_amount');

        if ($lastClosingAmount !== null) {
            $openingAmount = $lastClosingAmount;
        } else {
            $totalIncome = Transaction::where('type', 'Ingreso')->sum('amount');
            $totalExpenses = Transaction::where('type', 'Gasto')->sum('amount');
            $openingAmount = max(0, $totalIncome - $totalExpenses);
        }

        return CashRegister::create([
            'register_date' => today(),
            'opening_amount' => $openingAmount,
            'closing_amount' => null,
            'total_sales' => 0,
            'total_income' => 0,
            'total_expenses' => 0,
            'difference' => null,
            'opened_by' => $openedBy,
            'opened_by_name' => $openedBy ? User::find($openedBy)?->name : null,
            'opened_at' => now(),
            'closed_by' => null,
            'closed_at' => null,
            'is_closed' => false,
            'notes' => $notes,
        ]);
    }

    /**
     * Se llama desde el login: dentro del horario comercial y sin caja de
     * hoy, la abre sola. Devuelve la caja creada (para el aviso al usuario)
     * o null si no hizo falta hacer nada.
     */
    public function autoOpenIfNeeded(?int $openedBy): ?CashRegister
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        if (! $this->isWithinBusinessHours()) {
            return null;
        }

        if (CashRegister::where('register_date', today())->exists()) {
            return null;
        }

        return $this->openRegisterForToday($openedBy, 'Abierta automáticamente al iniciar sesión.');
    }

    /**
     * Se llama desde el logout: si ya pasó la hora de cierre (6:30pm) y la
     * caja de hoy sigue abierta, la cierra sola. Devuelve la caja cerrada
     * (para el aviso) o null si no hizo falta.
     */
    public function autoCloseIfNeeded(?int $closedBy): ?CashRegister
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        if (now()->format('H:i') < self::BUSINESS_CLOSE) {
            return null;
        }

        $register = CashRegister::where('register_date', today())->where('is_closed', false)->first();

        if (! $register) {
            return null;
        }

        $this->closeRegister($register, $closedBy, 'Cerrada automáticamente al finalizar la sesión.');

        return $register->fresh();
    }

    /**
     * Endpoint liviano para el watcher del frontend (poll periódico
     * mientras la sesión sigue activa, sin recargar props de toda la app en
     * cada tick): si ya pasó la hora de cierre y la caja de hoy sigue
     * abierta, avisa para que se pueda ofrecer cerrarla ahí mismo, sin
     * esperar a que el usuario cierre sesión.
     */
    public function status()
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        $register = CashRegister::where('register_date', today())->where('is_closed', false)->first();

        return response()->json([
            'open_register_id' => $register?->id,
            'past_close_time' => now()->format('H:i') >= self::BUSINESS_CLOSE,
        ]);
    }

    public function update(CashRegisterCloseRequest $request, CashRegister $cashRegister)
    {
        if ($cashRegister->is_closed) {
            return back()->with('error', 'La caja ya está cerrada.');
        }

        try {
            $this->closeRegister($cashRegister, auth()->id(), $request->notes);

            // Mismo motivo que en store(): redirect real para que la URL
            // del navegador quede en /cash-register, no pegada en el
            // /cash-register/{id} del PUT.
            return redirect()->route('cash-register.index')->with('success', 'Caja cerrada correctamente.');
        } catch (\Exception $e) {
            Log::error('Error al cerrar caja: '.$e->getMessage());

            return back()->with('error', 'Error al cerrar la caja: '.$e->getMessage());
        }
    }

    /**
     * Calcula y aplica el cierre de una caja para su propio register_date
     * (no necesariamente "hoy" — lo usa tanto el cierre manual como el
     * autocierre de cajas que quedaron abiertas de un día anterior).
     *
     * "Diferencia" aquí es en realidad el resultado neto del día
     * (ingresos - gastos): como no se cuenta efectivo físico al cerrar, no
     * hay un valor "esperado vs contado" que comparar, así que no puede
     * revelar una descuadre real. Ver 'total_income' - 'total_expenses'.
     */
    /**
     * "+$0"/"-$0" no tiene sentido: solo se antepone signo cuando de verdad
     * hay ganancia o pérdida, igual que en la tabla del frontend.
     */
    private function formatSignedAmount(int $value): string
    {
        $amount = '$'.number_format(abs($value), 0, ',', '.');

        if ($value > 0) {
            return '+'.$amount;
        }
        if ($value < 0) {
            return '-'.$amount;
        }

        return $amount;
    }

    private function closeRegister(CashRegister $cashRegister, ?int $closedBy, ?string $notes = null): void
    {
        config(['app.timezone' => 'America/Bogota']);
        date_default_timezone_set('America/Bogota');

        DB::transaction(function () use ($cashRegister, $closedBy, $notes) {
            // Sale.total_paid se guarda en centavos (igual que en toda la
            // app), pero total_income/total_expenses/opening_amount vienen
            // de Transaction.amount, que se guarda en pesos. Sin este /100,
            // total_sales quedaba 100 veces más grande que total_income.
            $salesTotal = Sale::whereDate('sale_date', $cashRegister->register_date)
                ->where('is_cancelled', false)
                ->sum('total_paid') / 100;

            $totalIncome = Transaction::whereDate('transaction_date', $cashRegister->register_date)
                ->where('type', 'Ingreso')
                ->sum('amount');

            $expensesTotal = Transaction::whereDate('transaction_date', $cashRegister->register_date)
                ->where('type', 'Gasto')
                ->sum('amount');

            $closingAmount = $cashRegister->opening_amount + $totalIncome - $expensesTotal;
            // Ganancia/pérdida del día = cuánto quedó vs. cuánto había al
            // abrir. Da el mismo número que (ingresos - gastos) — es álgebra
            // básica, closing_amount ya se define como opening + esa resta —
            // pero se deja explícito así para que se lea directo qué significa.
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
                'closed_by' => $closedBy,
                'closed_by_name' => $closedBy ? User::find($closedBy)?->name : null,
                'closed_at' => now(),
                'is_closed' => true,
                'notes' => $notes ?? $cashRegister->notes,
            ]);
        });
    }

    /**
     * Cierra solas las cajas que quedaron abiertas de un día anterior (el
     * admin cerró sesión sin cerrar caja) — se llama desde el primer login
     * del día siguiente, dejando todo en orden antes de que se pueda abrir
     * la caja de hoy.
     */
    public function closeStaleRegisters(?int $closedBy): void
    {
        CashRegister::where('is_closed', false)
            ->whereDate('register_date', '<', today())
            ->get()
            ->each(function (CashRegister $register) use ($closedBy) {
                $this->closeRegister(
                    $register,
                    $closedBy,
                    trim(($register->notes ? $register->notes.' — ' : '').'Cerrada automáticamente al iniciar sesión el día siguiente.')
                );
            });
    }

    private function formatCashRegister($register)
    {
        return [
            'id' => $register->id,
            'register_date' => $register->register_date->format('Y-m-d'),
            'opening_amount' => $register->opening_amount,
            'closing_amount' => $register->closing_amount ?? 0,
            'total_sales' => $register->total_sales,
            // 'Otros Ingresos' = ingresos totales menos lo que ya se cuenta
            // en Ventas (aportes de capital, u otros ingresos que no son de
            // inventario) — así Ventas + Otros Ingresos se pueden sumar sin
            // duplicar ni un peso.
            'other_income' => $register->total_income - $register->total_sales,
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
            // Si el usuario que abrió/cerró ya fue eliminado, la relación
            // viene null (FK en nullOnDelete) — se cae al snapshot del
            // nombre tomado en el momento, en vez de mostrar "-" sin poder
            // saber quién fue.
            'openedBy' => $register->openedBy
                ? ['id' => $register->openedBy->id, 'name' => $register->openedBy->name]
                : ['id' => 0, 'name' => $register->opened_by_name ?? '-'],
            'closedBy' => $register->closedBy
                ? ['id' => $register->closedBy->id, 'name' => $register->closedBy->name]
                : ['id' => 0, 'name' => $register->closed_by_name ?? '-'],
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
            'E1' => 'Otros Ingresos',
            'F1' => 'Egresos',
            'G1' => 'Monto Cierre',
            'H1' => 'Resultado del Día',
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
            $sheet->setCellValue('E'.$row, $register['other_income'] ? '$'.number_format($register['other_income'], 0, ',', '.') : '$0');
            $sheet->setCellValue('F'.$row, $register['total_expenses'] ? '$'.number_format($register['total_expenses'], 0, ',', '.') : '$0');
            $sheet->setCellValue('G'.$row, $register['is_closed'] ? ($register['closing_amount'] ? '$'.number_format($register['closing_amount'], 0, ',', '.') : '$0') : '');
            $sheet->setCellValue('H'.$row, $register['is_closed'] ? $this->formatSignedAmount($register['difference']) : '');
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
