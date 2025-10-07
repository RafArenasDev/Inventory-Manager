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
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->date('register_date')->unique(); // Una caja por día

            // Usuarios que abren y cierran
            $table->foreignId('opened_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('closed_by')->nullable()->constrained('users')->onDelete('restrict');

                                                              // Montos
            $table->bigInteger('opening_amount')->default(0); // Monto con el que se abre
            $table->bigInteger('closing_amount')->nullable(); // Monto con el que se cierra
            $table->bigInteger('total_sales')->default(0);    // Total ventas del día
            $table->bigInteger('total_income')->default(0);   // Total otros ingresos
            $table->bigInteger('total_expenses')->default(0); // Total gastos del día
            $table->bigInteger('difference')->nullable();     // Diferencia (sobrante/faltante)

            // Fechas y horas
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->boolean('is_closed')->default(false);

            // Notas
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('register_date');
            $table->index('is_closed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_registers');
    }
};
