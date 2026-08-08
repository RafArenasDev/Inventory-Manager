import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus } from 'lucide-react';
import InventoryMovementsTable from './inventoryMovementsTable';
import InventoryMovementForm from './inventoryMovementForm';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

const breadcrumbs: BreadcrumbItem[] = [
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
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
  const userPermissions = auth.permissions;

  const isModalOpen = isCreating || !!editingMovement;

  const handleCreateMovement = () => {
    const now = new Date();
    const bogotaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const year = bogotaTime.getFullYear();
    const month = String(bogotaTime.getMonth() + 1).padStart(2, '0');
    const day = String(bogotaTime.getDate()).padStart(2, '0');
    const formattedToday = `${year}-${month}-${day}`;

    setEditingMovement({
      product_id: "",
      supplier_id: "",
      type: "",
      quantity: 0,
      date: formattedToday,
      notes: '',
    });
    setIsCreating(true);
  };

  const handleEditMovement = (movement: InventoryMovement) => {
    setEditingMovement({
      id: movement.id,
      product_id: movement.product.id,
      supplier_id: movement.supplier?.id ?? "",
      type: movement.type as 'Entrada' | 'Salida' | 'Devolucion Cliente' | 'Devolucion Proveedor' | 'Consignacion Entrada' | 'Consignacion Salida' | 'Cambio Entrada' | 'Cambio Salida' | 'Ajuste Inventario' | "",
      quantity: movement.quantity,
      date: movement.date || movement.created_at.split('T')[0],
      notes: movement.notes,
    });
    setIsCreating(false);
  };

  const closeForm = () => {
    setEditingMovement(null);
    setIsCreating(false);
    setIsFormDirty(false);
  };

  const attemptCloseForm = () => {
    if (!isFormDirty) {
      closeForm();
      return;
    }

    setShowDiscardConfirm(true);
  };

  const handleSearch = (search: string) => {
    router.post(
      route('inventory-movements.search'),
      { ...filters, search, page: 1 },
      { preserveState: true, preserveScroll: true }
    );
  };

  // El cambio de per_page ya lo maneja Pagination internamente (POST a
  // inventory-movements.search); este callback solo existe para cumplir la prop.
  const handlePerPageChange = () => {};

  const handlePeriodChange = (range: { date_from?: string; date_to?: string }) => {
    router.post(
      route('inventory-movements.search'),
      { ...filters, date_from: range.date_from ?? '', date_to: range.date_to ?? '', page: 1 },
      { preserveState: true, preserveScroll: true }
    );
  };

  // Check if the user has any permissions to show the "Acciones" column
  const showActionsColumn = userPermissions.includes('Editar Movimientos Inventario') ||
                           userPermissions.includes('Actualizar Movimientos Inventario');

  const hasMultiplePages = totalCount > Number(filters.per_page || 10);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Movimientos de Inventario" />
      <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
        <PageHeader
          icon={ClipboardList}
          title="Movimientos de Inventario"
          description="Historial de entradas, salidas y ajustes de inventario."
        >
          {userPermissions.includes('Crear Movimientos Inventario') && (
            <Button onClick={handleCreateMovement} className="gap-1">
              <Plus className="h-4 w-4" />
              Nuevo Movimiento
            </Button>
          )}
        </PageHeader>
        <div className={`relative rounded-xl bg-card shadow-lg shadow-black/10 dark:shadow-black/60 overflow-hidden ${hasMultiplePages ? 'flex-1' : ''}`}>
          <div className={`h-full ${hasMultiplePages ? 'px-6 py-4' : 'p-6'}`}>
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
              onPeriodChange={handlePeriodChange}
              filters={filters}
              userPermissions={userPermissions}
              showActionsColumn={showActionsColumn}
            />
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) attemptCloseForm(); }}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Registrar Movimiento' : 'Editar Movimiento'}</DialogTitle>
            <DialogDescription>
              {isCreating
                ? 'Completa los datos para registrar un nuevo movimiento de inventario.'
                : 'Actualiza los datos del movimiento.'}
            </DialogDescription>
          </DialogHeader>
          {editingMovement && (
            <InventoryMovementForm
              movement={editingMovement}
              products={products}
              suppliers={suppliers}
              onCancel={attemptCloseForm}
              onSaved={closeForm}
              onDirtyChange={setIsFormDirty}
              userPermissions={userPermissions}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar que se perderán."
        confirmText="Sí, descartar"
        cancelText="Seguir editando"
        onConfirm={closeForm}
      />
    </AppLayout>
  );
}
