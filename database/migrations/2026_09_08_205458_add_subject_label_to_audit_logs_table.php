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
        Schema::table('audit_logs', function (Blueprint $table) {
            // Descripción legible del registro afectado, calculada al momento
            // del log (ej. "Venta A-000003", "Cliente Juan Pérez — CC 123456")
            // — no una FK ni un lookup en vivo, para que siga siendo legible
            // aunque el registro original se elimine o cambie después.
            $table->string('subject_label')->nullable()->after('subject_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn('subject_label');
        });
    }
};
