<?php

namespace Database\Factories;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Supplier>
 */
class SupplierFactory extends Factory
{
    protected $model = Supplier::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'representative' => fake()->name(),
            'nit_number' => fake()->unique()->numberBetween(100000000, 999999999),
            'nit_digit' => fake()->numberBetween(0, 9),
            'phone' => fake()->numerify('60########'),
            'cellphone' => fake()->numerify('3##########'),
            'address' => fake()->address(),
            'email' => fake()->unique()->safeEmail(),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
