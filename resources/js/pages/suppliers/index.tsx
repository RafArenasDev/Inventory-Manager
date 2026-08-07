import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import SuppliersTable from './suppliersTable';
import { Button } from '@/components/ui/button';
import { Plus, Truck } from 'lucide-react';
import SupplierForm from './supplierForm';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Supplier {
    id: number
    name: string
    representative: string | null
    nit_number: number
    nit_digit: string
    phone: string | null
    cellphone: string | null
    address: string | null
    email: string | null
    description: string | null
    products_count: number
    main_contact: string
    main_phone: string
    is_active: boolean
    created_at: string
    updated_at: string
}

interface SupplierForForm {
    id?: number;
    name: string;
    representative?: string | null;
    nit_number?: number | string;
    nit_digit?: number | string;
    phone?: string | null;
    cellphone?: string | null;
    address?: string | null;
    email?: string | null;
    description?: string | null;
    is_active?: boolean;
}

interface SupplierIndexProps {
    suppliers: {
        data: Supplier[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    filters: {
        search?: string
        per_page?: string
    }
    totalCount: number
    filteredCount: number
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Proveedores',
        href: '/suppliers',
    },
];

export default function SupplierIndex({ suppliers, filters, totalCount, filteredCount }: SupplierIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingSupplier;

    const handleCreateSupplier = () => {
        setEditingSupplier({
            name: '',
            representative: '',
            nit_number: '',
            nit_digit: '',
            phone: '',
            cellphone: '',
            address: '',
            email: '',
            description: '',
            is_active: true
        });
        setIsCreating(true);
    };

    const handleEditSupplier = (supplier: Supplier) => {
        setEditingSupplier({
            id: supplier.id,
            name: supplier.name,
            representative: supplier.representative,
            nit_number: supplier.nit_number,
            nit_digit: supplier.nit_digit,
            phone: supplier.phone,
            cellphone: supplier.cellphone,
            address: supplier.address,
            email: supplier.email,
            description: supplier.description,
            is_active: supplier.is_active
        });
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingSupplier(null);
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

    // El cambio de per_page ya lo maneja Pagination internamente (POST a
    // suppliers.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handleSearch = (search: string) => {
        router.post(route('suppliers.search'), { ...filters, search, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proveedores" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader
                    icon={Truck}
                    title="Proveedores"
                    description="Administra los proveedores y su información de contacto."
                >
                    {userPermissions.includes('Crear Proveedores') && (
                        <Button onClick={handleCreateSupplier} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Proveedor
                        </Button>
                    )}
                </PageHeader>
                <div className="bg-card overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <SuppliersTable
                        suppliers={suppliers}
                        filters={filters}
                        perPage={filters.per_page || "10"}
                        onPerPageChange={handlePerPageChange}
                        onEditSupplier={handleEditSupplier}
                        totalCount={totalCount}
                        filteredCount={filteredCount}
                        search={filters.search || ""}
                        onSearch={handleSearch}
                        userPermissions={userPermissions}
                    />
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) attemptCloseForm(); }}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'Nuevo Proveedor' : `Editar Proveedor: ${editingSupplier?.name || ''}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Completa los datos para registrar un nuevo proveedor.'
                                : 'Actualiza los datos del proveedor.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingSupplier && (
                        <SupplierForm
                            supplier={editingSupplier}
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
