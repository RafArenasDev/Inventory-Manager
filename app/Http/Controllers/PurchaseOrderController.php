<?php

namespace App\Http\Controllers;

use App\Http\Requests\PurchaseOrderRequest;
use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class PurchaseOrderController extends Controller
{
    public function index(Request $request)
    {
        $ordersQuery = PurchaseOrder::with(['supplier', 'requestedBy', 'receivedBy', 'items.product'])
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $ordersQuery->where(function ($query) use ($search) {
                $query->where('notes', 'ilike', "%{$search}%")
                    ->orWhereHas('supplier', function ($q) use ($search) {
                        $q->where('name', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $ordersQuery->where('status', $request->status);
        }

        $dateFrom = $request->filled('date_from') ? $request->date_from : today()->startOfMonth()->toDateString();
        $dateTo = $request->filled('date_to') ? $request->date_to : today()->endOfMonth()->toDateString();
        $ordersQuery->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo);

        $totalCount = PurchaseOrder::count();
        $filteredCount = $ordersQuery->count();

        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $orders = $ordersQuery->paginate($perPage)->withQueryString();
        $orders->getCollection()->transform(fn (PurchaseOrder $order) => $this->formatOrder($order));

        return Inertia::render('purchaseOrders/index', [
            'purchaseOrders' => $orders,
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name', 'phone', 'cellphone']),
            'products' => Product::with('supplier:id,name')
                ->select('id', 'code', 'name', 'supplier_id', 'stock', 'price_without_tax')
                ->orderBy('name')
                ->get(),
            'filters' => [
                ...$request->only(['search', 'per_page', 'status']),
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    public function store(PurchaseOrderRequest $request)
    {
        $validated = $request->validated();

        $order = DB::transaction(function () use ($validated) {
            // Fija el "origen" del pedido en la creación: si algún producto
            // pedido está en alerta de stock bajo ahora mismo, es un pedido
            // "por alertas" — su selector de productos (acá y al editarlo)
            // queda restringido a solo productos en alerta, para no mezclar
            // con pedidos "normales" (reponer algo que ya está bien).
            $isLowStockOrder = Product::whereIn('id', collect($validated['items'])->pluck('product_id'))
                ->where('stock', '<=', DashboardController::ALERT_STOCK_THRESHOLD)
                ->exists();

            $order = PurchaseOrder::create([
                'supplier_id' => $validated['supplier_id'],
                'requested_by' => auth()->id(),
                'status' => 'Solicitado',
                'notes' => $validated['notes'] ?? null,
                'expected_at' => $validated['expected_at'] ?? null,
                'is_low_stock_order' => $isLowStockOrder,
            ]);

            // El precio unitario se toma del producto al momento de pedir
            // (queda como registro histórico aunque el precio cambie después)
            // en vez de pedírselo al usuario al armar el pedido.
            $productPrices = Product::whereIn('id', collect($validated['items'])->pluck('product_id'))
                ->pluck('price_without_tax', 'id');

            foreach ($validated['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity_requested' => $item['quantity_requested'],
                    'unit_cost' => $productPrices[$item['product_id']] ?? null,
                ]);
            }

            return $order;
        });

        // Creación embebida (acordeón del modal de alertas de stock): sin
        // header de Inertia, se responde JSON en vez de redirigir a
        // purchase-orders.index, para no sacar al usuario del modal.
        if (! $request->header('X-Inertia')) {
            return response()->json(['purchaseOrder' => $order->load('items.product')]);
        }

        return redirect()->route('purchase-orders.index')
            ->with('success', 'Pedido solicitado correctamente.');
    }

    /**
     * Edita proveedor, notas, fecha esperada y productos de un pedido — solo
     * mientras está "Solicitado" (uno ya recibido o cancelado queda como
     * historial). Un ítem con recepción parcial (registrada a mano desde
     * Movimientos de Inventario) no se puede quitar ni bajar por debajo de
     * lo ya recibido; el resto de ítems se sincroniza libremente.
     */
    public function update(PurchaseOrderRequest $request, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'Solicitado') {
            return back()->with('error', 'Solo se puede editar un pedido mientras está Solicitado.');
        }

        $validated = $request->validated();

        DB::transaction(function () use ($validated, $purchaseOrder) {
            $purchaseOrder->update([
                'supplier_id' => $validated['supplier_id'],
                'notes' => $validated['notes'] ?? null,
                'expected_at' => $validated['expected_at'] ?? null,
                'updated_by' => auth()->id(),
            ]);

            $existingItems = $purchaseOrder->items()->with('product')->get()->keyBy('product_id');
            $incomingProductIds = collect($validated['items'])->pluck('product_id');

            foreach ($existingItems as $productId => $item) {
                if (! $incomingProductIds->contains($productId)) {
                    if ($item->quantity_received > 0) {
                        throw ValidationException::withMessages([
                            'items' => "No se puede quitar \"{$item->product->name}\": ya tiene recepción parcial registrada.",
                        ]);
                    }
                    $item->delete();
                }
            }

            $productPrices = Product::whereIn('id', $incomingProductIds)->pluck('price_without_tax', 'id');

            foreach ($validated['items'] as $itemData) {
                $existing = $existingItems->get($itemData['product_id']);

                if ($existing) {
                    if ($itemData['quantity_requested'] < $existing->quantity_received) {
                        throw ValidationException::withMessages([
                            'items' => "La cantidad de \"{$existing->product->name}\" no puede ser menor a lo ya recibido ({$existing->quantity_received}).",
                        ]);
                    }
                    $existing->update(['quantity_requested' => $itemData['quantity_requested']]);
                } else {
                    $purchaseOrder->items()->create([
                        'product_id' => $itemData['product_id'],
                        'quantity_requested' => $itemData['quantity_requested'],
                        'unit_cost' => $productPrices[$itemData['product_id']] ?? null,
                    ]);
                }
            }
        });

        // Igual que en store(): cuando se edita desde el acordeón de alertas
        // de stock (sin header de Inertia) se responde JSON en vez de
        // redirigir, para no sacar al usuario del modal de alertas.
        if (! $request->header('X-Inertia')) {
            return response()->json(['purchaseOrder' => $this->formatOrder($purchaseOrder->fresh(['supplier', 'items.product']))]);
        }

        return redirect()->route('purchase-orders.index')
            ->with('success', 'Pedido actualizado.');
    }

    /**
     * Recibe de una sola vez lo pendiente de cada línea: crea un movimiento
     * de Entrada por producto (por la cantidad que aún faltaba), sube el
     * stock, y deja que la misma lógica que ya usa el módulo de Movimientos
     * cierre el pedido cuando corresponda. Cubre el caso común de "llegó
     * todo completo"; recibir parcialmente sigue disponible registrando un
     * movimiento manual desde Movimientos de Inventario con este pedido.
     */
    public function receive(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'Solicitado') {
            return back()->with('error', 'Este pedido no está en un estado que se pueda recibir.');
        }

        DB::transaction(function () use ($purchaseOrder) {
            foreach ($purchaseOrder->items as $item) {
                $pending = $item->quantity_requested - $item->quantity_received;
                if ($pending <= 0) {
                    continue;
                }

                $product = $item->product;
                $product->increment('stock', $pending);
                Category::where('id', $product->category_id)->where('is_active', false)->update(['is_active' => true]);

                InventoryMovement::create([
                    'product_id' => $item->product_id,
                    'supplier_id' => $purchaseOrder->supplier_id,
                    'purchase_order_id' => $purchaseOrder->id,
                    'type' => 'Entrada',
                    'quantity' => $pending,
                    'date' => today(),
                    'notes' => "Recepción del pedido #{$purchaseOrder->id}",
                ]);

                $item->increment('quantity_received', $pending);
            }

            $purchaseOrder->refresh();
            if ($purchaseOrder->isFullyReceived()) {
                $purchaseOrder->update(['status' => 'Recibido', 'received_at' => now(), 'received_by' => auth()->id()]);
            }
        });

        return redirect()->route('purchase-orders.index')
            ->with('success', 'Pedido recibido — stock actualizado.');
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status === 'Recibido') {
            return back()->with('error', 'Un pedido ya recibido no se puede eliminar — queda como historial.');
        }

        $purchaseOrder->delete();

        return redirect()->route('purchase-orders.index')
            ->with('success', 'Pedido eliminado.');
    }

    /**
     * Productos agotados/bajos agrupados por proveedor, para el modal de
     * alertas de stock (rediseño 12.3) — incluye si cada uno ya tiene un
     * Pedido activo (Solicitado) que lo cubre.
     */
    public function lowStockByProvider()
    {
        $threshold = DashboardController::ALERT_STOCK_THRESHOLD;

        $products = Product::with('supplier:id,name,phone,cellphone')
            ->where('stock', '<=', $threshold)
            ->orderBy('stock')
            ->get(['id', 'code', 'name', 'stock', 'supplier_id']);

        $activeItemsByProduct = PurchaseOrderItem::query()
            ->whereHas('purchaseOrder', fn ($q) => $q->where('status', 'Solicitado'))
            ->whereIn('product_id', $products->pluck('id'))
            ->get()
            ->keyBy('product_id');

        // Un proveedor puede tener varios pedidos activos a la vez — uno
        // "por alertas" y otro "normal", o más de uno de cada — así que acá
        // van TODOS sus pedidos "Solicitado", no solo uno — el acordeón de
        // alertas los usa para su resumen y para abrir el mismo editor del
        // módulo de Pedidos sin otro viaje al servidor.
        $activeOrdersBySupplier = PurchaseOrder::with(['supplier', 'items.product'])
            ->where('status', 'Solicitado')
            ->whereIn('supplier_id', $products->pluck('supplier_id')->unique())
            ->latest('id')
            ->get()
            ->groupBy('supplier_id');

        $grouped = $products->groupBy('supplier_id')->map(function ($items, $supplierId) use ($activeItemsByProduct, $activeOrdersBySupplier) {
            $supplier = $items->first()->supplier;
            $activeOrders = $activeOrdersBySupplier->get((int) $supplierId, collect());

            return [
                'supplier' => $supplier ? [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'phone' => $supplier->cellphone ?? $supplier->phone,
                ] : null,
                'active_orders' => $activeOrders->map(fn (PurchaseOrder $order) => $this->formatOrder($order))->values(),
                'products' => $items->map(function (Product $product) use ($activeItemsByProduct) {
                    return [
                        'id' => $product->id,
                        'code' => $product->code,
                        'name' => $product->name,
                        'stock' => $product->stock,
                        'tier' => Product::stockTier($product->stock),
                        'has_active_order' => $activeItemsByProduct->has($product->id),
                    ];
                })->values(),
            ];
        })->values();

        return response()->json([
            'groups' => $grouped,
            // Se incluyen aquí (en vez de un fetch aparte a purchase-orders.index,
            // que es una ruta Inertia y no devuelve JSON plano) porque el modal
            // de alertas necesita esta misma data para el formulario de Nuevo
            // Pedido anidado.
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name', 'phone', 'cellphone']),
            'products' => Product::select('id', 'code', 'name', 'supplier_id', 'stock', 'price_without_tax')->orderBy('name')->get(),
        ]);
    }

    private function formatOrder(PurchaseOrder $order): array
    {
        return [
            'id' => $order->id,
            'status' => $order->status,
            'is_low_stock_order' => $order->is_low_stock_order,
            'notes' => $order->notes,
            'expected_at' => $order->expected_at?->format('Y-m-d'),
            'received_at' => $order->received_at?->format('Y-m-d H:i:s'),
            'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            'updated_at' => $order->updated_by ? $order->updated_at->format('Y-m-d H:i:s') : null,
            'supplier' => $order->supplier ? [
                'id' => $order->supplier->id,
                'name' => $order->supplier->name,
                'phone' => $order->supplier->cellphone ?? $order->supplier->phone,
            ] : null,
            'requested_by' => $order->requestedBy?->name,
            'received_by' => $order->receivedBy?->name,
            'updated_by' => $order->updatedBy?->name,
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product->name ?? 'Producto eliminado',
                'product_code' => $item->product->code ?? '-',
                'quantity_requested' => $item->quantity_requested,
                'quantity_received' => $item->quantity_received,
                'unit_cost' => $item->unit_cost,
            ]),
        ];
    }

    public function export(Request $request)
    {
        $ordersQuery = PurchaseOrder::with(['supplier', 'items.product', 'requestedBy', 'receivedBy', 'updatedBy'])->orderBy('id', 'asc');

        if ($request->filled('status')) {
            $ordersQuery->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $ordersQuery->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $ordersQuery->whereDate('created_at', '<=', $request->date_to);
        }

        $orders = $ordersQuery->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Pedidos');

        // Sin "Fecha Esperada" — no se usa en la operación real (a pedido
        // del cliente). "Modificado por" / "Fecha Actualización" solo se
        // llenan si el pedido de verdad se editó después de creado
        // (updated_by queda null si nunca pasó por Editar Pedido).
        $headers = [
            'A1' => 'ID', 'B1' => 'Proveedor', 'C1' => 'Origen', 'D1' => 'Estado', 'E1' => 'Productos',
            'F1' => 'Solicitado por', 'G1' => 'Fecha Creación',
            'H1' => 'Recibido por', 'I1' => 'Fecha Recibido',
            'J1' => 'Modificado por', 'K1' => 'Fecha Actualización',
            'L1' => 'Notas',
        ];
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
        ];
        $sheet->getStyle('A1:L1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($orders as $order) {
            $products = $order->items->map(fn ($item) => "{$item->product->name} (x{$item->quantity_requested})")->implode(', ');

            $sheet->setCellValue('A'.$row, $order->id);
            $sheet->setCellValue('B'.$row, $order->supplier->name ?? '');
            $sheet->setCellValue('C'.$row, $order->is_low_stock_order ? 'Stock Bajo' : 'Pedido Nuevo');
            $sheet->setCellValue('D'.$row, $order->status);
            $sheet->setCellValue('E'.$row, $products);
            $sheet->setCellValue('F'.$row, $order->requestedBy?->name ?? '');
            $sheet->setCellValue('G'.$row, $order->created_at->format('d/m/Y H:i:s'));
            $sheet->setCellValue('H'.$row, $order->receivedBy?->name ?? '');
            $sheet->setCellValue('I'.$row, $order->received_at?->format('d/m/Y H:i:s') ?? '');
            $sheet->setCellValue('J'.$row, $order->updatedBy?->name ?? '');
            $sheet->setCellValue('K'.$row, $order->updated_by ? $order->updated_at->format('d/m/Y H:i:s') : '');
            $sheet->setCellValue('L'.$row, $order->notes ?? '');
            $row++;
        }

        $dataStyle = ['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]]];
        if ($row > 2) {
            $sheet->getStyle('A1:L'.($row - 1))->applyFromArray($dataStyle);
        }
        foreach (range('A', 'L') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getRowDimension(1)->setRowHeight(25);

        $filename = 'Pedidos_'.now()->format('Y-m-d').'.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }
}
