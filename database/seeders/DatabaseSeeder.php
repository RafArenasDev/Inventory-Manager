<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            ModuleSeeder::class,
            PermissionSeeder::class,
            RoleSeeder::class,
            UserSeeder::class,
            CategorySeeder::class,
            SupplierSeeder::class,
            // ProductSeeder::class, // omitido a pedido del usuario: los productos de prueba se cargan vía Carga Masiva.
            DepartmentCitySeeder::class,
            ClientSeeder::class,
            TransactionCategorySeeder::class,
            SaleSeeder::class,
            TransactionSeeder::class,
            InventoryMovementSeeder::class,
            CashRegisterSeeder::class,
        ]);
    }
}
