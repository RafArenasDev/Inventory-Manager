<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\View;
use Tests\TestCase;

/**
 * Regresión: la factura en PDF usaba una tabla anidada para alinear el
 * "$" a la izquierda y el valor a la derecha (partial money-cell), tanto
 * en la tabla de Productos como en la caja de Subtotal/TOTAL — real en
 * producción: dompdf separaba el "$" del valor con un espacio en blanco
 * enorme (y en la tabla de Productos, una línea horizontal de más). Se
 * reemplazó por texto plano ("$ 1.000") en una celda alineada a la
 * derecha, sin tabla anidada.
 */
class SaleInvoiceViewTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_renders_prices_as_plain_right_aligned_text_not_a_nested_table()
    {
        $product = Product::factory()->create(['code' => 'A123', 'name' => 'Producto de prueba']);
        $sale = Sale::create([
            'invoice_number' => 'A-000001',
            'user_id' => User::factory()->create()->id,
            'sale_date' => today(),
            'sale_time' => now()->format('H:i:s'),
            'total_without_tax' => 3200000,
            'total_with_discount' => 3200000,
            'total_paid' => 3200000,
            'payment_method' => 'Efectivo',
            'is_cancelled' => false,
        ]);
        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'price_at_sale' => 32000,
            'subtotal' => 32000,
        ]);
        $sale->load('items.product', 'client', 'user');

        // Si quedara una referencia colgante a @include('sales.partials.money-cell')
        // (el partial se eliminó junto con este fix), render() lanzaría
        // "View [sales.partials.money-cell] not found" acá mismo.
        $html = View::make('sales.invoice', ['sale' => $sale])->render();

        $this->assertStringContainsString('$ 32.000', $html);
    }
}
