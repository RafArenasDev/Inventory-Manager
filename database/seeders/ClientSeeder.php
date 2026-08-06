<?php
namespace Database\Seeders;

use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        // No existe un locale es_CO en fakerphp/faker (cae en inglés en
        // silencio); es_PE da nombres y apellidos latinoamericanos plausibles.
        $faker = \Faker\Factory::create('es_PE');

        $cities = City::with('department')->get();

        if ($cities->isEmpty()) {
            \Log::warning('No hay ciudades disponibles; se omite ClientSeeder. Ejecuta primero DepartmentCitySeeder.');
            return;
        }

        $documentTypes = ['CC', 'CC', 'CC', 'CC', 'CE', 'NIT', 'TI'];
        $usedDocuments = [];

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
                'document_type'       => $documentType,
                'document_number'     => $documentNumber,
                'verification_digit'  => $documentType === 'NIT' ? $faker->numberBetween(0, 9) : null,
                'name'                => $name,
                'department_id'       => $city->department_id,
                'city_id'             => $city->id,
                'phone'               => $faker->optional(0.4)->numerify('60#-#######'),
                'cellphone'           => $faker->numerify('3##-#######'),
                'address'             => $faker->streetAddress(),
                'email'               => $faker->unique()->safeEmail(),
                'is_active'           => $faker->boolean(92),
            ]);
        }
    }
}
