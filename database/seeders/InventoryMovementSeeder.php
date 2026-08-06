<?php
namespace Database\Seeders;

use App\Models\InventoryMovement;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class InventoryMovementSeeder extends Seeder
{
    /**
     * Movimientos adicionales (devoluciones y ajustes) sobre productos con
     * stock saludable (>10), para no interferir con los productos que
     * ProductSeeder dejó en las franjas críticas de la alerta de inventario.
     */
    public function run(): void
    {
        $faker = \Faker\Factory::create('es_CO');
        $products = Product::where('stock', '>', 10)->inRandomOrder()->limit(12)->get();

        foreach ($products as $index => $product) {
            $date = Carbon::now()->subDays($faker->numberBetween(1, 30));

            if ($index % 2 === 0) {
                // Devolución de cliente: un cliente trae de vuelta 1 unidad.
                $quantity = 1;
                InventoryMovement::create([
                    'product_id'  => $product->id,
                    'supplier_id' => null,
                    'type'        => 'Devolucion Cliente',
                    'quantity'    => $quantity,
                    'date'        => $date->toDateString(),
                    'notes'       => 'Devolución de cliente por cambio de producto',
                ]);
                $product->increment('stock', $quantity);
            } else {
                // Ajuste de inventario tras conteo físico (puede ser + o -).
                $delta = $faker->randomElement([-2, -1, 1, 2, 3]);
                InventoryMovement::create([
                    'product_id'  => $product->id,
                    'supplier_id' => null,
                    'type'        => 'Ajuste Inventario',
                    'quantity'    => $delta,
                    'date'        => $date->toDateString(),
                    'notes'       => 'Ajuste por conteo físico de inventario',
                ]);
                if ($delta >= 0) {
                    $product->increment('stock', $delta);
                } else {
                    $product->decrement('stock', abs($delta));
                }
            }
        }
    }
}
