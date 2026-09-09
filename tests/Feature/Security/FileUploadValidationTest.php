<?php

namespace Tests\Feature\Security;

use App\Models\Category;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Fase 1 de QA, categoría "Carga de archivos maliciosos" — confirma que la
 * validación es por contenido real, no solo por el nombre/extensión que
 * manda el cliente (que es trivial de falsificar).
 */
class FileUploadValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    private function actingUserWithPermission(string $permission): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permission);
        $this->actingAs($user);

        return $user;
    }

    public function test_a_non_image_file_is_rejected()
    {
        $this->actingUserWithPermission('Crear Productos');
        $category = Category::factory()->create();
        $supplier = Supplier::factory()->create();

        // Nota metodológica: `UploadedFile::fake()` de Laravel (Testing\File)
        // deriva el MIME reportado del NOMBRE del archivo, no de su
        // contenido real (ver vendor/laravel/framework/.../Testing/File.php
        // — `getMimeType()` es `$this->mimeTypeToReport ?: MimeType::from($this->name)`),
        // así que no se puede usar para probar "un binario disfrazado de
        // .jpg pasa la validación" — siempre "gana" el nombre, incluso en
        // producción real esa parte de la regla `mimes` sí es por contenido
        // (`guessExtension()` con finfo real). Lo que sí se puede probar
        // acá: una extensión que NO está en la lista permitida se rechaza.
        $notAnImage = UploadedFile::fake()->create('documento.pdf', 100);

        $response = $this->post(route('products.store'), [
            'code' => 'SKU-FAKE-1',
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
            'name' => 'Producto de prueba',
            'price_without_tax' => 1000,
            'price_with_tax' => 1190,
            'sale_price' => 1190,
            'stock' => 10,
            'image' => $notAnImage,
        ]);

        $response->assertSessionHasErrors(['image']);
        $this->assertDatabaseMissing('products', ['code' => 'SKU-FAKE-1']);
    }

    public function test_an_oversized_image_is_rejected()
    {
        $this->actingUserWithPermission('Crear Productos');
        $category = Category::factory()->create();
        $supplier = Supplier::factory()->create();

        $oversized = UploadedFile::fake()->image('foto.jpg')->size(3000); // límite real: 2048 KB

        $response = $this->post(route('products.store'), [
            'code' => 'SKU-FAKE-2',
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
            'name' => 'Producto de prueba',
            'price_without_tax' => 1000,
            'price_with_tax' => 1190,
            'sale_price' => 1190,
            'stock' => 10,
            'image' => $oversized,
        ]);

        $response->assertSessionHasErrors(['image']);
    }

    public function test_a_valid_image_is_accepted()
    {
        Storage::fake('public');
        $this->actingUserWithPermission('Crear Productos');
        $category = Category::factory()->create();
        $supplier = Supplier::factory()->create();

        $realImage = UploadedFile::fake()->image('foto.jpg', 200, 200);

        $response = $this->post(route('products.store'), [
            'code' => 'SKU-REAL-1',
            'category_id' => $category->id,
            'supplier_id' => $supplier->id,
            'name' => 'Producto de prueba',
            'price_without_tax' => 1000,
            'price_with_tax' => 1190,
            'sale_price' => 1190,
            'stock' => 10,
            'image' => $realImage,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('products', ['code' => 'SKU-REAL-1']);
    }

    public function test_inventory_import_never_creates_products_from_a_disguised_binary()
    {
        $this->actingUserWithPermission('Crear Movimientos Inventario');

        $fakeCsv = UploadedFile::fake()->createWithContent('inventario.csv', "MZ\x90\x00\x03binario-no-es-un-csv-real");

        $response = $this->post(route('inventory-import.preview'), [
            'file' => $fakeCsv,
            'mode' => 'movements',
        ]);

        // CSV no tiene una firma binaria propia (a diferencia de una imagen
        // o un .xlsx) — la regla `mimes` de Laravel no puede distinguir
        // "CSV real" de "cualquier texto/binario con extensión .csv" solo
        // por contenido, así que este archivo sí pasa esa validación. Lo
        // que importa es que PhpSpreadsheet lo lee sin ejecutar nada ni
        // tronar el servidor, y que el resultado nunca se cuela como fila
        // válida — se confirma acá, no se asume.
        $response->assertOk();
        $response->assertJsonPath('summary.create_product', 0);
        $response->assertJsonPath('summary.update_stock', 0);
    }

    public function test_inventory_import_rejects_an_oversized_file()
    {
        $this->actingUserWithPermission('Crear Movimientos Inventario');

        $oversized = UploadedFile::fake()->create('inventario.csv', 6000); // límite real: 5120 KB

        $response = $this->post(route('inventory-import.preview'), [
            'file' => $oversized,
            'mode' => 'movements',
        ]);

        $response->assertSessionHasErrors(['file']);
    }
}
