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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();

            $table->bigInteger('price_without_tax')->default(0); // Precio sinIVA
            $table->bigInteger('price_with_tax')->default(0);    // Precio con IVA
            $table->bigInteger('sale_price')->default(0);        // Precio venta
            $table->bigInteger('iva_value')->default(0);         // Valor IVA

            $table->string('supplier')->nullable();
            $table->integer('stock')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
