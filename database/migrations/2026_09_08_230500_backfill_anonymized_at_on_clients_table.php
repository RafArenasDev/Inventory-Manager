<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Antes de esta migración, anonymize() solo cambiaba el nombre a
 * "Cliente Anonimizado #ID" sin marcar ningún flag — los clientes ya
 * anonimizados con ese patrón se detectan por nombre una sola vez acá y se
 * les asigna el nuevo flag `anonymized_at` (y se les normaliza el nombre al
 * formato sin número), para que el bloqueo total de edición/eliminación/
 * reactivación aplique también retroactivamente sobre ellos.
 */
return new class extends Migration
{
    public function up(): void
    {
        // CURRENT_TIMESTAMP en vez de NOW(): NOW() no existe en SQLite (usado
        // por las pruebas automatizadas — ver phpunit.xml), CURRENT_TIMESTAMP
        // sí es portable entre MySQL/Postgres/SQLite.
        DB::table('clients')
            ->where('name', 'like', 'Cliente Anonimizado #%')
            ->whereNull('anonymized_at')
            ->update([
                'name' => 'Cliente Anonimizado',
                'anonymized_at' => DB::raw('COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)'),
            ]);
    }

    public function down(): void
    {
        // Backfill de datos, no de esquema — no hay nada que revertir de
        // forma segura (no se puede recuperar el # original del nombre).
    }
};
