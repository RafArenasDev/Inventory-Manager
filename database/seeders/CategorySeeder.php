<?php
namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {

        $categories = [
            ['name' => 'Frenos', 'description' => 'Componentes de frenos para motos.'],
            ['name' => 'Filtro aceite', 'description' => 'Filtros de aceite.'],
            ['name' => 'Filtro combustible', 'description' => 'Filtros de combustible.'],
            ['name' => 'Filtro aire', 'description' => 'Filtros de aire.'],
            ['name' => 'Guayas', 'description' => 'Guayas y cables de control.'],
            ['name' => 'Maniguetas', 'description' => 'Maniguetas y empuñaduras.'],
            ['name' => 'Rodamientos internos', 'description' => 'Rodamientos internos.'],
            ['name' => 'Partes eléctricas', 'description' => 'Partes eléctricas.'],
            ['name' => 'Empaques', 'description' => 'Empaques y sellos.'],
            ['name' => 'Aceites y grasas', 'description' => 'Aceites y grasas lubricantes.'],
            ['name' => 'Tuercas y tornillos', 'description' => 'Tornillos y tuercas.'], // Esta puede servir para TCAS Y TORNILLO
            ['name' => 'Varios', 'description' => 'Artículos varios.'],
            ['name' => 'Arandelas', 'description' => 'Arandelas.'],
            ['name' => 'Partes carburador', 'description' => 'Partes de carburador.'],
            ['name' => 'Transmisión scooter', 'description' => 'Transmisiones para scooter.'],
            ['name' => 'Bandas de freno', 'description' => 'Bandas de freno.'],
            ['name' => 'Calapies delantero/trasero', 'description' => 'Calapies del/tras.'],
            ['name' => 'Cauchos', 'description' => 'Cauchos y sellos.'],
            ['name' => 'Comandos', 'description' => 'Comandos.'],
            ['name' => 'Bujes', 'description' => 'Bujes.'],
            ['name' => 'Partes plásticas externas', 'description' => 'Partes plásticas externas.'],
            ['name' => 'Ejes', 'description' => 'Ejes.'],
            ['name' => 'Kits arrastre completos', 'description' => 'Kits de arrastre completos.'],
            ['name' => 'Piñones', 'description' => 'Piñones.'],
            ['name' => 'Patas laterales y gato central', 'description' => 'Patas laterales y gato central.'],
            // ['name' => 'Adaptadores', 'description' => 'Adaptadores para espejos y accesorios.'],
        ];

        foreach ($categories as $cat) {Category::create($cat);}
    }
}
