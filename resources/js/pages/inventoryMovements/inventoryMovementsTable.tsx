import { IconActionButton } from '@/components/icon-action-button';
import { PeriodFilter } from '@/components/period-filter';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeftRight, Download, Pencil } from 'lucide-react';

interface Product {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface InventoryMovement {
    id: number;
    type: string;
    product: Product;
    supplier?: Supplier;
    quantity: number;
    notes?: string;
    created_at: string;
    date?: string;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface MovementsTableProps {
    movements: {
        data: InventoryMovement[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    products: Product[];
    perPage: string;
    onPerPageChange: (perPage: string) => void;
    onEditMovement: (movement: InventoryMovement) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    onPeriodChange: (range: { date_from: string; date_to: string }) => void;
    filters: {
        search?: string;
        per_page?: string;
        product_id?: string;
        type?: string;
        date_from?: string;
        date_to?: string;
    };
    userPermissions: string[];
    showActionsColumn: boolean;
}

export default function InventoryMovementsTable({
    movements,
    perPage,
    onPerPageChange,
    onEditMovement,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onPeriodChange,
    filters,
    userPermissions,
    showActionsColumn,
}: MovementsTableProps) {
    // Tono estándar por dirección del movimiento (no por subtipo individual):
    // esmeralda = entra stock, rosa = sale stock, ámbar = ajuste neutral. El
    // texto ya distingue el subtipo exacto; el color solo debe comunicar la
    // dirección para no saturar la tabla con 9 tonos distintos.
    const getTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'Entrada':
            case 'Devolucion Cliente':
            case 'Consignacion Entrada':
            case 'Cambio Entrada':
                return 'bg-emerald-600 dark:bg-emerald-700';
            case 'Salida':
            case 'Devolucion Proveedor':
            case 'Consignacion Salida':
            case 'Cambio Salida':
                return 'bg-rose-600 dark:bg-rose-700';
            case 'Ajuste Inventario':
                return 'bg-amber-600 dark:bg-amber-700';
            default:
                return 'bg-zinc-600 dark:bg-zinc-700';
        }
    };

    const handleExport = () => {
        // Construir URL con los filtros actuales
        const params = new URLSearchParams();

        if (filters.search) params.append('search', filters.search);
        if (filters.product_id) params.append('product_id', filters.product_id);
        if (filters.type) params.append('type', filters.type);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);

        const exportUrl = route('inventory-movements.export') + '?' + params.toString();

        // Abrir en nueva ventana para descargar
        window.open(exportUrl, '_blank');
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
                    <SearchInput
                        placeholder="Buscar por producto, tipo o proveedor..."
                        searchValue={search}
                        onSearch={onSearch}
                        className="w-full sm:max-w-lg"
                    />
                    <PeriodFilter onChange={onPeriodChange} />
                </div>
                {userPermissions.includes('Exportar Movimientos Inventario') && (
                    <Button
                        size="sm"
                        onClick={handleExport}
                        title="Exportar movimientos a Excel"
                        className="gap-2 bg-gray-500 text-white hover:bg-gray-600"
                    >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                    </Button>
                )}
            </div>

            <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Fecha</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {movements.data.length > 0 ? (
                            movements.data.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="font-medium capitalize">
                                        <span
                                            className={`w-fit rounded-full px-3 py-0.5 text-xs font-bold text-white shadow-sm ${getTypeBadgeClass(m.type)}`}
                                        >
                                            {m.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium">{m.quantity}</TableCell>
                                    <TableCell>{m.product.name}</TableCell>
                                    <TableCell>
                                        <span className="w-fit rounded-full bg-zinc-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm dark:bg-zinc-700">
                                            {m.supplier?.name || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{m.notes || '-'}</TableCell>
                                    <TableCell>
                                        {m.date
                                            ? m.date.split('-').reverse().join('-')
                                            : new Date(m.created_at)
                                                  .toLocaleDateString('es-CO', {
                                                      day: '2-digit',
                                                      month: '2-digit',
                                                      year: 'numeric',
                                                  })
                                                  .replace(/\//g, '-')}
                                    </TableCell>
                                    {showActionsColumn && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {(userPermissions.includes('Editar Movimientos Inventario') ||
                                                    userPermissions.includes('Actualizar Movimientos Inventario')) && (
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => onEditMovement(m)}
                                                        className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                        label="Editar movimiento"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </IconActionButton>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 7 : 6} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <ArrowLeftRight className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron movimientos</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={movements}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="inventory-movements.search"
                extraFilters={{ date_from: filters.date_from, date_to: filters.date_to }}
            />
        </div>
    );
}
