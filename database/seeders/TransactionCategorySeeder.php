<?php

namespace Database\Seeders;

use App\Models\TransactionCategory;
use Illuminate\Database\Seeder;

class TransactionCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            // INGRESOS
            [
                'name' => 'Ventas',
                'type' => 'Ingreso',
                'description' => 'Ingresos por ventas del local',
                'is_system' => true,
            ],
            [
                'name' => 'Aporte de Capital',
                'type' => 'Ingreso',
                'description' => 'Inyección de capital o patrimonio al negocio',
                'is_system' => true,
            ],
            [
                'name' => 'Otros Ingresos',
                'type' => 'Ingreso',
                'description' => 'Otros ingresos no clasificados',
                'is_system' => false,
            ],

            // GASTOS
            [
                'name' => 'Arriendo',
                'type' => 'Gasto',
                'description' => 'Pago de arriendo del local',
                'is_system' => false,
            ],
            [
                'name' => 'Servicios Públicos',
                'type' => 'Gasto',
                'description' => 'Luz, agua, gas, internet, teléfono',
                'is_system' => false,
            ],
            [
                'name' => 'Impuestos',
                'type' => 'Gasto',
                'description' => 'Impuestos municipales, predial, industria y comercio',
                'is_system' => false,
            ],
            [
                'name' => 'Nómina',
                'type' => 'Gasto',
                'description' => 'Pago de salarios y prestaciones',
                'is_system' => false,
            ],
            [
                'name' => 'Mantenimiento',
                'type' => 'Gasto',
                'description' => 'Mantenimiento y reparaciones del local',
                'is_system' => false,
            ],
            [
                'name' => 'Transporte',
                'type' => 'Gasto',
                'description' => 'Gastos de transporte y domicilios',
                'is_system' => false,
            ],
            [
                'name' => 'Publicidad',
                'type' => 'Gasto',
                'description' => 'Gastos en publicidad y marketing',
                'is_system' => false,
            ],
            [
                'name' => 'Papelería',
                'type' => 'Gasto',
                'description' => 'Compra de papelería y útiles de oficina',
                'is_system' => false,
            ],
            [
                'name' => 'Otros Gastos',
                'type' => 'Gasto',
                'description' => 'Otros gastos operacionales no clasificados',
                'is_system' => false,
            ],
        ];

        foreach ($categories as $category) {
            TransactionCategory::create($category);
        }
    }
}
