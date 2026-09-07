<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(fn () => Password::min(12)->letters()->mixedCase()->numbers()->symbols());

        $this->registerUnaccentSearchMacros();
    }

    /**
     * whereLikeUnaccent/orWhereLikeUnaccent: búsqueda LIKE insensible a
     * mayúsculas Y a tildes ("portatil" encuentra "Portátil"), portable
     * entre MySQL/Postgres/SQLite vía REPLACE anidado — sin depender de
     * una extensión específica de motor como `unaccent` de Postgres.
     */
    private function registerUnaccentSearchMacros(): void
    {
        $normalize = function (string $expr) {
            $pairs = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n'];

            foreach ($pairs as $accented => $plain) {
                $expr = "REPLACE({$expr}, '{$accented}', '{$plain}')";
            }

            return "LOWER({$expr})";
        };

        Builder::macro('whereLikeUnaccent', function (string $column, string $value) use ($normalize) {
            /** @var Builder $this */
            return $this->whereRaw($normalize($column).' LIKE '.$normalize('?'), [$value]);
        });

        Builder::macro('orWhereLikeUnaccent', function (string $column, string $value) use ($normalize) {
            /** @var Builder $this */
            return $this->orWhereRaw($normalize($column).' LIKE '.$normalize('?'), [$value]);
        });
    }
}
