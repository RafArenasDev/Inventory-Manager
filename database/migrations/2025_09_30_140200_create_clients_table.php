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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->enum('document_type', ['CC', 'TI', 'CE', 'NIT', 'Pasaporte']);
            $table->unsignedBigInteger('document_number');
            $table->tinyInteger('verification_digit')->nullable();
            $table->string('name');
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('city_id')->nullable();
            $table->string('phone')->nullable();
            $table->string('cellphone')->nullable();
            $table->text('address')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['document_type', 'document_number']);
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
            $table->foreign('city_id')->references('id')->on('cities')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
