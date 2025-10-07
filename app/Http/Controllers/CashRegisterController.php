<?php
namespace App\Http\Controllers;

use App\Http\Requests\CashRegisterCloseRequest;
use App\Http\Requests\CashRegisterOpenRequest;
use App\Models\CashRegister;
use App\Models\Sale;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CashRegisterController extends Controller
{
    /**
     * Display a listing of cash registers.
     */
    public function index(Request $request)
    {
        // Construct the base query
        $cashRegistersQuery = CashRegister::with(['openedBy', 'closedBy'])
            ->orderBy('register_date', 'desc');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $cashRegistersQuery->where(function ($query) use ($search) {
                $query->whereDate('register_date', 'like', "%{$search}%")
                    ->orWhereHas('openedBy', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Apply date range filter
        if ($request->filled('date_from')) {
            $cashRegistersQuery->where('register_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $cashRegistersQuery->where('register_date', '<=', $request->date_to);
        }

        // Apply status filter
        if ($request->filled('status')) {
            if ($request->status === 'open') {
                $cashRegistersQuery->where('is_closed', false);
            } elseif ($request->status === 'closed') {
                $cashRegistersQuery->where('is_closed', true);
            }
        }

        // Count total and filtered
        $totalCount    = CashRegister::count();
        $filteredCount = $cashRegistersQuery->count();

        // Pagination
        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allCashRegisters = $cashRegistersQuery->get();

            $cashRegisters = [
                'data'     => $allCashRegisters,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
                'links'    => [],
            ];
        } else {
            $cashRegisters = $cashRegistersQuery->paginate($perPage)->withQueryString();
        }

        // Check if there's an open register today
        $todayRegister = CashRegister::where('register_date', today())
            ->where('is_closed', false)
            ->first();

        return Inertia::render('cashRegister/index', [
            'cashRegisters' => $cashRegisters,
            'filters'       => $request->only(['search', 'per_page', 'date_from', 'date_to', 'status']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
            'todayRegister' => $todayRegister,
        ]);
    }

    /**
     * Display today's cash register.
     */
    public function today()
    {
        $todayRegister = CashRegister::where('register_date', today())->first();

        if (! $todayRegister) {
            return Inertia::render('cashRegister/today', [
                'cashRegister' => null,
                'canOpen'      => true,
            ]);
        }

        // Load relations
        $todayRegister->load(['openedBy', 'closedBy']);

        // Get today's transactions
        $transactions = Transaction::with(['category', 'user'])
            ->whereDate('transaction_date', today())
            ->where('is_cancelled', false)
            ->orderBy('transaction_time', 'desc')
            ->get();

        // Get today's sales
        $sales = Sale::with(['client', 'user'])
            ->whereDate('sale_date', today())
            ->where('is_cancelled', false)
            ->orderBy('sale_time', 'desc')
            ->get();

        return Inertia::render('cashRegister/today', [
            'cashRegister' => $todayRegister,
            'transactions' => $transactions,
            'sales'        => $sales,
            'canOpen'      => false,
        ]);
    }

    /**
     * Open a new cash register.
     */
    public function open(CashRegisterOpenRequest $request): RedirectResponse
    {
        // Verificar que no exista una caja abierta para la fecha
        $existingRegister = CashRegister::where('register_date', $request->register_date)
            ->first();

        if ($existingRegister) {
            return redirect()->back()
                ->with('error', 'Ya existe una caja registrada para esta fecha.');
        }

        DB::beginTransaction();

        try {
            CashRegister::create([
                'register_date'   => $request->register_date,
                'opened_by'       => auth()->id(),
                'opening_balance' => $request->opening_balance,
                'opened_at'       => now(),
                'opening_notes'   => $request->opening_notes,
            ]);

            DB::commit();

            return redirect()->route('cash-register.today')
                ->with('success', 'Caja abierta correctamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withInput()
                ->with('error', 'Error al abrir la caja: ' . $e->getMessage());
        }
    }

    /**
     * Close a cash register.
     */
    public function close(CashRegisterCloseRequest $request, CashRegister $cashRegister): RedirectResponse
    {
        // Verificar que no esté ya cerrada
        if ($cashRegister->is_closed) {
            return redirect()->back()
                ->with('error', 'La caja ya está cerrada.');
        }

        DB::beginTransaction();

        try {
            // Calcular totales del día
            $salesTotal = Sale::whereDate('sale_date', $cashRegister->register_date)
                ->where('is_cancelled', false)
                ->sum('total_paid');

            $incomeTotal = Transaction::whereDate('transaction_date', $cashRegister->register_date)
                ->where('type', 'Ingreso')
                ->where('is_cancelled', false)
                ->whereNull('sale_id') // Excluir ingresos de ventas
                ->sum('amount');

            $expensesTotal = Transaction::whereDate('transaction_date', $cashRegister->register_date)
                ->where('type', 'Gasto')
                ->where('is_cancelled', false)
                ->sum('amount');

            $expectedBalance = $cashRegister->opening_balance + $salesTotal + $incomeTotal - $expensesTotal;
            $difference      = $request->actual_balance - $expectedBalance;

            $cashRegister->update([
                'total_sales'      => $salesTotal,
                'total_income'     => $incomeTotal,
                'total_expenses'   => $expensesTotal,
                'expected_balance' => $expectedBalance,
                'actual_balance'   => $request->actual_balance,
                'difference'       => $difference,
                'closed_by'        => auth()->id(),
                'closed_at'        => now(),
                'is_closed'        => true,
                'closing_notes'    => $request->closing_notes,
            ]);

            DB::commit();

            return redirect()->route('cash-register.show', $cashRegister)
                ->with('success', 'Caja cerrada correctamente.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withInput()
                ->with('error', 'Error al cerrar la caja: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified cash register.
     */
    public function show(CashRegister $cashRegister)
    {
        // Load relations
        $cashRegister->load(['openedBy', 'closedBy']);

        // Get transactions for this date
        $transactions = Transaction::with(['category', 'user'])
            ->whereDate('transaction_date', $cashRegister->register_date)
            ->where('is_cancelled', false)
            ->orderBy('transaction_time', 'desc')
            ->get();

        // Get sales for this date
        $sales = Sale::with(['client', 'user', 'items.product'])
            ->whereDate('sale_date', $cashRegister->register_date)
            ->where('is_cancelled', false)
            ->orderBy('sale_time', 'desc')
            ->get();

        // Calculate totals by payment method
        $salesByMethod = Sale::whereDate('sale_date', $cashRegister->register_date)
            ->where('is_cancelled', false)
            ->selectRaw('payment_method, SUM(total_paid) as total')
            ->groupBy('payment_method')
            ->get();

        $transactionsByMethod = Transaction::whereDate('transaction_date', $cashRegister->register_date)
            ->where('is_cancelled', false)
            ->selectRaw('payment_method, type, SUM(amount) as total')
            ->groupBy('payment_method', 'type')
            ->get();

        return Inertia::render('cashRegister/show', [
            'cashRegister'         => $cashRegister,
            'transactions'         => $transactions,
            'sales'                => $sales,
            'salesByMethod'        => $salesByMethod,
            'transactionsByMethod' => $transactionsByMethod,
        ]);
    }
}
