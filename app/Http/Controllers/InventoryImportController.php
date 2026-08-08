<?php

namespace App\Http\Controllers;

use App\Services\InventoryImportService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class InventoryImportController extends Controller
{
    public function __construct(private InventoryImportService $importer) {}

    public function preview(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:5120',
        ]);

        $token = $this->importer->storeUpload($request->file('file'));
        $filePath = "imports/{$token}.{$request->file('file')->getClientOriginalExtension()}";

        $preview = $this->importer->preview($filePath);

        return response()->json([
            'token' => $filePath,
            ...$preview,
        ]);
    }

    public function commit(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'purchase_order_id' => 'nullable|exists:purchase_orders,id',
        ]);

        if (! str_starts_with($validated['token'], 'imports/')) {
            abort(422, 'Token de importación inválido.');
        }

        $result = $this->importer->commit($validated['token'], $validated['purchase_order_id'] ?? null);

        return redirect()->back()->with('success',
            "Importación completa: {$result['created']} productos nuevos, {$result['updated']} movimientos registrados."
            .($result['skipped'] > 0 ? " ({$result['skipped']} filas con error se omitieron)" : '')
        );
    }

    public function template()
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Plantilla');

        $headers = [
            'A1' => 'codigo', 'B1' => 'nombre', 'C1' => 'categoria', 'D1' => 'proveedor',
            'E1' => 'precio_sin_iva', 'F1' => 'precio_con_iva', 'G1' => 'iva_porcentaje',
            'H1' => 'precio_venta', 'I1' => 'cantidad', 'J1' => 'tipo_movimiento',
            'K1' => 'fecha', 'L1' => 'notas',
        ];
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $sheet->setCellValue('A2', 'PROD-001');
        $sheet->setCellValue('C2', '(solo si el código no existe todavía)');
        $sheet->setCellValue('I2', 10);
        $sheet->setCellValue('J2', 'Entrada');

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
        ];
        $sheet->getStyle('A1:L1')->applyFromArray($headerStyle);
        foreach (range('A', 'L') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, 'Plantilla_Carga_Masiva.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }
}
