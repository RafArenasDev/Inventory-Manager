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
        $ordersQuery = PurchaseOrder::with(['supplier', 'requestedBy', 'items.product'])
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
                ->select('id', 'code', 'name', 'supplier_id', 'stock')
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

        DB::transaction(function () use ($validated) {
            $order = PurchaseOrder::create([
                'supplier_id' => $validated['supplier_id'],
                'requested_by' => auth()->id(),
                'status' => 'Solicitado',
                'notes' => $validated['notes'] ?? null,
                'expected_at' => $validated['expected_at'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity_requested' => $item['quantity_requested'],
                    'unit_cost' => $item['unit_cost'] ?? null,
                ]);
            }
        });

        return redirect()->route('purchase-orders.index')
            ->with('success', 'Pedido solicitado correctamente.');
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:Solicitado,Cancelado'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($purchaseOrder->status === 'Recibido') {
            return back()->with('error', 'Un pedido ya recibido no se puede modificar.');
        }

        $purchaseOrder->update($validated);

        return redirect()->route('purchase-orders.index')
            ->with('success', $validated['status'] === 'Cancelado' ? 'Pedido cancelado.' : 'Pedido actualizado.');
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
                $purchaseOrder->update(['status' => 'Recibido', 'received_at' => now()]);
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

        $grouped = $products->groupBy('supplier_id')->map(function ($items, $supplierId) use ($activeItemsByProduct) {
            $supplier = $items->first()->supplier;

            return [
                'supplier' => $supplier ? [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'phone' => $supplier->cellphone ?? $supplier->phone,
                ] : null,
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
            'products' => Product::select('id', 'code', 'name', 'supplier_id', 'stock')->orderBy('name')->get(),
        ]);
    }

    private function formatOrder(PurchaseOrder $order): array
    {
        return [
            'id' => $order->id,
            'status' => $order->status,
            'notes' => $order->notes,
            'expected_at' => $order->expected_at?->format('Y-m-d'),
            'received_at' => $order->received_at?->format('Y-m-d H:i:s'),
            'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            'supplier' => $order->supplier ? [
                'id' => $order->supplier->id,
                'name' => $order->supplier->name,
                'phone' => $order->supplier->cellphone ?? $order->supplier->phone,
            ] : null,
            'requested_by' => $order->requestedBy?->name,
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
        $ordersQuery = PurchaseOrder::with(['supplier', 'items.product'])->orderBy('id', 'asc');

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

        $headers = [
            'A1' => 'ID', 'B1' => 'Proveedor', 'C1' => 'Estado', 'D1' => 'Productos',
            'E1' => 'Solicitado por', 'F1' => 'Fecha Esperada', 'G1' => 'Fecha Recibido',
            'H1' => 'Notas', 'I1' => 'Fecha Creación',
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
        $sheet->getStyle('A1:I1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($orders as $order) {
            $products = $order->items->map(fn ($item) => "{$item->product->name} (x{$item->quantity_requested})")->implode(', ');

            $sheet->setCellValue('A'.$row, $order->id);
            $sheet->setCellValue('B'.$row, $order->supplier->name ?? '');
            $sheet->setCellValue('C'.$row, $order->status);
            $sheet->setCellValue('D'.$row, $products);
            $sheet->setCellValue('E'.$row, $order->requestedBy?->name ?? '');
            $sheet->setCellValue('F'.$row, $order->expected_at?->format('d/m/Y') ?? '');
            $sheet->setCellValue('G'.$row, $order->received_at?->format('d/m/Y H:i:s') ?? '');
            $sheet->setCellValue('H'.$row, $order->notes ?? '');
            $sheet->setCellValue('I'.$row, $order->created_at->format('d/m/Y H:i:s'));
            $row++;
        }

        $dataStyle = ['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]]];
        if ($row > 2) {
            $sheet->getStyle('A1:I'.($row - 1))->applyFromArray($dataStyle);
        }
        foreach (range('A', 'I') as $col) {
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
