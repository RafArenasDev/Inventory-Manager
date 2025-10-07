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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_category_id')
                ->constrained('transaction_categories')
                ->onDelete('restrict');
            $table->foreignId('sale_id')
                ->nullable()
                ->constrained('sales')
                ->onDelete('cascade');
            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('restrict');
            $table->enum('type', ['Ingreso', 'Gasto']);
            $table->bigInteger('amount');
            $table->date('transaction_date');
            $table->time('transaction_time');
            $table->enum('payment_method', ['Efectivo', 'Nequi'])->default('Efectivo');
            $table->string('invoice_number')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['transaction_date', 'type']);
            $table->index(['transaction_category_id', 'type']);
            $table->index('sale_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
