<?php

namespace App\Services;

use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class InvoicePdfService
{
    /**
     * Genera el PDF de la venta, lo guarda en el disco público y persiste
     * la URL en la venta. Usado tanto por SaleController::store como por
     * SaleSeeder, para que toda venta (real o de demo) tenga factura
     * descargable/enviable por WhatsApp.
     */
    public function generateAndStore(Sale $sale): string
    {
        $sale->loadMissing('items.product', 'client.department', 'client.city', 'user');

        $pdf = Pdf::loadView('sales.invoice', ['sale' => $sale]);

        $year = Carbon::parse($sale->sale_date)->year;
        $month = Carbon::parse($sale->sale_date)->format('m');
        $fullPath = "invoices/{$year}/{$month}/".self::fileName($sale);

        Storage::disk('public')->put($fullPath, $pdf->output());

        $publicUrl = Storage::url($fullPath);

        $sale->public_invoice_url = $publicUrl;
        $sale->save();

        return $publicUrl;
    }

    /**
     * Nombre de archivo descriptivo para la factura: fecha (sin hora),
     * cliente y documento, para poder distinguir varias facturas sin
     * tener que abrirlas una por una.
     */
    public static function fileName(Sale $sale): string
    {
        $date = Carbon::parse($sale->sale_date)->format('Y-m-d');

        if ($sale->client) {
            $client = self::slug($sale->client->name);
            $doc = self::slug($sale->client->document_type.$sale->client->document_number);

            return "Recibo_{$sale->invoice_number}_{$date}_{$client}_{$doc}.pdf";
        }

        return "Recibo_{$sale->invoice_number}_{$date}_Cliente-Varios.pdf";
    }

    private static function slug(string $value): string
    {
        return trim(preg_replace('/[^A-Za-z0-9]+/', '-', Str::ascii($value)), '-');
    }
}
