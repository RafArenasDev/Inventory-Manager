<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Services\InvoicePdfService;
use Carbon\Carbon;
use Faker\Factory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SaleSeeder extends Seeder
{
    /**
     * Genera ventas históricas de los últimos ~90 días (≈3 meses) replicando
     * exactamente la lógica de SaleController@store (unidades de Sale en
     * centavos, ítems y transacciones en pesos) para que dashboard, caja y
     * finanzas muestren datos coherentes.
     *
     * Recorre día por día (no fechas aleatorias sueltas) con alta
     * probabilidad de tener al menos una venta cada día, para que ningún mes
     * dentro del rango quede en cero — si no, los % de crecimiento del
     * dashboard comparan contra 0 y saltan a valores sin sentido (-100%,
     * 1500%, etc.) que no sirven para evaluar si la fórmula funciona bien.
     * No hace falta que sea todos los días (un negocio real no vende parejo),
     * solo que no haya huecos de semanas/meses completos.
     *
     * Solo vende productos con stock > 3 al momento de cada venta: los
     * productos que ProductSeeder dejó deliberadamente en 0-2 (para probar
     * las alertas de inventario) no se tocan aquí.
     */
    public function run(): void
    {
        $faker = Factory::create('es_CO');

        $invoicePdfService = app(InvoicePdfService::class);
        $sellers = User::role(['admin', 'seller', 'cashier'])->get();
        $clients = Client::all();
        $salesCategory = TransactionCategory::where('name', 'Ventas')->first();

        if ($sellers->isEmpty() || ! $salesCategory) {
            \Log::warning('No hay usuarios vendedores o categoría "Ventas"; se omite SaleSeeder.');

            return;
        }

        $paymentMethods = ['Efectivo', 'Efectivo', 'Efectivo', 'Nequi'];
        $daysBack = 89;
        $saleIndex = 0;

        for ($daysAgo = $daysBack; $daysAgo >= 0; $daysAgo--) {
            $saleDate = Carbon::now()->subDays($daysAgo);

            // ~85% de los días el negocio vende algo; el resto queda en 0
            // a propósito (negocio real, no vende parejo todos los días).
            if (! $faker->boolean(85)) {
                continue;
            }

            $salesToday = $faker->numberBetween(1, 4);

            for ($j = 0; $j < $salesToday; $j++) {
                $saleTime = sprintf('%02d:%02d:%02d', $faker->numberBetween(8, 19), $faker->numberBetween(0, 59), $faker->numberBetween(0, 59));

                $availableProducts = Product::where('stock', '>', 3)->inRandomOrder()->limit($faker->numberBetween(1, 3))->get();

                if ($availableProducts->isEmpty()) {
                    continue;
                }

                $testClient = $clients->firstWhere('email', 'rafarenas.dev@gmail.com');
                $client = $saleIndex < 2 && $testClient
                    ? $testClient
                    : ($faker->boolean(65) ? $clients->random() : null);
                $seller = $sellers->random();
                $discountPercent = $faker->boolean(20) ? $faker->randomElement([5, 10, 15]) : 0;
                $saleIndex++;

                DB::transaction(function () use ($availableProducts, $client, $seller, $saleDate, $saleTime, $discountPercent, $salesCategory, $paymentMethods, $faker, $invoicePdfService) {
                    $invoiceNumber = Sale::generateInvoiceNumber();

                    $items = [];
                    $totalWithoutTax = 0;

                    foreach ($availableProducts as $product) {
                        $quantity = min($product->stock, $faker->numberBetween(1, 2));
                        if ($quantity < 1) {
                            continue;
                        }

                        $subtotal = $product->sale_price * $quantity;
                        $items[] = [
                            'product' => $product,
                            'quantity' => $quantity,
                            'price' => $product->sale_price,
                            'subtotal' => $subtotal,
                        ];
                        $totalWithoutTax += $subtotal;
                    }

                    if (empty($items)) {
                        return;
                    }

                    $discountAmount = (int) round($totalWithoutTax * ($discountPercent / 100));
                    $totalWithDiscount = $totalWithoutTax - $discountAmount;
                    $totalPaid = $totalWithDiscount;
                    $paymentMethod = $paymentMethods[array_rand($paymentMethods)];

                    $sale = Sale::create([
                        'invoice_number' => $invoiceNumber,
                        'client_id' => $client?->id,
                        'user_id' => $seller->id,
                        'sale_date' => $saleDate->toDateString(),
                        'sale_time' => $saleTime,
                        'discount' => $discountPercent * 100,
                        'payment_method' => $paymentMethod,
                        'notes' => null,
                        'total_without_tax' => $totalWithoutTax * 100,
                        'total_with_discount' => $totalWithDiscount * 100,
                        'total_paid' => $totalPaid * 100,
                        'is_cancelled' => false,
                    ]);

                    foreach ($items as $item) {
                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'product_id' => $item['product']->id,
                            'quantity' => $item['quantity'],
                            'price_at_sale' => $item['price'],
                            'subtotal' => $item['subtotal'],
                        ]);

                        $item['product']->decrement('stock', $item['quantity']);

                        InventoryMovement::create([
                            'product_id' => $item['product']->id,
                            'type' => 'Salida',
                            'quantity' => $item['quantity'],
                            'date' => $saleDate->toDateString(),
                            'notes' => 'Venta '.$invoiceNumber,
                            'supplier_id' => $item['product']->supplier_id,
                        ]);
                    }

                    $clientName = $client?->name ?? 'Cliente varios';

                    Transaction::create([
                        'user_id' => $seller->id,
                        'type' => 'Ingreso',
                        'transaction_category_id' => $salesCategory->id,
                        'amount' => $totalPaid,
                        'transaction_date' => $saleDate->toDateString(),
                        'transaction_time' => $saleTime,
                        'payment_method' => $paymentMethod,
                        'invoice_number' => $invoiceNumber,
                        'description' => 'Cliente: '.$clientName,
                        'notes' => 'Transacción automática generada por venta: '.$invoiceNumber,
                        'sale_id' => $sale->id,
                    ]);

                    $invoicePdfService->generateAndStore($sale);
                });
            }
        }
    }
}
