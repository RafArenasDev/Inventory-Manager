<?php

namespace Database\Seeders;

use App\Models\CashRegister;
use App\Models\Sale;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CashRegisterSeeder extends Seeder
{
    /**
     * Cajas diarias cerradas de los últimos 20 días hábiles (el día de hoy se
     * deja sin abrir a propósito, para que se pueda probar el flujo real de
     * "Abrir Caja" en la demo). Replica las mismas fórmulas de
     * CashRegisterController@store/@update: `total_sales` en centavos,
     * el resto de montos en pesos.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@admin.com')->first();
        $cashier = User::where('email', 'cajero@demo.com')->first();

        if (! $admin) {
            \Log::warning('No existe el usuario admin; se omite CashRegisterSeeder.');

            return;
        }

        $openedBy = $cashier ?? $admin;
        $closedBy = $admin;

        for ($daysAgo = 20; $daysAgo >= 1; $daysAgo--) {
            $registerDate = Carbon::today()->subDays($daysAgo);

            // Sin caja los domingos, como un negocio real.
            if ($registerDate->isSunday()) {
                continue;
            }

            $totalIncomeToDate = Transaction::where('type', 'Ingreso')
                ->whereDate('transaction_date', '<=', $registerDate)
                ->sum('amount');
            $totalExpensesToDate = Transaction::where('type', 'Gasto')
                ->whereDate('transaction_date', '<=', $registerDate)
                ->sum('amount');
            $openingAmount = max(0, $totalIncomeToDate - $totalExpensesToDate);

            $salesTotal = Sale::whereDate('sale_date', $registerDate)
                ->where('is_cancelled', false)
                ->sum('total_paid');

            $dayIncome = Transaction::where('type', 'Ingreso')
                ->whereDate('transaction_date', $registerDate)
                ->sum('amount');
            $dayExpenses = Transaction::where('type', 'Gasto')
                ->whereDate('transaction_date', $registerDate)
                ->sum('amount');

            $closingAmount = $openingAmount + $dayIncome - $dayExpenses;
            $difference = $closingAmount - $openingAmount;

            CashRegister::create([
                'register_date' => $registerDate->toDateString(),
                'opened_by' => $openedBy->id,
                'closed_by' => $closedBy->id,
                'opening_amount' => $openingAmount,
                'closing_amount' => $closingAmount,
                'total_sales' => $salesTotal,
                'total_income' => $dayIncome,
                'total_expenses' => $dayExpenses,
                'difference' => $difference,
                'opened_at' => $registerDate->copy()->setTime(8, 0),
                'closed_at' => $registerDate->copy()->setTime(20, 0),
                'is_closed' => true,
                'notes' => null,
            ]);
        }
    }
}
