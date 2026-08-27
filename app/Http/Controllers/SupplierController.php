<?php

namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupplierController extends Controller
{
    /**
     * Summary of index
     *
     * @return Response
     */
    public function index(Request $request)
    {
        $suppliersQuery = Supplier::orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $suppliersQuery->where(function ($query) use ($search) {
                $query->where('name', 'ilike', "%{$search}%")
                    ->orWhere('representative', 'ilike', "%{$search}%")
                    ->orWhereRaw("CONCAT(nit_number, '-', nit_digit) LIKE ?", ["%{$search}%"]);
            });
        }

        $totalCount = $suppliersQuery->count();
        $filteredCount = $suppliersQuery->count();

        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $suppliers = $suppliersQuery->paginate($perPage)->withQueryString();
        $suppliers->getCollection()->transform(function ($supplier) {
            return [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'representative' => $supplier->representative,
                'nit' => $supplier->nit,
                'nit_number' => $supplier->nit_number,
                'nit_digit' => $supplier->nit_digit,
                'phone' => $supplier->phone,
                'cellphone' => $supplier->cellphone,
                'address' => $supplier->address,
                'email' => $supplier->email,
                'description' => $supplier->description,
                'products_count' => $supplier->products()->count(),
                'main_contact' => $supplier->main_contact,
                'main_phone' => $supplier->main_phone,
                'is_active' => $supplier->is_active,
            ];
        });

        return Inertia::render('suppliers/index', [
            'suppliers' => $suppliers,
            'filters' => $request->only(['search', 'per_page']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Summary of store
     */
    public function store(SupplierRequest $request): RedirectResponse|JsonResponse
    {
        $supplier = Supplier::create([
            'name' => $request->name,
            'representative' => $request->representative,
            'nit_number' => $request->nit_number,
            'nit_digit' => $request->nit_digit,
            'phone' => $request->phone,
            'cellphone' => $request->cellphone,
            'address' => $request->address,
            'email' => $request->email,
            'description' => $request->description,
            'is_active' => true,
        ]);

        // Creación rápida desde fuera del módulo de Proveedores (p.ej. el
        // combobox "crear proveedor" del modal de alertas de stock): sin
        // header de Inertia, se responde JSON en vez de redirigir, para no
        // sacar al usuario de donde estaba.
        if (! $request->header('X-Inertia')) {
            return response()->json(['supplier' => $supplier]);
        }

        return redirect()->route('suppliers.index')->with('success', 'Proveedor creado correctamente.');
    }

    /**
     * Summary of update
     *
     * @param  mixed  $id
     */
    public function update(SupplierRequest $request, $id): RedirectResponse
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->update([
            'name' => $request->name,
            'representative' => $request->representative,
            'nit_number' => $request->nit_number,
            'nit_digit' => $request->nit_digit,
            'phone' => $request->phone,
            'cellphone' => $request->cellphone,
            'address' => $request->address,
            'email' => $request->email,
            'description' => $request->description,
        ]);

        return redirect()->route('suppliers.index')->with('success', 'Proveedor actualizado correctamente.');
    }

    /**
     * Summary of destroy
     *
     * @return RedirectResponse
     */
    public function destroy(Supplier $supplier)
    {
        if ($supplier->products()->count() > 0) {
            return redirect()->back()->with('error', 'No se puede eliminar el proveedor porque tiene productos asociados.');
        }

        if ($supplier) {
            $supplier->delete();

            return redirect()->route('suppliers.index')->with('success', 'Proveedor eliminado correctamente.');
        }

        return redirect()->back()->with('error', 'Error al eliminar el proveedor.');
    }

    /**
     * Alternar el estado activo/inactivo del proveedor.
     */
    public function toggleActive(Supplier $supplier)
    {
        $supplier->update(['is_active' => ! $supplier->is_active]);

        return redirect()->back()->with(
            'success',
            $supplier->is_active ? 'Proveedor activado correctamente.' : 'Proveedor desactivado correctamente.'
        );
    }

    /**
     * Summary of export
     *
     * @return StreamedResponse
     */
    public function export(Request $request)
    {
        $suppliersQuery = Supplier::orderBy('id', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $suppliersQuery->where(function ($query) use ($search) {
                $query->where('name', 'ilike', "%{$search}%")
                    ->orWhere('representative', 'ilike', "%{$search}%")
                    ->orWhere('nit_number', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $suppliers = $suppliersQuery->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Proveedores');

        $headers = [
            'A1' => 'ID',
            'B1' => 'Nombre',
            'C1' => 'Representante',
            'D1' => 'NIT',
            'E1' => 'Teléfono',
            'F1' => 'Celular',
            'G1' => 'Email',
            'H1' => 'Dirección',
            'I1' => 'Descripción',
            'J1' => 'Estado',
            'K1' => 'Fecha Registro',
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

        $sheet->getStyle('A1:K1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($suppliers as $supplier) {
            $sheet->setCellValue('A'.$row, $supplier->id);
            $sheet->setCellValue('B'.$row, $supplier->name);
            $sheet->setCellValue('C'.$row, $supplier->representative ?? '');
            $sheet->setCellValue('D'.$row, $supplier->nit_number.'-'.$supplier->nit_digit);
            $sheet->setCellValue('E'.$row, $supplier->phone ?? '');
            $sheet->setCellValue('F'.$row, $supplier->cellphone ?? '');
            $sheet->setCellValue('G'.$row, $supplier->email ?? '');
            $sheet->setCellValue('H'.$row, $supplier->address ?? '');
            $sheet->setCellValue('I'.$row, $supplier->description ?? '');
            $sheet->setCellValue('J'.$row, $supplier->is_active ? 'Activo' : 'Inactivo');
            $sheet->setCellValue('K'.$row, $supplier->created_at->format('d/m/Y H:i:s'));
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
            $sheet->getStyle('A1:K'.($row - 1))->applyFromArray($dataStyle);
        }

        $sheet->getStyle('A2:A'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('D2:D'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('J2:J'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getRowDimension(1)->setRowHeight(25);

        $filename = 'Proveedores_'.now()->format('Y-m-d').'.xlsx';

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
