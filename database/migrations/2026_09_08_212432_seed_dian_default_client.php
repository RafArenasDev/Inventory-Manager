<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Cliente genérico recomendado por la DIAN para facturación electrónica
     * cuando el comprador no quiere dar sus datos (documento 222222222222,
     * "Consumidor Final"). Con el módulo de Clientes ahora exigiendo
     * departamento/ciudad/dirección/celular/email en toda creación, este
     * registro precargado es la salida para una venta de mostrador anónima
     * sin forzar a inventar datos reales de un tercero.
     */
    public function up(): void
    {
        if (DB::table('clients')->where('document_type', 'CC')->where('document_number', 222222222222)->exists()) {
            return;
        }

        $department = DB::table('departments')->where('name', 'ilike', '%bogot%')->first();
        $city = $department
            ? DB::table('cities')->where('department_id', $department->id)->where('name', 'ilike', '%bogot%')->first()
            : null;

        DB::table('clients')->insert([
            'document_type' => 'CC',
            'document_number' => 222222222222,
            'verification_digit' => null,
            'name' => 'Consumidor Final',
            'department_id' => $department?->id,
            'city_id' => $city?->id,
            'phone' => null,
            'cellphone' => '0000000000',
            'address' => 'No informa',
            'email' => 'consumidorfinal@noinforma.com',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('clients')->where('document_type', 'CC')->where('document_number', 222222222222)->delete();
    }
};
