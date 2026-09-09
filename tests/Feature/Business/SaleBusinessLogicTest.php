<?php

namespace Tests\Feature\Business;

use App\Models\CashRegister;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\TransactionCategory;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Fase B de QA (roadmap "Pruebas funcionales", caja blanca) — prioriza
 * dinero, inventario y auditoría según pide el roadmap. Cubre
 * SaleController::store()/cancel(), la parte más sensible del sistema: es
 * la única que mueve plata y stock real a la vez.
 */
class SaleBusinessLogicTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(PermissionSeeder::class);
        CashRegister::create([
            'register_date' => today(),
            'opened_by' => User::factory()->create()->id,
            'opening_amount' => 0,
            'is_closed' => false,
            'opened_at' => now(),
        ]);
    }

    private function sellerUser(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo('Crear Ventas');

        return $user;
    }

    private function makeSale(User $user, array $overrides = []): TestResponse
    {
        $client = $overrides['client'] ?? Client::factory()->create();
        $product = $overrides['product'] ?? Product::factory()->create(['sale_price' => 10000, 'stock' => 50]);
        $quantity = $overrides['quantity'] ?? 2;

        return $this->actingAs($user)->post(route('sales.store'), [
            'client_id' => $client->id,
            'sale_date' => today()->toDateString(),
            'sale_time' => now()->format('H:i:s'),
            'discount_type' => $overrides['discount_type'] ?? 'fixed',
            'discount' => $overrides['discount'] ?? 0,
            'payment_method' => 'Efectivo',
            'items' => [
                ['product_id' => $product->id, 'quantity' => $quantity],
            ],
        ]);
    }

    public function test_sale_total_is_computed_server_side_from_the_products_real_price()
    {
        $user = $this->sellerUser();
        $product = Product::factory()->create(['sale_price' => 15000, 'stock' => 10]);
        $client = Client::factory()->create();

        $this->makeSale($user, ['product' => $product, 'client' => $client, 'quantity' => 3])->assertSessionHasNoErrors();

        $sale = Sale::first();
        // 3 * 15000 = 45000, en centavos internos (* 100) como usa el resto del modelo.
        $this->assertSame(4500000, $sale->total_paid);
        $this->assertSame(15000, $sale->items->first()->price_at_sale);
    }

    public function test_percentage_discount_is_applied_correctly()
    {
        $user = $this->sellerUser();
        $product = Product::factory()->create(['sale_price' => 10000, 'stock' => 10]);

        $this->makeSale($user, ['product' => $product, 'quantity' => 2, 'discount_type' => 'percentage', 'discount' => 10])
            ->assertSessionHasNoErrors();

        $sale = Sale::first();
        // 2*10000=20000, 10% de descuento = 2000 -> total 18000.
        $this->assertSame(1800000, $sale->total_paid);
    }

    public function test_stock_is_decremented_and_an_outbound_movement_is_created()
    {
        $user = $this->sellerUser();
        $product = Product::factory()->create(['sale_price' => 5000, 'stock' => 20]);

        $this->makeSale($user, ['product' => $product, 'quantity' => 5])->assertSessionHasNoErrors();

        $this->assertSame(15, $product->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => 'Salida',
            'quantity' => 5,
        ]);
    }

    public function test_a_sale_cannot_oversell_beyond_available_stock()
    {
        $user = $this->sellerUser();
        $product = Product::factory()->create(['sale_price' => 5000, 'stock' => 3]);

        $response = $this->makeSale($user, ['product' => $product, 'quantity' => 10]);

        $response->assertSessionHasErrors();
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame(0, Sale::count());
    }

    public function test_consumidor_final_client_cannot_exceed_the_dian_limit()
    {
        $user = $this->sellerUser();
        // Documento DIAN "Consumidor Final" sembrado por la migración
        // 2026_09_08_212432_seed_dian_default_client.
        $consumidorFinal = Client::where('document_number', 222222222222)->first();
        $this->assertNotNull($consumidorFinal, 'La migración de seed del cliente DIAN no corrió.');

        // Límite real: 5 UVT * 52374 = 261870. Un producto a 300000 lo supera.
        $product = Product::factory()->create(['sale_price' => 300000, 'stock' => 10]);

        $response = $this->makeSale($user, ['product' => $product, 'client' => $consumidorFinal, 'quantity' => 1]);

        $response->assertSessionHasErrors();
        $this->assertSame(0, Sale::count());
    }

    public function test_consumidor_final_client_under_the_limit_is_allowed()
    {
        $user = $this->sellerUser();
        $consumidorFinal = Client::where('document_number', 222222222222)->first();
        $product = Product::factory()->create(['sale_price' => 50000, 'stock' => 10]);

        $this->makeSale($user, ['product' => $product, 'client' => $consumidorFinal, 'quantity' => 1])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, Sale::count());
    }

    public function test_cancelling_a_sale_restores_stock_and_removes_its_transaction()
    {
        $user = $this->sellerUser();
        $user->givePermissionTo('Eliminar Ventas');
        TransactionCategory::create(['name' => 'Ventas', 'type' => 'Ingreso', 'is_system' => true]);
        $product = Product::factory()->create(['sale_price' => 8000, 'stock' => 10]);

        $this->makeSale($user, ['product' => $product, 'quantity' => 4])->assertSessionHasNoErrors();
        $this->assertSame(6, $product->fresh()->stock);

        $sale = Sale::first();
        $this->assertDatabaseHas('transactions', ['sale_id' => $sale->id]);

        $this->actingAs($user)->post(route('sales.cancel', $sale->id), ['reason' => 'Producto defectuoso'])
            ->assertRedirect();

        $this->assertSame(10, $product->fresh()->stock);
        $this->assertTrue($sale->fresh()->is_cancelled);
        $this->assertDatabaseMissing('transactions', ['sale_id' => $sale->id]);
    }

    public function test_a_sale_cannot_be_registered_without_an_open_cash_register()
    {
        CashRegister::query()->delete();
        $user = $this->sellerUser();

        $response = $this->makeSale($user);

        $response->assertSessionHas('error');
        $this->assertSame(0, Sale::count());
    }
}
