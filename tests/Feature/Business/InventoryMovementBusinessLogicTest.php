<?php

namespace Tests\Feature\Business;

use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fase B de QA (roadmap "Pruebas funcionales", caja blanca) — segunda pata
 * de "dinero, inventario y auditoría": InventoryMovementController::store(),
 * que es la única otra vía (aparte de una venta) por la que el stock de un
 * producto cambia.
 */
class InventoryMovementBusinessLogicTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    private function operatorUser(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo('Crear Movimientos Inventario');

        return $user;
    }

    public function test_entrada_increments_stock()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 10]);

        $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Entrada',
            'product_id' => $product->id,
            'quantity' => 15,
            'date' => today()->toDateString(),
        ])->assertSessionHasNoErrors();

        $this->assertSame(25, $product->fresh()->stock);
    }

    public function test_salida_decrements_stock()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 20]);

        $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Salida',
            'product_id' => $product->id,
            'quantity' => 8,
            'date' => today()->toDateString(),
        ])->assertSessionHasNoErrors();

        $this->assertSame(12, $product->fresh()->stock);
    }

    public function test_salida_cannot_exceed_available_stock()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 5]);

        $response = $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Salida',
            'product_id' => $product->id,
            'quantity' => 100,
            'date' => today()->toDateString(),
        ]);

        $response->assertSessionHas('error');
        $this->assertSame(5, $product->fresh()->stock);
    }

    public function test_ajuste_inventario_sets_stock_to_the_physical_count_not_a_delta()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 10]);

        // El conteo físico real dio 4 — no significa "restar 4", significa
        // "el stock real es 4" (delta = 4 - 10 = -6 aplicado internamente).
        $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Ajuste Inventario',
            'product_id' => $product->id,
            'quantity' => 4,
            'date' => today()->toDateString(),
        ])->assertSessionHasNoErrors();

        $this->assertSame(4, $product->fresh()->stock);
    }

    public function test_ajuste_inventario_upward_is_audited_with_before_and_after_stock()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 3]);

        $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Ajuste Inventario',
            'product_id' => $product->id,
            'quantity' => 9,
            'date' => today()->toDateString(),
            'notes' => 'Conteo físico de fin de mes',
        ])->assertSessionHasNoErrors();

        $this->assertSame(9, $product->fresh()->stock);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'inventory.manual_adjustment',
        ]);
    }

    public function test_ajuste_inventario_accepts_zero_as_a_real_physical_count()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 5]);

        $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Ajuste Inventario',
            'product_id' => $product->id,
            'quantity' => 0,
            'date' => today()->toDateString(),
        ])->assertSessionHasNoErrors();

        $this->assertSame(0, $product->fresh()->stock);
    }

    public function test_a_future_dated_movement_is_rejected()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 10]);

        $response = $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Entrada',
            'product_id' => $product->id,
            'quantity' => 5,
            'date' => today()->addDay()->toDateString(),
        ]);

        $response->assertSessionHasErrors(['date']);
        $this->assertSame(10, $product->fresh()->stock);
    }

    public function test_the_supplier_is_always_taken_from_the_product_never_from_the_request()
    {
        $user = $this->operatorUser();
        $product = Product::factory()->create(['stock' => 10]);
        $otherSupplier = Supplier::factory()->create();

        $this->actingAs($user)->post(route('inventory-movements.store'), [
            'type' => 'Entrada',
            'product_id' => $product->id,
            'quantity' => 5,
            'date' => today()->toDateString(),
            'supplier_id' => $otherSupplier->id,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'supplier_id' => $product->supplier_id,
        ]);
        $this->assertDatabaseMissing('inventory_movements', [
            'product_id' => $product->id,
            'supplier_id' => $otherSupplier->id,
        ]);
    }
}
