<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClientRequest;
use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use App\Services\AuditLogger;
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
                $query->whereLikeUnaccent('name', "%{$search}%")
                    ->orWhereLike('document_number', "%{$search}%");
            });
        }

        $totalCount = $clientsQuery->count();
        $filteredCount = $clientsQuery->count();
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $clients = $clientsQuery->paginate($perPage)->withQueryString();
        $clients->getCollection()->transform(function ($client) {
            // Un cliente anonimizado no debe mostrar NINGÚN dato en pantalla,
            // ni siquiera el documento (aunque siga en la BD como referencia
            // contable de sus ventas históricas) — se enmascara acá, antes de
            // que la fila salga hacia el navegador.
            if ($client->isAnonymized()) {
                return [
                    'id' => $client->id,
                    'document_type' => null,
                    'document_number' => null,
                    'verification_digit' => null,
                    'name' => 'Cliente Anonimizado',
                    'department_id' => null,
                    'department' => null,
                    'city_id' => null,
                    'city' => null,
                    'phone' => null,
                    'cellphone' => null,
                    'address' => null,
                    'email' => null,
                    'is_active' => false,
                    'created_at' => $client->created_at->format('Y-m-d H:i:s'),
                    'anonymized_at' => $client->anonymized_at->format('Y-m-d H:i:s'),
                ];
            }

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
                'anonymized_at' => null,
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

        try {
            Client::create($data);
        } catch (QueryException $e) {
            // La regla `unique` de ClientRequest ya valida esto, pero deja
            // una ventana real: dos usuarios pueden pasar la validación
            // casi al mismo tiempo (ninguna fila existe todavía para
            // ninguno de los dos) y el segundo INSERT choca contra el
            // `unique` de la base de datos — sin este catch, eso se veía
            // como un error 500 crudo en vez de un aviso claro.
            if ($this->isUniqueViolation($e)) {
                return back()->with('error', 'Ya existe un cliente registrado con ese tipo y número de documento.')->withInput();
            }
            throw $e;
        }

        return redirect()->route('clients.index')->with('success', 'Cliente creado correctamente.');
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        // 23505 = Postgres, 1062 = MySQL/MariaDB — cubre ambos motores que
        // usa este proyecto entre local y producción.
        return $e->getCode() === '23505' || (int) $e->getCode() === 1062;
    }

    public function quickStore(ClientRequest $request)
    {
        // ClientRequest ya valida esto (misma regla que store()/update(), incluyendo
        // el unique por document_type) al inyectarse como FormRequest — repetirlo
        // acá con otro set de reglas más flojo (sin scoping por document_type en el
        // unique) solo generaba dos validaciones divergentes para la misma acción.
        $validated = $request->validated();

        $validated['document_number'] = in_array($validated['document_type'], ['CC', 'TI', 'NIT']) ? (int) $validated['document_number'] : $validated['document_number'];

        try {
            $client = Client::create($validated);
        } catch (QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                // Mismo formato que una respuesta 422 de validación normal
                // — el .catch() de clientForm.tsx ya sabe leer `errors.*` y
                // mostrarlo bajo el campo correspondiente sin cambios en el
                // frontend.
                return response()->json([
                    'errors' => ['document_number' => ['Ya existe un cliente registrado con ese tipo y número de documento.']],
                ], 422);
            }
            throw $e;
        }

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
        if ($client->isAnonymized()) {
            return redirect()->back()->with('error', 'Este cliente fue anonimizado y ya no puede editarse.');
        }

        $data = $request->validated();
        $data['document_number'] = in_array($data['document_type'], ['CC', 'TI', 'NIT']) ? (int) $data['document_number'] : $data['document_number'];
        $client->update($data);

        return redirect()->route('clients.index')->with('success', 'Cliente actualizado correctamente.');
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        if ($client->isAnonymized()) {
            return redirect()->back()->with('error', 'Este cliente ya fue anonimizado: no puede eliminarse (crea uno nuevo si hace falta).');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ], [
            'reason.required' => 'Debes indicar el motivo de la eliminación.',
        ]);

        AuditLogger::log('client.deleted', $client, $validated['reason'], [
            'name' => [$client->name, null],
            'document' => [$client->document_type.' '.$client->document_number, null],
            'email' => [$client->email, null],
            'phone' => [$client->phone, null],
            'cellphone' => [$client->cellphone, null],
            'address' => [$client->address, null],
        ]);

        $client->delete();

        return redirect()->route('clients.index')->with('success', 'Cliente eliminado correctamente.');
    }

    /**
     * Alternar el estado activo/inactivo del cliente.
     */
    public function toggleActive(Client $client): RedirectResponse
    {
        if ($client->isAnonymized()) {
            return redirect()->back()->with('error', 'Este cliente fue anonimizado y no puede reactivarse.');
        }

        $client->update(['is_active' => ! $client->is_active]);

        return redirect()->back()->with(
            'success',
            $client->is_active ? 'Cliente activado correctamente.' : 'Cliente desactivado correctamente.'
        );
    }

    /**
     * Anonimiza los datos personales de un cliente a solicitud suya (Ley
     * 1581 de 2012 / derecho de supresión), sin borrar la fila: las ventas
     * históricas ya facturadas deben conservar su referencia. Documento y
     * ciudad/departamento se conservan (no son personalmente identificables
     * por sí solos y quedan como referencia contable); nombre y contacto se
     * eliminan.
     */
    public function anonymize(Request $request, Client $client): RedirectResponse
    {
        if ($client->document_number === 222222222222) {
            return redirect()->back()->with('error', 'El cliente "Consumidor Final" no puede anonimizarse.');
        }

        if ($client->isAnonymized()) {
            return redirect()->back()->with('error', 'Este cliente ya fue anonimizado.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ], [
            'reason.required' => 'Debes indicar el motivo de la anonimización.',
        ]);

        $newName = 'Cliente Anonimizado';

        // El número de documento se conserva en la fila (referencia contable
        // de las ventas históricas, y evita reabrir el mismo documento con un
        // cliente "nuevo"), pero deja de mostrarse en cualquier pantalla — ver
        // el enmascarado en index(). A partir de acá la acción es irreversible
        // y el registro queda bloqueado (sin editar/eliminar/reactivar/ver).
        AuditLogger::log('client.anonymized', $client, $validated['reason'], [
            'name' => [$client->name, $newName],
            'email' => [$client->email, null],
            'phone' => [$client->phone, null],
            'cellphone' => [$client->cellphone, null],
            'address' => [$client->address, null],
        ]);

        $client->update([
            'name' => $newName,
            'email' => null,
            'phone' => null,
            'cellphone' => null,
            'address' => null,
            'is_active' => false,
            'anonymized_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Los datos del cliente fueron anonimizados correctamente.');
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
