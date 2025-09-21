import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Download } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import SearchInput from "@/components/ui/search-input";

interface Product {
  id: number;
  name: string;
}

interface InventoryMovement {
  id: number;
  type: string;
  product: Product;
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
      {/* Buscador y Exportar */}
      <div className="flex justify-between items-center">
        <SearchInput
          placeholder="Buscar por producto o tipo..."
          searchValue={search}
          onSearch={onSearch}
        />
        {userPermissions.includes('Exportar Movimientos Inventario') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            title="Exportar movimientos a Excel"
            className="gap-2 hover:bg-green-50 hover:border-green-300"
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
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      m.type === 'Entrada'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {m.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{m.quantity}</TableCell>
                  <TableCell>{m.product.name}</TableCell>
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
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              onEditMovement(m);
                            }}
                            className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={showActionsColumn ? 6 : 5} className="h-24 text-center">
                  No se encontraron movimientos.
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
      />
    </div>
  );
}
