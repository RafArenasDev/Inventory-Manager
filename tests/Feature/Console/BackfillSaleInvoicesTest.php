<?php

namespace Tests\Feature\Console;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Regresión: 182 de 183 ventas reales de un negocio (todas las de un mismo
 * cliente "de mostrador") no tenían factura PDF porque el sistema anterior
 * nunca la generaba — el usuario no podía reimprimirlas. `sales:backfill-invoices`
 * cierra esa brecha sin tocar los montos ni el estado de la venta.
 */
class BackfillSaleInvoicesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    private function makeSale(array $overrides = []): Sale
    {
        return Sale::create(array_merge([
            'invoice_number' => 'A-'.random_int(100000, 999999),
            'user_id' => User::factory()->create()->id,
            'sale_date' => today(),
            'sale_time' => now()->format('H:i:s'),
            'total_paid' => 10000,
            'payment_method' => 'Efectivo',
            'is_cancelled' => false,
        ], $overrides));
    }

    public function test_it_generates_invoices_for_sales_missing_one()
    {
        $sale = $this->makeSale();
        $this->assertNull($sale->public_invoice_url);

        $this->artisan('sales:backfill-invoices')->assertExitCode(0);

        $this->assertNotNull($sale->refresh()->public_invoice_url);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $sale->public_invoice_url));
    }

    public function test_it_does_not_touch_cancelled_sales()
    {
        $cancelled = $this->makeSale(['is_cancelled' => true]);

        $this->artisan('sales:backfill-invoices')->assertExitCode(0);

        $this->assertNull($cancelled->refresh()->public_invoice_url);
    }

    public function test_it_skips_sales_that_already_have_an_invoice()
    {
        $sale = $this->makeSale(['public_invoice_url' => '/storage/invoices/already-there.pdf']);

        $this->artisan('sales:backfill-invoices')->assertExitCode(0);

        $this->assertSame('/storage/invoices/already-there.pdf', $sale->refresh()->public_invoice_url);
    }
}
