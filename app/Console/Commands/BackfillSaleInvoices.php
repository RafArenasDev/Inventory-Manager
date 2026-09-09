<?php

namespace App\Console\Commands;

use App\Models\Sale;
use App\Services\InvoicePdfService;
use Illuminate\Console\Command;

/**
 * Genera la factura PDF de cualquier venta activa que no la tenga —
 * ventas de antes de que existiera este generador, o alguna que falló al
 * crearse por un error puntual. SaleController::store() ya genera la
 * factura al crear cada venta nueva; esto es solo para ponerse al día con
 * lo viejo. No toca ventas anuladas (una venta anulada no debería poder
 * imprimirse como si fuera válida).
 */
class BackfillSaleInvoices extends Command
{
    protected $signature = 'sales:backfill-invoices';

    protected $description = 'Genera la factura PDF de las ventas activas que aún no la tienen';

    public function handle(InvoicePdfService $service): int
    {
        $sales = Sale::whereNull('public_invoice_url')
            ->where('is_cancelled', false)
            ->get();

        if ($sales->isEmpty()) {
            $this->info('Todas las ventas activas ya tienen factura.');

            return self::SUCCESS;
        }

        $this->info("Generando factura para {$sales->count()} venta(s)...");
        $bar = $this->output->createProgressBar($sales->count());

        $failed = 0;
        foreach ($sales as $sale) {
            try {
                $service->generateAndStore($sale);
            } catch (\Throwable $e) {
                $failed++;
                $this->newLine();
                $this->error("Venta {$sale->invoice_number}: {$e->getMessage()}");
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine();

        $ok = $sales->count() - $failed;
        $this->info("Listo: {$ok} factura(s) generada(s)".($failed > 0 ? ", {$failed} fallaron." : '.'));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
