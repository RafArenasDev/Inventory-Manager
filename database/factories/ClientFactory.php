<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    protected $model = Client::class;

    public function definition(): array
    {
        return [
            'document_type' => 'CC',
            'document_number' => fake()->unique()->numberBetween(1000000, 99999999),
            'verification_digit' => null,
            'name' => fake()->name(),
            'department_id' => null,
            'city_id' => null,
            'phone' => fake()->numerify('60########'),
            'cellphone' => fake()->numerify('3##########'),
            'address' => fake()->address(),
            'email' => fake()->unique()->safeEmail(),
            'is_active' => true,
        ];
    }
}
