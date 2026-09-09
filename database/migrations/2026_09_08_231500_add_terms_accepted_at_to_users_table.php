<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // null = todavía no aceptó los Términos y Condiciones vigentes —
            // se le exige aceptarlos justo después de autenticarse (ver
            // middleware EnsureTermsAccepted) antes de entrar al resto de la
            // app. Deliberadamente nadie queda pre-aceptado al desplegar
            // esta columna: todo usuario existente pasa por el flujo en su
            // próximo login.
            $table->timestamp('terms_accepted_at')->nullable()->after('must_change_password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('terms_accepted_at');
        });
    }
};
