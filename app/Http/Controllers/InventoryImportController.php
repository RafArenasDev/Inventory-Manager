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
        $validated = $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:5120',
            'mode' => 'nullable|in:products,movements',
        ]);

        $token = $this->importer->storeUpload($request->file('file'));
        $filePath = "imports/{$token}.{$request->file('file')->getClientOriginalExtension()}";

        try {
            $preview = $this->importer->preview($filePath, $validated['mode'] ?? 'movements');
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

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
            'mode' => 'nullable|in:products,movements',
        ]);

        // Regex estricta, no solo str_starts_with: el token viaja al cliente
        // y vuelve en commit(), así que hay que impedir que alguien lo
        // manipule a algo como "imports/../../.env" para hacer leer (y
        // devolver en el preview/resultado) un archivo arbitrario del
        // servidor en vez del Excel/CSV que subió.
        if (! preg_match('#^imports/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(xlsx|xls|csv)$#i', $validated['token'])) {
            abort(422, 'Token de importación inválido.');
        }

        try {
            $result = $this->importer->commit($validated['token'], $validated['purchase_order_id'] ?? null, $validated['mode'] ?? 'movements');
        } catch (\RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        return redirect()->back()->with('success',
            "Importación completa: {$result['created']} productos nuevos, {$result['updated']} movimientos registrados."
            .($result['skipped'] > 0 ? " ({$result['skipped']} filas con error se omitieron)" : '')
        );
    }

    public function template(Request $request)
    {
        $mode = $request->query('mode') === 'products' ? 'products' : 'movements';

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Plantilla');

        // La carga masiva de Productos solo crea productos nuevos (siempre
        // Entrada), así que la columna tipo_movimiento sobra y confunde.
        if ($mode === 'products') {
            $headers = [
                'A1' => 'codigo', 'B1' => 'nombre', 'C1' => 'categoria', 'D1' => 'proveedor',
                'E1' => 'precio_sin_iva', 'F1' => 'precio_con_iva', 'G1' => 'iva_porcentaje',
                'H1' => 'precio_venta', 'I1' => 'cantidad', 'J1' => 'fecha',
                'K1' => 'umbral_alerta',
            ];
            $lastCol = 'K';
            $numericCols = ['E', 'F', 'G', 'H', 'I', 'K'];
        } else {
            $headers = [
                'A1' => 'codigo', 'B1' => 'nombre', 'C1' => 'categoria', 'D1' => 'proveedor',
                'E1' => 'precio_sin_iva', 'F1' => 'precio_con_iva', 'G1' => 'iva_porcentaje',
                'H1' => 'precio_venta', 'I1' => 'cantidad', 'J1' => 'tipo_movimiento',
                'K1' => 'fecha', 'L1' => 'notas', 'M1' => 'umbral_alerta',
            ];
            $lastCol = 'M';
            $numericCols = ['E', 'F', 'G', 'H', 'I', 'M'];
        }
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $sheet->setCellValue('A2', 'PROD-001');
        $sheet->setCellValue('I2', 10);
        if ($mode === 'products') {
            // Fila de ejemplo con TODOS los campos llenos — que se vea de
            // entrada qué va en cada columna, no solo el nombre de la
            // cabecera. El umbral queda vacío porque es opcional.
            $sheet->setCellValue('B2', 'Producto de ejemplo');
            $sheet->setCellValue('C2', 'Accesorios');
            $sheet->setCellValue('D2', 'Proveedor de ejemplo S.A.S');
            $sheet->setCellValue('E2', 50000);
            $sheet->setCellValue('F2', 59500);
            $sheet->setCellValue('G2', 19);
            $sheet->setCellValue('H2', 80000);
            $sheet->setCellValue('J2', now()->format('Y-m-d'));
        } else {
            $sheet->setCellValue('C2', '(solo si el código no existe todavía)');
            $sheet->setCellValue('J2', 'Entrada');
            $sheet->setCellValue('M2', '(opcional, por defecto 7)');
        }

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
        ];
        $sheet->getStyle("A1:{$lastCol}1")->applyFromArray($headerStyle);

        // Formato numérico explícito en las columnas de precio/cantidad —
        // sin esto Excel las deja en "General" y un usuario que pegue un
        // valor con separador de miles (ej. "1.000") puede terminar
        // guardando texto en vez de un número, rompiendo el parseo.
        foreach ($numericCols as $col) {
            $sheet->getStyle("{$col}2:{$col}200")->getNumberFormat()->setFormatCode('0');
        }

        foreach (range('A', $lastCol) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = $mode === 'products' ? 'Plantilla_Carga_Masiva_Productos.xlsx' : 'Plantilla_Carga_Masiva.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }
}
