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
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SaleSeeder extends Seeder
{
    /**
     * Genera ventas históricas de los últimos ~90 días replicando exactamente
     * la lógica de SaleController@store (unidades de Sale en centavos, ítems
     * y transacciones en pesos) para que dashboard, caja y finanzas muestren
     * datos coherentes.
     *
     * Solo vende productos con stock > 2 al momento de cada venta: los
     * productos que ProductSeeder dejó deliberadamente en 0-2 (para probar
     * las alertas de inventario) no se tocan aquí.
     */
    public function run(): void
    {
        $faker = \Faker\Factory::create('es_CO');

        $sellers = User::role(['admin', 'seller', 'cashier'])->get();
        $clients = Client::all();
        $salesCategory = TransactionCategory::where('name', 'Ventas')->first();

        if ($sellers->isEmpty() || ! $salesCategory) {
            \Log::warning('No hay usuarios vendedores o categoría "Ventas"; se omite SaleSeeder.');
            return;
        }

        $paymentMethods = ['Efectivo', 'Efectivo', 'Efectivo', 'Nequi'];
        $totalSales = 30;

        for ($i = 0; $i < $totalSales; $i++) {
            $saleDate = Carbon::now()->subDays($faker->numberBetween(0, 88));
            $saleTime = sprintf('%02d:%02d:%02d', $faker->numberBetween(8, 19), $faker->numberBetween(0, 59), $faker->numberBetween(0, 59));

            $availableProducts = Product::where('stock', '>', 9)->inRandomOrder()->limit($faker->numberBetween(1, 3))->get();

            if ($availableProducts->isEmpty()) {
                continue;
            }

            $client = $faker->boolean(65) ? $clients->random() : null;
            $seller = $sellers->random();
            $discountPercent = $faker->boolean(20) ? $faker->randomElement([5, 10, 15]) : 0;

            DB::transaction(function () use ($availableProducts, $client, $seller, $saleDate, $saleTime, $discountPercent, $salesCategory, $paymentMethods, $faker) {
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
                        'product'   => $product,
                        'quantity'  => $quantity,
                        'price'     => $product->sale_price,
                        'subtotal'  => $subtotal,
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
                    'invoice_number'      => $invoiceNumber,
                    'client_id'           => $client?->id,
                    'user_id'             => $seller->id,
                    'sale_date'           => $saleDate->toDateString(),
                    'sale_time'           => $saleTime,
                    'discount'            => $discountPercent * 100,
                    'payment_method'      => $paymentMethod,
                    'notes'               => null,
                    'total_without_tax'   => $totalWithoutTax * 100,
                    'total_with_discount' => $totalWithDiscount * 100,
                    'total_paid'          => $totalPaid * 100,
                    'is_cancelled'        => false,
                ]);

                foreach ($items as $item) {
                    SaleItem::create([
                        'sale_id'       => $sale->id,
                        'product_id'    => $item['product']->id,
                        'quantity'      => $item['quantity'],
                        'price_at_sale' => $item['price'],
                        'subtotal'      => $item['subtotal'],
                    ]);

                    $item['product']->decrement('stock', $item['quantity']);

                    InventoryMovement::create([
                        'product_id'  => $item['product']->id,
                        'type'        => 'Salida',
                        'quantity'    => $item['quantity'],
                        'date'        => $saleDate->toDateString(),
                        'notes'       => 'Venta ' . $invoiceNumber,
                        'supplier_id' => $item['product']->supplier_id,
                    ]);
                }

                $clientName = $client?->name ?? 'Cliente varios';

                Transaction::create([
                    'user_id'                 => $seller->id,
                    'type'                    => 'Ingreso',
                    'transaction_category_id' => $salesCategory->id,
                    'amount'                  => $totalPaid,
                    'transaction_date'        => $saleDate->toDateString(),
                    'transaction_time'        => $saleTime,
                    'payment_method'          => $paymentMethod,
                    'invoice_number'          => $invoiceNumber,
                    'description'             => 'Cliente: ' . $clientName,
                    'notes'                   => 'Transacción automática generada por venta: ' . $invoiceNumber,
                    'sale_id'                 => $sale->id,
                ]);
            });
        }
    }
}
