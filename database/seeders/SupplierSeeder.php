<?php
namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Supplier::create([
            'name'           => 'Distriandina H',
            'representative' => 'Ospina Vallejo Jorge Hernando',
            'nit_number'     => 10196977,
            'nit_digit'      => '8',
            'phone'          => '3541063',
            'cellphone'      => '',
            'address'        => 'CL 32 10-134 Guadalupe - Dosquebradas',
            'email'          => 'distriandina@hotmail.com',
            'description'    => 'Proveedor de distribución y servicios comerciales.',
            'is_active'      => true,
        ]);
    }
}
