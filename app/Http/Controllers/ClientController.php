<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClientRequest;
use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $clientsQuery = Client::with(['department', 'city'])->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $clientsQuery->where(function ($query) use ($search) {
                $query->whereLike('name', "%{$search}%")
                    ->orWhereLike('document_number', "%{$search}%");
            });
        }

        $totalCount = $clientsQuery->count();
        $filteredCount = $clientsQuery->count();
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $clients = $clientsQuery->paginate($perPage)->withQueryString();
        $clients->getCollection()->transform(function ($client) {
            return [
                'id' => $client->id,
                'document_type' => $client->document_type,
                'document_number' => $client->document_number,
                'verification_digit' => $client->verification_digit,
                'name' => $client->name,
                'department_id' => $client->department_id,
                'department' => $client->department?->name,
                'city_id' => $client->city_id,
                'city' => $client->city?->name,
                'phone' => $client->phone,
                'cellphone' => $client->cellphone,
                'address' => $client->address,
                'email' => $client->email,
                'is_active' => $client->is_active,
                'created_at' => $client->created_at->format('Y-m-d H:i:s'),
            ];
        });
        $clients = $clients->toArray();

        $departments = Department::all()->map(fn ($dept) => ['id' => $dept->id, 'name' => $dept->name]);
        $cities = City::all()->map(fn ($city) => ['id' => $city->id, 'name' => $city->name, 'department_id' => $city->department_id]);

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'filters' => $request->only(['search', 'per_page']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
            'departments' => $departments,
            'cities' => $cities,
        ]);
    }

    public function store(ClientRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['document_number'] = in_array($data['document_type'], ['CC', 'TI', 'NIT']) ? (int) $data['document_number'] : $data['document_number'];
        Client::create($data);

        return redirect()->route('clients.index')->with('success', 'Cliente creado correctamente.');
    }

    public function quickStore(ClientRequest $request)
    {
        $validated = $request->validate([
            'document_type' => ['required', 'in:CC,TI,CE,Pasaporte,NIT'],
            'document_number' => ['required', 'string', 'unique:clients,document_number'],
            'verification_digit' => ['nullable', 'required_if:document_type,NIT', 'numeric'],
            'name' => ['required', 'string', 'max:255'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'city_id' => ['nullable', 'exists:cities,id'],
            'phone' => ['nullable', 'string'],
            'cellphone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'is_active' => ['boolean'],
        ]);

        $validated['document_number'] = in_array($validated['document_type'], ['CC', 'TI', 'NIT']) ? (int) $validated['document_number'] : $validated['document_number'];
        $client = Client::create($validated);

        // Cargar las relaciones para obtener los nombres
        $client->load(['department', 'city']);

        $response = [
            'id' => $client->id,
            'name' => $client->name,
            'document_type' => $client->document_type,
            'document_number' => $client->document_number,
            'verification_digit' => $client->verification_digit,
            'email' => $client->email,
            'phone' => $client->phone,
            'cellphone' => $client->cellphone,
            'address' => $client->address,
            'department_id' => $client->department_id,
            'department' => $client->department ? $client->department->name : null,
            'city_id' => $client->city_id,
            'city' => $client->city ? $client->city->name : null,
            'is_active' => $client->is_active,
        ];

        Log::info('Client Quick Created', ['client' => $response]);

        return response()->json($response);

    }

    public function update(ClientRequest $request, Client $client): RedirectResponse
    {
        $data = $request->validated();
        $data['document_number'] = in_array($data['document_type'], ['CC', 'TI', 'NIT']) ? (int) $data['document_number'] : $data['document_number'];
        $client->update($data);

        return redirect()->route('clients.index')->with('success', 'Cliente actualizado correctamente.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();

        return redirect()->route('clients.index')->with('success', 'Cliente eliminado correctamente.');
    }

    /**
     * Alternar el estado activo/inactivo del cliente.
     */
    public function toggleActive(Client $client): RedirectResponse
    {
        $client->update(['is_active' => ! $client->is_active]);

        return redirect()->back()->with(
            'success',
            $client->is_active ? 'Cliente activado correctamente.' : 'Cliente desactivado correctamente.'
        );
    }

    public function history(Client $client, Request $request)
    {
        try {
            $query = $client->sales()->with(['items' => function ($query) {
                $query->select('id', 'sale_id', 'product_id', 'quantity', 'price_at_sale', 'subtotal')
                    ->with('product:id,name,code');
            }]);

            if ($request->filled('start_date')) {
                $query->where('sale_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->where('sale_date', '<=', $request->end_date);
            }

            [$year, $month] = match (DB::connection()->getDriverName()) {
                'pgsql' => ['EXTRACT(YEAR FROM sale_date)::int', 'EXTRACT(MONTH FROM sale_date)::int'],
                'sqlite' => ["CAST(strftime('%Y', sale_date) AS INTEGER)", "CAST(strftime('%m', sale_date) AS INTEGER)"],
                default => ['YEAR(sale_date)', 'MONTH(sale_date)'],
            };

            $sales = $request->group_by === 'month' || $request->group_by === 'year'
                ? $query->selectRaw(
                    $request->group_by === 'month'
                        ? "{$year} as year, {$month} as month, COUNT(*) as count"
                        : "{$year} as year, COUNT(*) as count"
                )
                    ->groupBy($request->group_by === 'month' ? ['year', 'month'] : ['year'])
                    ->get()
                    ->map(function ($sale) {
                        return [
                            'year' => $sale->year,
                            'month' => $sale->month ?? null,
                            'count' => $sale->count,
                        ];
                    })
                : $query->get()->map(function ($sale) {
                    return [
                        'id' => $sale->id,
                        'sale_date' => $sale->sale_date,
                        'items' => $sale->items->map(function ($item) {
                            return [
                                'id' => $item->id,
                                'product_id' => $item->product_id,
                                'product_name' => $item->product->name ?? 'Producto no especificado',
                                'product_code' => $item->product->code ?? '-',
                                'quantity' => $item->quantity,
                                'unit_price' => $item->price_at_sale,
                                'total_price' => $item->subtotal,
                            ];
                        })->toArray(),
                        'total' => $sale->items->sum('subtotal'),
                    ];
                });

            Log::info('Client History Fetched', [
                'client_id' => $client->id,
                'sales' => $sales,
                'filters' => $request->only(['start_date', 'end_date', 'group_by']),
            ]);

            return response()->json([
                'client' => ['id' => $client->id, 'name' => $client->name],
                'sales' => $sales,
                'filters' => $request->only(['start_date', 'end_date', 'group_by']),
            ]);
        } catch (QueryException $e) {
            Log::error('Error fetching client history', [
                'client_id' => $client->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'client' => ['id' => $client->id, 'name' => $client->name],
                'sales' => [],
                'filters' => $request->only(['start_date', 'end_date', 'group_by']),
            ], 200);
        }
    }

    public function getCities($departmentId)
    {
        $cities = City::where('department_id', $departmentId)->get()->map(fn ($city) => ['id' => $city->id, 'name' => $city->name]);

        Log::info('Cities Response', ['department_id' => $departmentId, 'data' => $cities]);

        return response()->json($cities);
    }
}
