<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;

class DepartmentCitySeeder extends Seeder
{
    public function run()
    {
        // Fetch departments
        $response = Http::get('https://api-colombia.com/api/v1/Department');
        if ($response->successful()) {
            $departments = $response->json();

            foreach ($departments as $dept) {
                $department = Department::create([
                    'id' => $dept['id'],
                    'name' => $dept['name'],
                ]);

                // Fetch cities for each department
                $cityResponse = Http::get("https://api-colombia.com/api/v1/Department/{$dept['id']}/cities");
                if ($cityResponse->successful()) {
                    $cities = $cityResponse->json();
                    foreach ($cities as $city) {
                        City::create([
                            'id' => $city['id'],
                            'name' => $city['name'],
                            'department_id' => $department->id,
                        ]);
                    }
                }
            }
        } else {
            // Fallback data
            $fallbackDepartments = [
                ['id' => 3, 'name' => 'Arauca'],
                ['id' => 4, 'name' => 'Atlántico'],
                ['id' => 5, 'name' => 'Bogotá'],
            ];

            foreach ($fallbackDepartments as $dept) {
                Department::create($dept);
            }
        }
    }
}
