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
        // opened_by/closed_by tenían onDelete('restrict') — un usuario con
        // historial de caja (así sea un solo turno) no se podía borrar nunca,
        // con un 500 sin manejar en vez de un aviso. Mismo problema y misma
        // solución que ya se usó para inventory_movements: snapshot del
        // nombre al momento del evento + FK en null en vez de bloquear.
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->string('opened_by_name')->nullable()->after('opened_by');
            $table->string('closed_by_name')->nullable()->after('closed_by');
        });

        // Backfill retroactivo — los usuarios referenciados todavía existen
        // en este momento (si ya se hubieran borrado, la fila ni existiría,
        // por la restricción que se está reemplazando acá mismo).
        DB::table('cash_registers')->orderBy('id')->chunkById(200, function ($registers) {
            foreach ($registers as $register) {
                $updates = [];

                if ($register->opened_by) {
                    $name = DB::table('users')->where('id', $register->opened_by)->value('name');
                    if ($name) {
                        $updates['opened_by_name'] = $name;
                    }
                }

                if ($register->closed_by) {
                    $name = DB::table('users')->where('id', $register->closed_by)->value('name');
                    if ($name) {
                        $updates['closed_by_name'] = $name;
                    }
                }

                if ($updates) {
                    DB::table('cash_registers')->where('id', $register->id)->update($updates);
                }
            }
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropForeign(['opened_by']);
            $table->dropForeign(['closed_by']);
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->unsignedBigInteger('opened_by')->nullable()->change();
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->foreign('opened_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('closed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropForeign(['opened_by']);
            $table->dropForeign(['closed_by']);
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->unsignedBigInteger('opened_by')->nullable(false)->change();
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->foreign('opened_by')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('closed_by')->references('id')->on('users')->restrictOnDelete();
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropColumn(['opened_by_name', 'closed_by_name']);
        });
    }
};
