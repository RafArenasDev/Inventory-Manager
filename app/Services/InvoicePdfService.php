<?php

namespace App\Services;

use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

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
        $fullPath = "invoices/{$year}/{$month}/recibo_{$sale->invoice_number}.pdf";

        Storage::disk('public')->put($fullPath, $pdf->output());

        $publicUrl = Storage::url($fullPath);

        $sale->public_invoice_url = $publicUrl;
        $sale->save();

        return $publicUrl;
    }
}
