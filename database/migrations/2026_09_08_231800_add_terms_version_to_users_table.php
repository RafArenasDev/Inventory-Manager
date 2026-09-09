<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Complementa terms_accepted_at: guarda QUÉ versión del texto aceptó el
 * usuario. Si el desarrollador cambia el contenido de los Términos y sube
 * config('legal.terms_version'), todo usuario cuyo terms_version guardado no
 * coincida vuelve a ver el paso de aceptación en su próximo request — sin
 * importar navegador, dispositivo, ni que ya hubiera aceptado una versión
 * anterior. Ver EnsureTermsAccepted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('terms_version')->nullable()->after('terms_accepted_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('terms_version');
        });
    }
};
