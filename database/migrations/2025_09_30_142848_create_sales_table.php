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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->nullable()->constrained('clients')->onDelete('set null');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->dateTime('sale_date');
            $table->bigInteger('total_without_tax')->default(0);
            $table->bigInteger('total_with_tax')->default(0);
            $table->bigInteger('discount')->default(0);
            $table->bigInteger('total_paid')->default(0);
            $table->enum('payment_method', ['Efectivo', 'Nequi']);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('sale_date');
            $table->index('client_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
