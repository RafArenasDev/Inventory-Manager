<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'is_active' => true,
            // Sin esto, cualquier feature test que navegue más allá del
            // login queda atrapado en el redirect de EnsureTermsAccepted —
            // un usuario de prueba "normal" debe estar ya al día por
            // default; usar unacceptedTerms() para el caso contrario.
            'terms_accepted_at' => now(),
            'terms_version' => config('legal.terms_version'),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Usuario que aún no ha aceptado los Términos vigentes — para probar el
     * gate de EnsureTermsAccepted en sí mismo.
     */
    public function unacceptedTerms(): static
    {
        return $this->state(fn (array $attributes) => [
            'terms_accepted_at' => null,
            'terms_version' => null,
        ]);
    }
}
