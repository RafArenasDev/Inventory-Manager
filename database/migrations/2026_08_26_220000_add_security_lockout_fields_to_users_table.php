<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Incremental a propósito (no se editó la migración original de
     * `users`): esa tabla ya existe en producción (Render), así que un
     * `Schema::create` editado ahí nunca se aplicaría — Laravel solo
     * corre migraciones nuevas, no vuelve a diffear una ya marcada como
     * ejecutada. En local, `migrate:fresh --seed` sigue siendo la forma
     * de recrear todo desde cero.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Contador persistente de intentos fallidos de login (no se
            // resetea con la ventana del RateLimiter en caché) — dirige la
            // espera progresiva y, al llegar al tope, el bloqueo duro de abajo.
            $table->unsignedTinyInteger('failed_login_attempts')->default(0);
            // Bloqueo duro tras un ataque sostenido: mientras esté seteado,
            // el login se rechaza aunque la contraseña sea correcta — solo
            // se libera restableciendo la contraseña por correo.
            $table->timestamp('security_locked_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['failed_login_attempts', 'security_locked_at']);
        });
    }
};
