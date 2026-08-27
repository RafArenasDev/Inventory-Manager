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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->onDelete('restrict');
            $table->foreignId('requested_by')->nullable()->constrained('users')->onDelete('set null');
            // Sin estados de tránsito a propósito (decisión del cliente: no
            // quiere trazabilidad de transportadora ni integraciones de
            // courier) — Solicitado hasta que llegue el stock, o Cancelado.
            $table->enum('status', ['Solicitado', 'Recibido', 'Cancelado'])->default('Solicitado');
            $table->text('notes')->nullable();
            $table->date('expected_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->onDelete('set null');
            // Fija en la creación (no se recalcula al editar): si algún ítem
            // pedido estaba en alerta de stock bajo en ese momento, es un
            // pedido "por alertas" — el selector de productos de ese pedido
            // (crear y editar) solo ofrece productos en alerta. Uno "normal"
            // solo ofrece productos sin alerta. Mantiene los dos carriles
            // separados: alertas para reponer lo que falta, normal para
            // pedir más de algo que ya está bien.
            $table->boolean('is_low_stock_order')->default(false);
            // Quién hizo el último cambio de productos/notas/proveedor vía
            // "Editar Pedido" — separado de requested_by (quién lo creó) y
            // received_by (quién lo recibió). Null si nunca se editó.
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('restrict');
            $table->integer('quantity_requested');
            $table->integer('quantity_received')->default(0);
            $table->bigInteger('unit_cost')->nullable(); // centavos, igual que Product
            $table->timestamps();
        });

        // Enlaza el movimiento de Entrada que recibió (total o parcialmente)
        // un Pedido, para poder sumar a quantity_received y cerrarlo solo.
        // Va aquí (no editando la migración original de inventory_movements)
        // porque purchase_orders todavía no existía en esa fecha.
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->foreignId('purchase_order_id')->nullable()->after('supplier_id')
                ->constrained()->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('purchase_order_id');
        });

        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
    }
};
