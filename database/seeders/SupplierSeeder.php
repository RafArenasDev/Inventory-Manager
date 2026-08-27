<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    /**
     * Datos ficticios (nombres, NITs y direcciones inventados) para la demo
     * de una tienda de tecnología — no representan proveedores reales.
     */
    public function run(): void
    {
        Supplier::create([
            'name' => 'TecnoMayorista S.A.S',
            'representative' => 'Laura Ximena Rojas',
            'nit_number' => 901234567,
            'nit_digit' => '3',
            'phone' => '6017891234',
            'cellphone' => '3101234567',
            'address' => 'Cra 15 #93-60, Bogotá',
            'email' => 'ventas@tecnomayorista.com.co',
            'description' => 'Distribuidor mayorista de computadores, componentes y periféricos.',
            'is_active' => true,
        ]);

        Supplier::create([
            'name' => 'GlobalTech Distribuciones S.A.S',
            'representative' => 'Camilo Andrés Peña',
            'nit_number' => 900876543,
            'nit_digit' => '5',
            'phone' => '6042561234',
            'cellphone' => '3159876543',
            'address' => 'Cl 50 #65-20, Medellín',
            'email' => 'contacto@globaltechdist.com',
            'description' => 'Importador de tarjetas gráficas, componentes y almacenamiento.',
            'is_active' => true,
        ]);

        Supplier::create([
            'name' => 'Andina Componentes S.A.S',
            'representative' => 'Diana Marcela Gómez',
            'nit_number' => 900345678,
            'nit_digit' => '1',
            'phone' => '6023451234',
            'cellphone' => '3187654321',
            'address' => 'Av 6N #28N-10, Cali',
            'email' => 'pedidos@andinacomponentes.co',
            'description' => 'Proveedor de periféricos, audio y accesorios gamer.',
            'is_active' => true,
        ]);

        Supplier::create([
            'name' => 'Conectividad y Redes del Eje S.A.S',
            'representative' => 'Julián Esteban Marín',
            'nit_number' => 901567890,
            'nit_digit' => '9',
            'phone' => '6063214567',
            'cellphone' => '3123456789',
            'address' => 'Cra 8 #21-30, Pereira',
            'email' => 'info@redeseje.com.co',
            'description' => 'Proveedor de redes, cámaras de seguridad e impresión.',
            'is_active' => true,
        ]);
    }
}
