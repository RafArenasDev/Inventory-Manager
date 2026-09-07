<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            // Snapshot del producto al momento del movimiento — `product_id`
            // no tiene FK real (ver migración original), así que si el
            // producto se elimina más adelante, el historial de movimientos
            // sigue siendo legible en vez de mostrar un hueco o romper la
            // página con un `null->name`.
            $table->string('product_code')->nullable()->after('product_id');
            $table->string('product_name')->nullable()->after('product_code');
            $table->timestamp('product_deleted_at')->nullable()->after('product_name');
        });

        // Poblar retroactivamente los movimientos ya existentes — sus
        // productos todavía existen en este momento. Iterado en PHP (no un
        // UPDATE...JOIN) para ser portable entre MySQL/Postgres/SQLite por
        // igual, ya que cada motor lo expresa distinto.
        DB::table('inventory_movements')->whereNull('product_code')->orderBy('id')
            ->chunkById(200, function ($movements) {
                foreach ($movements as $movement) {
                    $product = DB::table('products')->find($movement->product_id);
                    if ($product) {
                        DB::table('inventory_movements')->where('id', $movement->id)->update([
                            'product_code' => $product->code,
                            'product_name' => $product->name,
                        ]);
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropColumn(['product_code', 'product_name', 'product_deleted_at']);
        });
    }
};
