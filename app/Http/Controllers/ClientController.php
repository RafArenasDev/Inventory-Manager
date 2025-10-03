<?php
namespace App\Http\Controllers;

use App\Http\Requests\ClientRequest;
use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $clientsQuery = Client::orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $clientsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%");
            });
        }

        $totalCount    = $clientsQuery->count();
        $filteredCount = $clientsQuery->count();
        $perPage       = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allClients = $clientsQuery->get()->map(function ($client) {
                return [
                    'id'                 => $client->id,
                    'document_type'      => $client->document_type,
                    'document_number'    => $client->document_number,
                    'verification_digit' => $client->verification_digit,
                    'name'               => $client->name,
                    'phone'              => $client->phone,
                    'cellphone'          => $client->cellphone,
                    'address'            => $client->address,
                    'email'              => $client->email,
                    'is_active'          => $client->is_active,
                    'department_id'      => $client->department_id,
                    'city_id'            => $client->city_id,
                ];
            });

            Log::info('Clients Fetched (All)', ['clients' => $allClients]);

            $clients = [
                'data'     => $allClients,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
                'links'    => [],
            ];
        } else {
            $clients = $clientsQuery->paginate($perPage)->withQueryString()->toArray();
            Log::info('Clients Fetched (Paginated)', ['clients' => $clients]);
        }

        $departments = Department::all()->map(fn($dept) => ['id' => $dept->id, 'name' => $dept->name]);
        $cities      = City::all()->map(fn($city) => ['id' => $city->id, 'name' => $city->name, 'department_id' => $city->department_id]);

        return Inertia::render('clients/index', [
            'clients'       => $clients,
            'filters'       => $request->only(['search', 'per_page']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
            'departments'   => $departments,
            'cities'        => $cities,
        ]);
    }

    public function create()
    {
        $departments = Department::all()->map(fn($dept) => ['id' => $dept->id, 'name' => $dept->name]);
        $cities      = City::all()->map(fn($city) => ['id' => $city->id, 'name' => $city->name, 'department_id' => $city->department_id]);

        return Inertia::render('clients/index', [
            'showCreateForm' => true,
            'departments'    => $departments,
            'cities'         => $cities,
        ]);
    }

    public function store(ClientRequest $request): RedirectResponse
    {
        $data                    = $request->validated();
        $data['document_number'] = in_array($data['document_type'], ['CC', 'TI', 'NIT']) ? (int) $data['document_number'] : $data['document_number'];
        Client::create($data);
        return redirect()->route('clients.index')->with('success', 'Cliente creado correctamente.');
    }

    public function quickStore(ClientRequest $request)
    {
        $validated = $request->validate([
            'document_type'      => ['required', 'in:CC,TI,CE,Pasaporte,NIT'],
            'document_number'    => ['required', 'string', 'unique:clients,document_number'],
            'verification_digit' => ['nullable', 'required_if:document_type,NIT', 'numeric'],
            'name'               => ['required', 'string', 'max:255'],
            'department_id'      => ['nullable', 'exists:departments,id'],
            'city_id'            => ['nullable', 'exists:cities,id'],
            'phone'              => ['nullable', 'string'],
            'cellphone'          => ['nullable', 'string'],
            'address'            => ['nullable', 'string'],
            'email'              => ['nullable', 'email'],
            'is_active'          => ['boolean'],
        ]);

        $validated['document_number'] = in_array($validated['document_type'], ['CC', 'TI', 'NIT']) ? (int) $validated['document_number'] : $validated['document_number'];
        $client                       = Client::create($validated);

        // Cargar las relaciones para obtener los nombres
        $client->load(['department', 'city']);

        $response = [
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
            'is_active'          => $client->is_active,
        ];

        Log::info('Client Quick Created', ['client' => $response]);

        return response()->json($response);

    }

    public function show(Client $client)
    {
        return Inertia::render('clients/show', [
            'client' => $client,
        ]);
    }

    public function edit(Client $client)
    {
        $departments = Department::all()->map(fn($dept) => ['id' => $dept->id, 'name' => $dept->name]);
        $cities      = City::all()->map(fn($city) => ['id' => $city->id, 'name' => $city->name, 'department_id' => $city->department_id]);

        return Inertia::render('clients/index', [
            'editingClient' => $client,
            'departments'   => $departments,
            'cities'        => $cities,
        ]);
    }

    public function update(ClientRequest $request, Client $client): RedirectResponse
    {
        $data                    = $request->validated();
        $data['document_number'] = in_array($data['document_type'], ['CC', 'TI', 'NIT']) ? (int) $data['document_number'] : $data['document_number'];
        $client->update($data);
        return redirect()->route('clients.index')->with('success', 'Cliente actualizado correctamente.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();
        return redirect()->route('clients.index')->with('success', 'Cliente eliminado correctamente.');
    }

    public function history(Client $client, Request $request)
    {
        try {
            $query = $client->sales()->with(['items' => function ($query) {
                $query->select('id', 'sale_id', 'product_id', 'quantity', 'unit_price', 'total_price', 'product_name');
            }]);

            if ($request->filled('start_date')) {
                $query->where('sale_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->where('sale_date', '<=', $request->end_date);
            }

            $sales = $request->group_by === 'month' || $request->group_by === 'year'
                ? $query->selectRaw(
                $request->group_by === 'month'
                    ? 'YEAR(sale_date) as year, MONTH(sale_date) as month, COUNT(*) as count'
                    : 'YEAR(sale_date) as year, COUNT(*) as count'
            )
                ->groupBy($request->group_by === 'month' ? ['year', 'month'] : ['year'])
                ->get()
                ->map(function ($sale) {
                    return [
                        'year'  => $sale->year,
                        'month' => $sale->month ?? null,
                        'count' => $sale->count,
                    ];
                })
                : $query->get()->map(function ($sale) {
                return [
                    'id'        => $sale->id,
                    'sale_date' => $sale->sale_date,
                    'items'     => $sale->items->map(function ($item) {
                        return [
                            'id'           => $item->id,
                            'product_id'   => $item->product_id,
                            'product_name' => $item->product_name,
                            'quantity'     => $item->quantity,
                            'unit_price'   => $item->unit_price,
                            'total_price'  => $item->total_price,
                        ];
                    })->toArray(),
                    'total'     => $sale->items->sum('total_price'),
                ];
            });

            Log::info('Client History Fetched', [
                'client_id' => $client->id,
                'sales'     => $sales,
                'filters'   => $request->only(['start_date', 'end_date', 'group_by']),
            ]);

            return response()->json([
                'client'  => ['id' => $client->id, 'name' => $client->name],
                'sales'   => $sales,
                'filters' => $request->only(['start_date', 'end_date', 'group_by']),
            ]);
        } catch (QueryException $e) {
            Log::error('Error fetching client history', [
                'client_id' => $client->id,
                'error'     => $e->getMessage(),
            ]);
            return response()->json([
                'client'  => ['id' => $client->id, 'name' => $client->name],
                'sales'   => [],
                'filters' => $request->only(['start_date', 'end_date', 'group_by']),
            ], 200);
        }
    }

    public function getCities($departmentId)
    {
        $cities = City::where('department_id', $departmentId)->get()->map(fn($city) => ['id' => $city->id, 'name' => $city->name]);

        Log::info('Cities Response', ['department_id' => $departmentId, 'data' => $cities]);

        return response()->json($cities);
    }
}
