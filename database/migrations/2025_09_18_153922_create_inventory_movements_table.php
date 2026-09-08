<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            // Snapshot del producto al momento del movimiento — `product_id`
            // no tiene FK real (a propósito), así que si el producto se
            // elimina más adelante, el historial de movimientos sigue siendo
            // legible en vez de mostrar un hueco o romper la página con un
            // `null->name`.
            $table->string('product_code')->nullable();
            $table->string('product_name')->nullable();
            $table->timestamp('product_deleted_at')->nullable();
            $table->foreignId('supplier_id')->nullable()->constrained()->onDelete('set null');
            // "Ajuste Inventario" sigue cubriendo tanto subir como bajar
            // stock manualmente (con cantidad negativa para bajar, como
            // siempre) — "Baja por Eliminacion" es el único tipo nuevo,
            // exclusivo para el descargo de stock cuando se borra un
            // producto, y esa cantidad sí es siempre positiva.
            $table->enum('type', [
                'Entrada',
                'Salida',
                'Devolucion Cliente',
                'Devolucion Proveedor',
                'Consignacion Entrada',
                'Consignacion Salida',
                'Cambio Entrada',
                'Cambio Salida',
                'Ajuste Inventario',
                'Baja por Eliminacion',
            ]);
            $table->integer('quantity');
            $table->date('date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'type']);
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
