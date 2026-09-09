<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $priceWithoutTax = fake()->numberBetween(1000, 100000);
        $ivaValue = (int) round($priceWithoutTax * 0.19);

        return [
            'code' => fake()->unique()->bothify('SKU-####??'),
            'category_id' => Category::factory(),
            'supplier_id' => Supplier::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'price_without_tax' => $priceWithoutTax,
            'price_with_tax' => $priceWithoutTax + $ivaValue,
            'sale_price' => $priceWithoutTax + $ivaValue,
            'iva_value' => $ivaValue,
            'stock' => fake()->numberBetween(0, 200),
        ];
    }
}
