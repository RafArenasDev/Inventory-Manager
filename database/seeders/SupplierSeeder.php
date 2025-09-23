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

        Supplier::create([
            'name'           => 'Importadora OKLA S.A.S',
            'representative' => 'Jhon Mario',
            'nit_number'     => 900153867,
            'nit_digit'      => '1',
            'phone'          => '60634001612',
            'cellphone'      => '3148301248',
            'address'        => 'Cl 9 N° 1-140 Bod. 1B Dosquebradas - la Badea. Variante Turín La popa',
            'email'          => 'info@importadoraokla.com',
            'description'    => 'Importadora y distribuidora de productos.',
            'is_active'      => true,
        ]);

        Supplier::create([
            'name'           => 'Lubriter R & Q S.A.S',
            'representative' => 'Cristian',
            'nit_number'     => 900007124,
            'nit_digit'      => '1',
            'phone'          => '6063132699',
            'cellphone'      => '',
            'address'        => 'Carrera 15 N° 138-25 Bodega 4 Centro Logístico Eje Cafetero Cerritos',
            'email'          => 'info@lubriter.com',
            'description'    => 'Proveedor de lubricantes y productos químicos.',
            'is_active'      => true,
        ]);

        Supplier::create([
            'name'           => 'DIFELB',
            'representative' => 'Karen Botia',
            'nit_number'     => 900690999,
            'nit_digit'      => '1',
            'phone'          => '',
            'cellphone'      => '3174964409',
            'address'        => 'Soacha',
            'email'          => '',
            'description'    => 'Proveedor de servicios y productos.',
            'is_active'      => true,
        ]);
    }
}
