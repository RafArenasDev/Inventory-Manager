import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import InventoryMovementsTable from './inventoryMovementsTable';
import InventoryMovementForm from './inventoryMovementForm';

interface Product {
  id: number;
  code?: string;
  name: string;
  stock?: number;
  supplier_id?: number | null;
  supplier?: {
    id: number;
    name: string;
  };
  category?: {
    id: number;
    name: string;
  };
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

interface InventoryMovementForForm {
  id?: number;
  product_id: number | "";
  supplier_id: number | "";
  type: 'Entrada' | 'Salida' | 'Devolucion Cliente' | 'Devolucion Proveedor' | 'Consignacion Entrada' | 'Consignacion Salida' | 'Cambio Entrada' | 'Cambio Salida' | 'Ajuste Inventario' | "";
  quantity: number;
  date: string;
  notes?: string;
}

interface InventoryMovementIndexProps {
  movements: {
    data: InventoryMovement[];
    links: LinkProps[];
    from: number;
    to: number;
    total: number;
  };
  products: Product[];
  suppliers: Supplier[];
  filters: {
    search?: string;
    per_page?: string;
    product_id?: string;
    type?: string;
    date_from?: string;
    date_to?: string;
  };
  totalCount: number;
  filteredCount: number;
}

const initialBreadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Movimientos de Inventario',
    href: '/inventory-movements',
  },
];

export default function InventoryMovementsIndex({
  movements,
  products,
  suppliers,
  filters,
  totalCount,
  filteredCount,
}: InventoryMovementIndexProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingMovement, setEditingMovement] = useState<InventoryMovementForForm | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

  const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
  const userPermissions = auth.permissions;

  useEffect(() => {
    if (isCreating) {
      setBreadcrumbs([
        ...initialBreadcrumbs,
        { title: 'Registrar Movimiento', href: '/inventory-movements/create' },
      ]);
      window.history.replaceState({}, '', route('inventory-movements.create'));
    } else if (editingMovement?.id) {
      setBreadcrumbs([
        ...initialBreadcrumbs,
        { title: `Editar Movimiento`, href: `/inventory-movements/${editingMovement.id}/edit` },
      ]);
      window.history.replaceState({}, '', route('inventory-movements.edit', editingMovement.id));
    } else {
      setBreadcrumbs(initialBreadcrumbs);
      window.history.replaceState({}, '', route('inventory-movements.index'));
    }
  }, [isCreating, editingMovement]);

  const handleCreateMovement = () => {
    const now = new Date();
    const bogotaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Bogota"}));
    const year = bogotaTime.getFullYear();
    const month = String(bogotaTime.getMonth() + 1).padStart(2, '0');
    const day = String(bogotaTime.getDate()).padStart(2, '0');
    const formattedToday = `${year}-${month}-${day}`;

    const newMovement: InventoryMovementForForm = {
      product_id: "",
      supplier_id: "",
      type: "",
      quantity: 0,
      date: formattedToday,
      notes: '',
    };
    setEditingMovement(newMovement);
    setIsCreating(true);
  };

  const handleEditMovement = (movement: InventoryMovement) => {
    const movementForForm: InventoryMovementForForm = {
      id: movement.id,
      product_id: movement.product.id,
      supplier_id: movement.supplier?.id ?? "",
      type: movement.type as 'Entrada' | 'Salida' | 'Devolucion Cliente' | 'Devolucion Proveedor' | 'Consignacion Entrada' | 'Consignacion Salida' | 'Cambio Entrada' | 'Cambio Salida' | 'Ajuste Inventario' | "",
      quantity: movement.quantity,
      date: movement.date || movement.created_at.split('T')[0],
      notes: movement.notes,
    };
    setEditingMovement(movementForForm);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setEditingMovement(null);
    setIsCreating(false);
  };

  const handleSearch = (search: string) => {
    router.get(
      route('inventory-movements.index'),
      { ...filters, search, page: 1 },
      { preserveState: true, replace: true }
    );
  };

  const handlePerPageChange = (perPage: string) => {
    router.get(
      route('inventory-movements.index'),
      { ...filters, per_page: perPage, page: 1 },
      { preserveState: true, replace: true }
    );
  };

  // Check if the user has any permissions to show the "Acciones" column
  const showActionsColumn = userPermissions.includes('Editar Movimientos Inventario') ||
                           userPermissions.includes('Actualizar Movimientos Inventario');

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Movimientos de Inventario" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        {isCreating || editingMovement ? (
          <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {isCreating ? 'Registrar Movimiento' : `Editar Movimiento`}
              </h2>
              <Button onClick={handleCancelForm} variant="outline" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Atrás
              </Button>
            </div>
            <InventoryMovementForm
              movement={editingMovement as InventoryMovementForForm}
              products={products}
              suppliers={suppliers}
              onCancel={handleCancelForm}
              userPermissions={userPermissions}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Movimientos de Inventario</h2>
              {userPermissions.includes('Crear Movimientos Inventario') && (
                <Button onClick={handleCreateMovement} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Nuevo Movimiento
                </Button>
              )}
            </div>
            <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
              <InventoryMovementsTable
                movements={movements}
                products={products}
                perPage={filters.per_page || '10'}
                onPerPageChange={handlePerPageChange}
                onEditMovement={handleEditMovement}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={filters.search || ''}
                onSearch={handleSearch}
                filters={filters}
                userPermissions={userPermissions}
                showActionsColumn={showActionsColumn}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
