<?php
namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Portátiles', 'description' => 'Laptops y notebooks para hogar, oficina y gaming.'],
            ['name' => 'Computadores de Escritorio', 'description' => 'PCs de escritorio armados y todo en uno.'],
            ['name' => 'Monitores', 'description' => 'Monitores y pantallas para computador.'],
            ['name' => 'Componentes PC', 'description' => 'Procesadores, tarjetas madre y memorias RAM.'],
            ['name' => 'Tarjetas Gráficas', 'description' => 'Tarjetas de video para gaming y diseño.'],
            ['name' => 'Almacenamiento', 'description' => 'Discos SSD, HDD y memorias USB.'],
            ['name' => 'Periféricos', 'description' => 'Teclados, mouse y combos.'],
            ['name' => 'Audio', 'description' => 'Audífonos, diademas, parlantes y micrófonos.'],
            ['name' => 'Redes y Conectividad', 'description' => 'Routers, switches y cables de red.'],
            ['name' => 'Impresión', 'description' => 'Impresoras, tóner y cartuchos de tinta.'],
            ['name' => 'Cámaras y Seguridad', 'description' => 'Webcams y cámaras de seguridad IP.'],
            ['name' => 'Sillas y Mobiliario Gamer', 'description' => 'Sillas y escritorios gamer.'],
            ['name' => 'Fuentes y Refrigeración', 'description' => 'Fuentes de poder y sistemas de enfriamiento.'],
            ['name' => 'Cables y Adaptadores', 'description' => 'Cables, adaptadores y hubs USB.'],
            ['name' => 'Software y Licencias', 'description' => 'Licencias de sistemas operativos y ofimática.'],
            ['name' => 'Accesorios', 'description' => 'Mousepads, soportes y elementos de limpieza.'],
        ];

        foreach ($categories as $cat) {
            Category::create($cat);
        }
    }
}
