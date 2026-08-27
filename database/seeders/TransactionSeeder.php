<?php

namespace Database\Seeders;

use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use Carbon\Carbon;
use Faker\Factory;
use Illuminate\Database\Seeder;

class TransactionSeeder extends Seeder
{
    /**
     * Transacciones operativas del negocio que no vienen de una venta
     * (arriendo, nómina, servicios, etc.), para que Finanzas y Caja tengan
     * datos realistas además del ingreso por ventas.
     */
    public function run(): void
    {
        $faker = Factory::create('es_CO');
        $admin = User::where('email', 'admin@admin.com')->first();

        if (! $admin) {
            \Log::warning('No existe el usuario admin; se omite TransactionSeeder.');

            return;
        }

        $categories = TransactionCategory::all()->keyBy('name');
        $today = Carbon::today();

        $entries = [];

        // Arriendo y servicios: uno por mes en los últimos 3 meses
        for ($m = 0; $m < 3; $m++) {
            $date = $today->copy()->subMonthsNoOverflow($m)->startOfMonth()->addDays($faker->numberBetween(0, 4));
            $entries[] = ['category' => 'Arriendo', 'type' => 'Gasto', 'amount' => $faker->numberBetween(1800000, 2200000), 'date' => $date];
            $entries[] = ['category' => 'Servicios Públicos', 'type' => 'Gasto', 'amount' => $faker->numberBetween(380000, 650000), 'date' => $date->copy()->addDays(2)];
        }

        // Nómina: quincenal, últimos 3 meses (6 pagos)
        for ($q = 0; $q < 6; $q++) {
            $date = $today->copy()->subDays($q * 15 + $faker->numberBetween(0, 3));
            $entries[] = ['category' => 'Nómina', 'type' => 'Gasto', 'amount' => $faker->numberBetween(1400000, 2600000), 'date' => $date];
        }

        // Impuestos: bimestral
        for ($b = 0; $b < 2; $b++) {
            $date = $today->copy()->subMonthsNoOverflow($b * 2 + 1)->addDays($faker->numberBetween(0, 10));
            $entries[] = ['category' => 'Impuestos', 'type' => 'Gasto', 'amount' => $faker->numberBetween(250000, 900000), 'date' => $date];
        }

        // Mantenimiento
        for ($i = 0; $i < 4; $i++) {
            $entries[] = ['category' => 'Mantenimiento', 'type' => 'Gasto', 'amount' => $faker->numberBetween(60000, 320000), 'date' => $today->copy()->subDays($faker->numberBetween(0, 88))];
        }

        // Transporte / domicilios
        for ($i = 0; $i < 8; $i++) {
            $entries[] = ['category' => 'Transporte', 'type' => 'Gasto', 'amount' => $faker->numberBetween(18000, 85000), 'date' => $today->copy()->subDays($faker->numberBetween(0, 88))];
        }

        // Publicidad
        for ($i = 0; $i < 4; $i++) {
            $entries[] = ['category' => 'Publicidad', 'type' => 'Gasto', 'amount' => $faker->numberBetween(100000, 450000), 'date' => $today->copy()->subDays($faker->numberBetween(0, 88))];
        }

        // Papelería
        for ($i = 0; $i < 5; $i++) {
            $entries[] = ['category' => 'Papelería', 'type' => 'Gasto', 'amount' => $faker->numberBetween(15000, 65000), 'date' => $today->copy()->subDays($faker->numberBetween(0, 88))];
        }

        // Otros gastos
        for ($i = 0; $i < 3; $i++) {
            $entries[] = ['category' => 'Otros Gastos', 'type' => 'Gasto', 'amount' => $faker->numberBetween(20000, 180000), 'date' => $today->copy()->subDays($faker->numberBetween(0, 88))];
        }

        // Aporte de capital inicial
        $entries[] = ['category' => 'Aporte de Capital', 'type' => 'Ingreso', 'amount' => 8000000, 'date' => $today->copy()->subDays(88)];

        // Otros ingresos ocasionales
        for ($i = 0; $i < 3; $i++) {
            $entries[] = ['category' => 'Otros Ingresos', 'type' => 'Ingreso', 'amount' => $faker->numberBetween(30000, 250000), 'date' => $today->copy()->subDays($faker->numberBetween(0, 88))];
        }

        foreach ($entries as $entry) {
            $category = $categories->get($entry['category']);
            if (! $category) {
                continue;
            }

            Transaction::create([
                'user_id' => $admin->id,
                'type' => $entry['type'],
                'transaction_category_id' => $category->id,
                'amount' => $entry['amount'],
                'transaction_date' => $entry['date']->toDateString(),
                'transaction_time' => sprintf('%02d:%02d:00', $faker->numberBetween(8, 17), $faker->numberBetween(0, 59)),
                'payment_method' => $faker->randomElement(['Efectivo', 'Nequi']),
                'invoice_number' => null,
                'description' => $entry['category'],
                'notes' => null,
            ]);
        }
    }
}
