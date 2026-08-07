import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/icon-action-button";
import { Pencil, Download, ArrowLeftRight } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import SearchInput from "@/components/ui/search-input";

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
  filters,
  userPermissions,
  showActionsColumn,
}: MovementsTableProps) {

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Entrada':
        return 'bg-green-500 dark:bg-green-600';
      case 'Devolucion Cliente':
        return 'bg-green-600 dark:bg-green-700';
      case 'Consignacion Entrada':
        return 'bg-green-700 dark:bg-green-800';
      case 'Cambio Entrada':
        return 'bg-green-800 dark:bg-green-900';
      case 'Salida':
        return 'bg-red-500 dark:bg-red-600';
      case 'Devolucion Proveedor':
        return 'bg-red-600 dark:bg-red-700';
      case 'Consignacion Salida':
        return 'bg-red-700 dark:bg-red-800';
      case 'Cambio Salida':
        return 'bg-red-800 dark:bg-red-900';
      case 'Ajuste Inventario':
        return 'bg-blue-600 dark:bg-blue-700';
      default:
        return 'bg-gray-600 dark:bg-gray-700';
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Buscar por producto, tipo o proveedor..."
          searchValue={search}
          onSearch={onSearch}
          className="w-full sm:max-w-md"
        />
        {userPermissions.includes('Exportar Movimientos Inventario') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            title="Exportar movimientos a Excel"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        )}
      </div>

      {/* Contador de resultados */}
      {filteredCount !== totalCount && (
        <div className="text-sm text-muted-foreground">
          Mostrando {filteredCount} de {totalCount} movimientos
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
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
                  <TableCell className="capitalize font-medium">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold w-fit shadow-sm text-white ${getTypeBadgeClass(m.type)}`}>
                      {m.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{m.quantity}</TableCell>
                  <TableCell>{m.product.name}</TableCell>
                  <TableCell>
                    <span className="text-xs px-3 py-1 rounded-full bg-gray-600 text-white font-bold w-fit shadow-sm dark:bg-gray-700">
                      {m.supplier?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{m.notes || "-"}</TableCell>
                  <TableCell>
                    {m.date
                      ? m.date.split('-').reverse().join('-')
                      : new Date(m.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }).replace(/\//g, '-')
                    }
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
                            <Pencil className="h-4 w-4" />
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
      />
    </div>
  );
}
