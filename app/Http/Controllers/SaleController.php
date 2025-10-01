<?php
namespace App\Http\Controllers;

use App\Http\Requests\SaleRequest;
use App\Models\Client;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use PDF;

// Assume barryvdh/laravel-dompdf installed

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $salesQuery = Sale::with('items', 'client', 'user')->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $salesQuery->where(function ($query) use ($search) {
                $query->whereHas('client', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%");
                })->orWhere('id', 'like', "%{$search}%");
            });
        }

        $totalCount    = $salesQuery->count();
        $filteredCount = $salesQuery->count();
        $perPage       = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allSales = $salesQuery->get()->map(function ($sale) {
                return $this->transformSale($sale);
            });

            $sales = [
                'data'     => $allSales,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
                'links'    => [],
            ];
        } else {
            $sales = $salesQuery->paginate($perPage)->withQueryString();
            $sales->getCollection()->transform(function ($sale) {
                return $this->transformSale($sale);
            });
        }

        return Inertia::render('sales/index', [
            'sales'         => $sales,
            'filters'       => $request->only(['search', 'per_page']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
            'products'      => Product::select('id', 'name', 'code', 'sale_price', 'stock')->get(),
            'clients'       => Client::select('id', 'name', 'document_type', 'document_number')->get(),
        ]);
    }

    protected function transformSale($sale)
    {
        return [
            'id'                => $sale->id,
            'client'            => $sale->client ? [
                'id'   => $sale->client->id,
                'name' => $sale->client->name,
            ] : null,
            'user'              => [
                'id'   => $sale->user->id,
                'name' => $sale->user->name,
            ],
            'sale_date'         => $sale->sale_date,
            'total_without_tax' => $sale->total_without_tax,
            'total_with_tax'    => $sale->total_with_tax,
            'discount'          => $sale->discount,
            'total_paid'        => $sale->total_paid,
            'payment_method'    => $sale->payment_method,
            'notes'             => $sale->notes,
            'items'             => $sale->items->map(function ($item) {
                return [
                    'id'            => $item->id,
                    'product_id'    => $item->product_id,
                    'quantity'      => $item->quantity,
                    'price_at_sale' => $item->price_at_sale,
                    'subtotal'      => $item->subtotal,
                    'item_discount' => $item->item_discount,
                ];
            })->toArray(),
        ];
    }

    public function create()
    {
        //
    }

    public function store(SaleRequest $request): RedirectResponse
    {
        $sale = DB::transaction(function () use ($request) {
            $sale = Sale::create($request->validated());

            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);
                SaleItem::create([
                    'sale_id'       => $sale->id,
                    'product_id'    => $product->id,
                    'quantity'      => $item['quantity'],
                    'price_at_sale' => $product->sale_price,
                    'subtotal'      => $item['quantity'] * $product->sale_price - ($item['item_discount'] ?? 0),
                    'item_discount' => $item['item_discount'] ?? 0,
                ]);

                InventoryMovement::create([
                    'product_id' => $product->id,
                    'type'       => 'Salida',
                    'quantity'   => -$item['quantity'],
                    'date'       => $sale->sale_date,
                    'notes'      => 'Venta ID: ' . $sale->id,
                ]);

                $product->stock -= $item['quantity'];
                $product->save();
            }

            return $sale;
        });

        return redirect()->route('sales.pdf', $sale->id)->with('success', 'Venta creada correctamente.');
    }

    public function show(Sale $sale)
    {
        $sale->load('items.product', 'client', 'user');
        return Inertia::render('sales/show', [
            'sale' => $this->transformSale($sale),
        ]);
    }

    public function generatePdf(Sale $sale)
    {
        $sale->load('items.product', 'client', 'user');
        $pdf = PDF::loadView('sales.invoice', ['sale' => $sale]);
        return $pdf->download('invoice_' . $sale->id . '.pdf');
    }
}
