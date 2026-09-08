<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Client;
use Faker\Factory;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        // No existe un locale es_CO en fakerphp/faker (cae en inglés en
        // silencio); es_PE da nombres y apellidos latinoamericanos plausibles.
        $faker = Factory::create('es_PE');

        $cities = City::with('department')->get();

        if ($cities->isEmpty()) {
            \Log::warning('No hay ciudades disponibles; se omite ClientSeeder. Ejecuta primero DepartmentCitySeeder.');

            return;
        }

        // Cliente genérico recomendado por la DIAN para facturación electrónica
        // cuando el comprador no da sus datos (documento 222222222222). También
        // existe como migración (2026_09_08_212432_seed_dian_default_client) para
        // que quede garantizado en producción, donde los seeders no corren en cada
        // deploy — pero esa migración corre ANTES que este seeder en un
        // `migrate:fresh --seed` local, cuando `departments`/`cities` todavía están
        // vacías, así que acá se usa updateOrCreate para completar/corregir el
        // departamento y la ciudad una vez que sí existen.
        $bogota = $cities->first(fn ($city) => str_contains(mb_strtolower($city->name), 'bogot'));
        Client::updateOrCreate(
            ['document_type' => 'CC', 'document_number' => 222222222222],
            [
                'verification_digit' => null,
                'name' => 'Consumidor Final',
                'department_id' => $bogota?->department_id,
                'city_id' => $bogota?->id,
                'phone' => null,
                'cellphone' => '0000000000',
                'address' => 'No informa',
                'email' => 'consumidorfinal@noinforma.com',
                'is_active' => true,
            ]
        );

        $documentTypes = ['CC', 'CC', 'CC', 'CC', 'CE', 'NIT', 'TI'];
        $usedDocuments = [];

        // Cliente de prueba real (para validar envío de factura por WhatsApp/email
        // con datos reales). Nombre distinto al usuario admin homónimo a propósito:
        // el email es único en `users`, pero `clients` no valida unicidad de email.
        Client::create([
            'document_type' => 'CC',
            'document_number' => 1000000001,
            'verification_digit' => null,
            'name' => 'Rafa Arenas (Cliente Demo)',
            'department_id' => $cities->first()->department_id,
            'city_id' => $cities->first()->id,
            'phone' => null,
            'cellphone' => '3132653515',
            'address' => 'Dirección de prueba',
            'email' => 'rafarenas.dev@gmail.com',
            'is_active' => true,
        ]);

        for ($i = 0; $i < 25; $i++) {
            $city = $cities->random();
            $documentType = $documentTypes[array_rand($documentTypes)];

            do {
                $documentNumber = $documentType === 'NIT'
                    ? $faker->numberBetween(800000000, 901999999)
                    : $faker->numberBetween(1000000, 1200000000);
            } while (in_array($documentNumber, $usedDocuments));
            $usedDocuments[] = $documentNumber;

            $name = $documentType === 'NIT'
                ? $faker->company()
                : $faker->name();

            Client::create([
                'document_type' => $documentType,
                'document_number' => $documentNumber,
                'verification_digit' => $documentType === 'NIT' ? $faker->numberBetween(0, 9) : null,
                'name' => $name,
                'department_id' => $city->department_id,
                'city_id' => $city->id,
                'phone' => $faker->optional(0.4)->numerify('60#-#######'),
                'cellphone' => $faker->numerify('3##-#######'),
                'address' => $faker->streetAddress(),
                'email' => $faker->unique()->safeEmail(),
                'is_active' => $faker->boolean(92),
            ]);
        }
    }
}
