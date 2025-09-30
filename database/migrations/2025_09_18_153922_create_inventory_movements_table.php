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
            $table->foreignId('supplier_id')->nullable()->constrained()->onDelete('set null');
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
