<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Client;
use Illuminate\Console\Command;

/**
 * Ajuste puramente visual de Estado (Activo/Inactivo): no borra ni bloquea
 * nada, solo refleja que una categoría lleva tiempo sin productos o que un
 * cliente lleva tiempo sin comprar. Ambos se reactivan solos apenas vuelvan
 * a tener actividad (ver ProductController, InventoryMovementController y
 * SaleController).
 */
class DeactivateInactiveEntities extends Command
{
    protected $signature = 'app:deactivate-inactive-entities
        {--category-days=60 : Días sin productos para desactivar una categoría}
        {--client-days=90 : Días sin compras para desactivar un cliente}';

    protected $description = 'Desactiva categorías sin productos y clientes sin compras recientes';

    public function handle(): int
    {
        $categoryDays = (int) $this->option('category-days');
        $clientDays = (int) $this->option('client-days');

        $categoriesDeactivated = Category::where('is_active', true)
            ->where('created_at', '<=', now()->subDays($categoryDays))
            ->whereDoesntHave('products')
            ->update(['is_active' => false]);

        $clientsDeactivated = Client::where('is_active', true)
            ->where('created_at', '<=', now()->subDays($clientDays))
            ->whereDoesntHave('sales', function ($query) use ($clientDays) {
                $query->where('sale_date', '>=', now()->subDays($clientDays));
            })
            ->update(['is_active' => false]);

        $this->info("Categorías desactivadas: {$categoriesDeactivated}");
        $this->info("Clientes desactivados: {$clientsDeactivated}");

        return self::SUCCESS;
    }
}
