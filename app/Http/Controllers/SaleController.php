<?php
namespace App\Http\Controllers;

use App\Http\Requests\SaleRequest;
use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $totalCount = Sale::count();
        $salesQuery = Sale::with('items.product', 'client.department', 'client.city', 'user')->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $salesQuery->where(function ($query) use ($search) {
                $query->whereHas('client', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('document_number', 'like', "%{$search}%");
                })->orWhere('id', 'like', "%{$search}%")
                    ->orWhere('invoice_number', 'like', "%{$search}%");
            });
        }

        $filteredCount = $salesQuery->count();
        $perPage       = (int) ($request->per_page ?? 10);

        // Obtener departamentos y ciudades para el formulario
        $departments = Department::all()->map(fn($dept) => ['id' => $dept->id, 'name' => $dept->name]);
        $cities      = City::all()->map(fn($city) => ['id' => $city->id, 'name' => $city->name, 'department_id' => $city->department_id]);

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
            'clients'       => Client::with(['department', 'city'])
                ->select('id', 'name', 'document_type', 'document_number', 'verification_digit', 'email', 'phone', 'cellphone', 'address', 'department_id', 'city_id')
                ->get()
                ->map(function ($client) {
                    return [
                        'id'                 => $client->id,
                        'name'               => $client->name,
                        'document_type'      => $client->document_type,
                        'document_number'    => $client->document_number,
                        'verification_digit' => $client->verification_digit,
                        'email'              => $client->email,
                        'phone'              => $client->phone,
                        'cellphone'          => $client->cellphone,
                        'address'            => $client->address,
                        'department_id'      => $client->department_id,
                        'department'         => $client->department ? $client->department->name : null,
                        'city_id'            => $client->city_id,
                        'city'               => $client->city ? $client->city->name : null,
                    ];
                }),
            'departments'   => $departments,
            'cities'        => $cities,
        ]);
    }

    public function create()
    {
        return Inertia::render('sales/create');
    }

    protected function transformSale($sale)
    {
        return [
            'id'                  => $sale->id,
            'invoice_number'      => $sale->invoice_number,
            'client'              => $sale->client ? [
                'id'                 => $sale->client->id,
                'name'               => $sale->client->name,
                'document_type'      => $sale->client->document_type,
                'document_number'    => $sale->client->document_number,
                'verification_digit' => $sale->client->verification_digit,
                'department_id'      => $sale->client->department_id,
                'department'         => $sale->client->department ? $sale->client->department->name : null,
                'city_id'            => $sale->client->city_id,
                'city'               => $sale->client->city ? $sale->client->city->name : null,
                'email'              => $sale->client->email,
                'phone'              => $sale->client->phone,
                'cellphone'          => $sale->client->cellphone,
                'address'            => $sale->client->address,
            ] : null,
            'user'                => [
                'id'   => $sale->user->id,
                'name' => $sale->user->name,
            ],
            'sale_date'           => $sale->sale_date->format('Y-m-d'),
            'sale_time'           => Carbon::parse($sale->sale_time)->format('h:i:s A'),
            'total_without_tax'   => $sale->total_without_tax / 100,
            'total_with_discount' => $sale->total_with_discount / 100,
            'discount'            => $sale->discount / 100,
            'total_paid'          => $sale->total_paid / 100,
            'payment_method'      => $sale->payment_method,
            'notes'               => $sale->notes,
            'public_invoice_url'  => $sale->public_invoice_url,
            'is_cancelled'        => $sale->is_cancelled,
            'items'               => $sale->items->map(function ($item) {
                return [
                    'id'            => $item->id,
                    'product_id'    => $item->product_id,
                    'product_name'  => $item->product->name,
                    'product_code'  => $item->product->code,
                    'quantity'      => $item->quantity,
                    'price_at_sale' => $item->price_at_sale / 100,
                    'subtotal'      => $item->subtotal / 100,
                ];
            }),
        ];
    }

    public function store(SaleRequest $request): RedirectResponse
    {
        try {
            $validated     = $request->validated();
            $invoiceNumber = Sale::generateInvoiceNumber();

            $validated['discount']            = (int) ($validated['discount'] * 100);
            $validated['total_without_tax']   = (int) ($validated['total_without_tax'] * 100);
            $validated['total_with_discount'] = (int) ($validated['total_with_discount'] * 100);
            $validated['total_paid']          = (int) ($validated['total_paid'] * 100);

            $sale = DB::transaction(function () use ($validated, $invoiceNumber) {
                $sale = Sale::create([
                    'invoice_number'      => $invoiceNumber,
                    'client_id'           => $validated['client_id'],
                    'user_id'             => auth()->id(),
                    'sale_date'           => $validated['sale_date'],
                    'sale_time'           => $validated['sale_time'],
                    'discount'            => $validated['discount'],
                    'payment_method'      => $validated['payment_method'],
                    'notes'               => $validated['notes'] ?? null,
                    'total_without_tax'   => $validated['total_without_tax'],
                    'total_with_discount' => $validated['total_with_discount'],
                    'total_paid'          => $validated['total_paid'],
                    'is_cancelled'        => false,
                ]);

                foreach ($validated['items'] as $item) {
                    SaleItem::create([
                        'sale_id'       => $sale->id,
                        'product_id'    => $item['product_id'],
                        'quantity'      => $item['quantity'],
                        'price_at_sale' => $item['price_at_sale'],
                        'subtotal'      => $item['subtotal'],
                    ]);

                    $product = Product::findOrFail($item['product_id']);
                    $product->stock -= $item['quantity'];
                    $product->save();

                    InventoryMovement::create([
                        'product_id'  => $item['product_id'],
                        'type'        => 'Salida',
                        'quantity'    => $item['quantity'],
                        'date'        => now(),
                        'notes'       => 'Venta ' . $invoiceNumber,
                        'supplier_id' => $product->supplier_id,
                    ]);
                }

                return $sale;
            });

            $sale->load('items.product', 'client.department', 'client.city', 'user');
            $pdf       = Pdf::loadView('sales.invoice', ['sale' => $sale]);
            $publicUrl = $this->savePdfPublicly($sale, $pdf);

            $sale->public_invoice_url = $publicUrl;
            $sale->save();

            return redirect()->route('sales.index')->with(['success' => 'Venta creada correctamente.', 'invoice_url' => $publicUrl]);
        } catch (\Exception $e) {
            Log::error('Error creating sale: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al crear la venta: ' . $e->getMessage()]);
        }
    }

    public function cancel(Sale $sale): RedirectResponse
    {
        if ($sale->is_cancelled) {
            return redirect()->route('sales.index')->with('error', 'La venta ya está anulada.');
        }

        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $item) {
                $product = Product::findOrFail($item->product_id);
                $product->stock += $item->quantity;
                $product->save();

                InventoryMovement::create([
                    'product_id'  => $item->product_id,
                    'type'        => 'Ajuste Inventario',
                    'quantity'    => $item->quantity,
                    'date'        => now(),
                    'notes'       => 'Anulación de Venta ' . $sale->invoice_number,
                    'supplier_id' => $product->supplier_id,
                ]);
            }

            $sale->is_cancelled = true;
            $sale->save();
        });

        return redirect()->route('sales.index')->with('success', 'Venta anulada correctamente.');
    }

    public function show(Sale $sale)
    {
        $sale->load('items.product', 'client.department', 'client.city', 'user');
        return Inertia::render('sales/show', [
            'sale' => $this->transformSale($sale),
        ]);
    }

    public function generatePdf(Sale $sale): Response
    {
        $sale->load('items.product', 'client.department', 'client.city', 'user');
        $pdf = Pdf::loadView('sales.invoice', ['sale' => $sale])
            ->setOptions(['defaultFont' => 'Helvetica']);
        return $pdf->download('recibo_' . $sale->invoice_number . '.pdf');
    }

    public function getClientByDocument(Request $request)
    {
        $client = Client::with(['department', 'city'])->where('document_number', $request->document_number)->first();
        if ($client) {
            return response()->json([
                'id'                 => $client->id,
                'name'               => $client->name,
                'document_type'      => $client->document_type,
                'document_number'    => $client->document_number,
                'verification_digit' => $client->verification_digit,
                'email'              => $client->email,
                'phone'              => $client->phone,
                'cellphone'          => $client->cellphone,
                'address'            => $client->address,
                'department_id'      => $client->department_id,
                'department'         => $client->department ? $client->department->name : null,
                'city_id'            => $client->city_id,
                'city'               => $client->city ? $client->city->name : null,
            ]);
        }
        return response()->json(null);
    }

    public function getProductByCode(Request $request)
    {
        $product = Product::where('code', $request->code)->first();
        return response()->json($product);
    }

    protected function savePdfPublicly(Sale $sale, $pdf): string
    {
        $year     = Carbon::parse($sale->sale_date)->year;
        $month    = Carbon::parse($sale->sale_date)->format('m');
        $fileName = 'recibo_' . $sale->invoice_number . '.pdf';
        $fullPath = 'invoices/' . $year . '/' . $month . '/' . $fileName;

        // Guardar en storage público
        Storage::disk('public')->put($fullPath, $pdf->output());

        // Guardar en Documents del usuario
        $localPath = 'C:/Users/usuario/Documents/' . $fileName;
        file_put_contents($localPath, $pdf->output());

        return Storage::url($fullPath);
    }

}
