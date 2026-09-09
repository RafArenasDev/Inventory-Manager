<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaleRequest;
use App\Models\CashRegister;
use App\Models\City;
use App\Models\Client;
use App\Models\Department;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Services\AuditLogger;
use App\Services\InvoicePdfService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
                    $q->whereLikeUnaccent('name', "%{$search}%")
                        ->orWhereLike('document_number', "%{$search}%");
                })->orWhereLike('id', "%{$search}%")
                    ->orWhereLike('invoice_number', "%{$search}%");
            });
        }

        // Sin filtro explícito, se limita al mes actual — nunca se pinta el
        // histórico completo de una sola vez.
        $dateFrom = $request->filled('date_from') ? $request->date_from : today()->startOfMonth()->toDateString();
        $dateTo = $request->filled('date_to') ? $request->date_to : today()->endOfMonth()->toDateString();
        $salesQuery->whereDate('sale_date', '>=', $dateFrom)
            ->whereDate('sale_date', '<=', $dateTo);

        $filteredCount = $salesQuery->count();
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        // Obtener departamentos y ciudades para el formulario
        $departments = Department::all()->map(fn ($dept) => ['id' => $dept->id, 'name' => $dept->name]);
        $cities = City::all()->map(fn ($city) => ['id' => $city->id, 'name' => $city->name, 'department_id' => $city->department_id]);

        $sales = $salesQuery->paginate($perPage)->withQueryString();
        $sales->getCollection()->transform(function ($sale) {
            return $this->transformSale($sale);
        });

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'filters' => ['search' => $request->search, 'per_page' => $request->per_page, 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
            'products' => Product::select('id', 'name', 'code', 'sale_price', 'stock')->get(),
            'clients' => Client::with(['department', 'city'])
                ->select('id', 'name', 'document_type', 'document_number', 'verification_digit', 'email', 'phone', 'cellphone', 'address', 'department_id', 'city_id')
                ->get()
                ->map(function ($client) {
                    return [
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
                    ];
                }),
            'departments' => $departments,
            'cities' => $cities,
        ]);
    }

    protected function transformSale($sale)
    {
        return [
            'id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'client' => $sale->client ? [
                'id' => $sale->client->id,
                'name' => $sale->client->name,
                'document_type' => $sale->client->document_type,
                'document_number' => $sale->client->document_number,
                'verification_digit' => $sale->client->verification_digit,
                'department_id' => $sale->client->department_id,
                'department' => $sale->client->department ? $sale->client->department->name : null,
                'city_id' => $sale->client->city_id,
                'city' => $sale->client->city ? $sale->client->city->name : null,
                'email' => $sale->client->email,
                'phone' => $sale->client->phone,
                'cellphone' => $sale->client->cellphone,
                'address' => $sale->client->address,
            ] : null,
            'user' => [
                'id' => $sale->user->id,
                'name' => $sale->user->name,
            ],
            'sale_date' => $sale->sale_date->format('Y-m-d'),
            'sale_time' => Carbon::parse($sale->sale_time)->format('h:i:s A'),
            'total_without_tax' => $sale->total_without_tax / 100,
            'total_with_discount' => $sale->total_with_discount / 100,
            'discount' => $sale->discount / 100,
            'discount_type' => $sale->discount_type,
            'total_paid' => $sale->total_paid / 100,
            'payment_method' => $sale->payment_method,
            'notes' => $sale->notes,
            'public_invoice_url' => $sale->public_invoice_url,
            'is_cancelled' => $sale->is_cancelled,
            'items' => $sale->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name,
                    'product_code' => $item->product->code,
                    'quantity' => $item->quantity,
                    // price_at_sale/subtotal se guardan en pesos planos (igual que
                    // Product::sale_price), NO en la escala x100 de Sale — dividir
                    // acá los mostraba 100 veces más chicos de lo cobrado.
                    'price_at_sale' => $item->price_at_sale,
                    'subtotal' => $item->subtotal,
                ];
            }),
        ];
    }

    public function store(SaleRequest $request): RedirectResponse
    {
        $todayRegister = CashRegister::where('register_date', today())->where('is_closed', false)->first();

        if (! $todayRegister) {
            return back()->with('error', 'No puedes registrar la venta: la caja del día no está abierta. Pide a un administrador que la abra.');
        }

        try {
            $validated = $request->validated();
            $invoiceNumber = Sale::generateInvoiceNumber();

            $sale = DB::transaction(function () use ($validated, $invoiceNumber) {
                // El precio, el stock y los totales NUNCA se toman del payload:
                // el cliente solo dice "qué producto y cuánta cantidad", el
                // servidor recalcula todo desde Product::sale_price (con
                // lockForUpdate para no vender sobre stock ya reservado por
                // otra venta concurrente). Esto es lo mismo que ya se hace en
                // Proveedores con el DV del NIT: nunca confiar en un número
                // que viene del cliente cuando el servidor puede calcularlo.
                $lineItems = [];
                $totalWithoutTax = 0;

                foreach ($validated['items'] as $item) {
                    $product = Product::where('id', $item['product_id'])->lockForUpdate()->firstOrFail();

                    if ($product->stock < $item['quantity']) {
                        throw new \RuntimeException("Stock insuficiente para \"{$product->name}\": quedan {$product->stock}, se pidieron {$item['quantity']}.");
                    }

                    $priceAtSale = $product->sale_price;
                    $subtotal = $priceAtSale * $item['quantity'];
                    $totalWithoutTax += $subtotal;

                    $lineItems[] = [
                        'product' => $product,
                        'quantity' => $item['quantity'],
                        'price_at_sale' => $priceAtSale,
                        'subtotal' => $subtotal,
                    ];
                }

                $discountInput = (float) $validated['discount'];
                $discountAmount = $validated['discount_type'] === 'percentage'
                    ? (int) round($totalWithoutTax * min($discountInput, 100) / 100)
                    : (int) round(min($discountInput, $totalWithoutTax));
                $totalWithDiscount = $totalWithoutTax - $discountAmount;
                $totalPaid = $totalWithDiscount;

                $sale = Sale::create([
                    'invoice_number' => $invoiceNumber,
                    'client_id' => $validated['client_id'],
                    'user_id' => auth()->id(),
                    'sale_date' => $validated['sale_date'],
                    'sale_time' => $validated['sale_time'],
                    'discount' => (int) ($discountAmount * 100),
                    'discount_type' => $validated['discount_type'],
                    'payment_method' => $validated['payment_method'],
                    'notes' => $validated['notes'] ?? null,
                    'total_without_tax' => (int) ($totalWithoutTax * 100),
                    'total_with_discount' => (int) ($totalWithDiscount * 100),
                    'total_paid' => (int) ($totalPaid * 100),
                    'is_cancelled' => false,
                ]);

                if ($validated['client_id']) {
                    Client::where('id', $validated['client_id'])->where('is_active', false)->update(['is_active' => true]);
                }

                foreach ($lineItems as $line) {
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $line['product']->id,
                        'quantity' => $line['quantity'],
                        'price_at_sale' => $line['price_at_sale'],
                        'subtotal' => $line['subtotal'],
                    ]);

                    $line['product']->decrement('stock', $line['quantity']);

                    InventoryMovement::create([
                        'product_id' => $line['product']->id,
                        'type' => 'Salida',
                        'quantity' => $line['quantity'],
                        'date' => now(),
                        'notes' => 'Venta '.$invoiceNumber,
                        'supplier_id' => $line['product']->supplier_id,
                    ]);
                }

                // Crear transacción automática para la venta
                $salesCategory = TransactionCategory::where('name', 'Ventas')->first();

                if ($salesCategory) {
                    $clientName = $validated['client_id'] ? Client::find($validated['client_id'])->name : 'Cliente varios';

                    Transaction::create([
                        'user_id' => auth()->id(),
                        'type' => 'Ingreso',
                        'transaction_category_id' => $salesCategory->id,
                        'amount' => $totalPaid,
                        'transaction_date' => $validated['sale_date'],
                        'transaction_time' => $validated['sale_time'],
                        'payment_method' => $validated['payment_method'],
                        'invoice_number' => $invoiceNumber,
                        'description' => 'Cliente: '.$clientName,
                        'notes' => 'Transacción automática generada por venta: '.$invoiceNumber,
                        'sale_id' => $sale->id,
                    ]);
                }

                return $sale;
            });

            $publicUrl = app(InvoicePdfService::class)->generateAndStore($sale);

            return redirect()->route('sales.index')->with(['success' => 'Venta creada correctamente.', 'invoice_url' => $publicUrl]);
        } catch (\RuntimeException $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()])->withInput();
        } catch (\Exception $e) {
            Log::error('Error creating sale: '.$e->getMessage());

            return redirect()->back()->withErrors(['error' => 'Error al crear la venta: '.$e->getMessage()]);
        }
    }

    public function cancel(Request $request, Sale $sale): RedirectResponse
    {
        if ($sale->is_cancelled) {
            return redirect()->route('sales.index')->with('error', 'La venta ya está anulada.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ], [
            'reason.required' => 'Debes indicar el motivo de la anulación.',
        ]);

        AuditLogger::log('sale.cancelled', $sale, $validated['reason']);

        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $item) {
                $product = Product::findOrFail($item->product_id);
                $product->stock += $item->quantity;
                $product->save();

                InventoryMovement::create([
                    'product_id' => $item->product_id,
                    'type' => 'Ajuste Inventario',
                    'quantity' => $item->quantity,
                    'date' => now(),
                    'notes' => 'Anulación de Venta '.$sale->invoice_number,
                    'supplier_id' => $product->supplier_id,
                ]);
            }

            // Eliminar la transacción asociada a la venta
            Transaction::where('sale_id', $sale->id)->delete();

            $sale->is_cancelled = true;
            $sale->save();
        });

        return redirect()->route('sales.index')->with('success', 'Venta anulada correctamente.');
    }

    public function show(Sale $sale)
    {
        $sale->load('items.product', 'client.department', 'client.city', 'user');

        return response()->json([
            'sale' => $this->transformSale($sale),
            'businessName' => config('business.name'),
        ]);
    }

    public function generatePdf(Sale $sale): Response
    {
        $sale->load('items.product', 'client.department', 'client.city', 'user');
        $pdf = Pdf::loadView('sales.invoice', ['sale' => $sale])
            ->setOptions(['defaultFont' => 'Helvetica']);

        return $pdf->download(InvoicePdfService::fileName($sale));
    }

    public function getClientByDocument(Request $request)
    {
        $client = Client::with(['department', 'city'])->where('document_number', $request->document_number)->first();
        if ($client) {
            return response()->json([
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
            ]);
        }

        return response()->json(null);
    }

    public function getProductByCode(Request $request)
    {
        $product = Product::where('code', $request->code)->first();

        return response()->json($product);
    }

    /**
     * Summary of export
     *
     * @return StreamedResponse
     */
    public function export(Request $request)
    {
        $salesQuery = Sale::with('items.product', 'client', 'user')->orderBy('id', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $salesQuery->where(function ($query) use ($search) {
                $query->whereHas('client', function ($q) use ($search) {
                    $q->whereLikeUnaccent('name', "%{$search}%")
                        ->orWhereLike('document_number', "%{$search}%");
                })->orWhereLike('id', "%{$search}%")
                    ->orWhereLike('invoice_number', "%{$search}%");
            });
        }

        $sales = $salesQuery->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Ventas');

        $headers = [
            'A1' => 'ID',
            'B1' => 'Nº Factura',
            'C1' => 'Fecha',
            'D1' => 'Hora',
            'E1' => 'Cliente',
            'F1' => 'Documento Cliente',
            'G1' => 'Total Sin Descuento',
            'H1' => 'Descuento',
            'I1' => 'Total Pagado',
            'J1' => 'Método Pago',
            'K1' => 'Estado',
            'L1' => 'Productos',
            'M1' => 'Notas',
            'N1' => 'Vendedor',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];

        $sheet->getStyle('A1:N1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($sales as $sale) {
            $clientName = $sale->client ? $sale->client->name : 'Cliente no especificado';
            $clientDocument = $sale->client ? ($sale->client->document_number.($sale->client->verification_digit ? '-'.$sale->client->verification_digit : '')) : '';
            $products = $sale->items->map(function ($item) {
                return $item->product->name.' (x'.$item->quantity.')';
            })->implode(', ');

            $sheet->setCellValue('A'.$row, $sale->id);
            $sheet->setCellValue('B'.$row, $sale->invoice_number);
            $sheet->setCellValue('C'.$row, Carbon::parse($sale->sale_date)->format('d/m/Y'));
            $sheet->setCellValue('D'.$row, Carbon::parse($sale->sale_time)->format('h:i:s A'));
            $sheet->setCellValue('E'.$row, $clientName);
            $sheet->setCellValue('F'.$row, $clientDocument);
            $sheet->setCellValue('G'.$row, $sale->total_without_tax / 100);
            // El % ya no se guarda tal cual: solo el monto calculado del
            // descuento. Se reconstruye desde su proporción sobre el
            // subtotal (mismas unidades x100 en numerador y denominador,
            // se cancelan).
            $discountLabel = $sale->discount_type === 'percentage'
                ? number_format($sale->total_without_tax > 0 ? round($sale->discount / $sale->total_without_tax * 100) : 0, 0).'%'
                : '$ '.number_format($sale->discount / 100, 0, ',', '.');
            $sheet->setCellValue('H'.$row, $discountLabel);
            $sheet->setCellValue('I'.$row, $sale->total_paid / 100);
            $sheet->setCellValue('J'.$row, $sale->payment_method);
            $sheet->setCellValue('K'.$row, $sale->is_cancelled ? 'Anulada' : 'Activa');
            $sheet->setCellValue('L'.$row, $products);
            $sheet->setCellValue('M'.$row, $sale->notes ?? '');
            $sheet->setCellValue('N'.$row, $sale->user->name);
            $row++;
        }

        $dataStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        if ($row > 2) {
            $sheet->getStyle('A1:N'.($row - 1))->applyFromArray($dataStyle);
            $sheet->getStyle('G2:G'.($row - 1))->getNumberFormat()->setFormatCode('_-"$"* #,##0_-;-"$"* #,##0_-;_-"$"* "-"_-;_-@_-');
            $sheet->getStyle('I2:I'.($row - 1))->getNumberFormat()->setFormatCode('_-"$"* #,##0_-;-"$"* #,##0_-;_-"$"* "-"_-;_-@_-');
        }

        $sheet->getStyle('A2:A'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('C2:C'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('K2:K'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        foreach (range('A', 'N') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getRowDimension(1)->setRowHeight(25);

        $filename = 'Ventas_'.now()->format('Y-m-d').'.xlsx';

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
