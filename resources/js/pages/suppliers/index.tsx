import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import SuppliersTable from './suppliersTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import SupplierForm from './supplierForm';

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

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Proveedores',
        href: '/suppliers',
    },
];

export default function SupplierIndex({ suppliers, filters, totalCount, filteredCount }: SupplierIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Proveedor',
                    href: '/suppliers/create',
                },
            ]);
            window.history.replaceState({}, '', route('suppliers.create'));
        } else if (editingSupplier?.id) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Proveedor`,
                    href: `/suppliers/${editingSupplier.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('suppliers.edit', editingSupplier.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('suppliers.index'));
        }
    }, [isCreating, editingSupplier]);

    const handleCreateSupplier = () => {
        const newSupplier: SupplierForForm = {
            name: '',
            representative: '',
            nit_number: '',
            nit_digit: '',
            phone: '',
            cellphone: '',
            address: '',
            email: '',
            description: ''
        };
        setEditingSupplier(newSupplier);
        setIsCreating(true);
    };

    const handleEditSupplier = (supplier: Supplier) => {
        const supplierForForm: SupplierForForm = {
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
        };
        setEditingSupplier(supplierForForm);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingSupplier(null);
        setIsCreating(false);
    };

    const handleSearch = (search: string) => {
        router.get(route('suppliers.index'), {
            ...filters,
            search,
            page: 1
        }, {
            preserveState: true,
            replace: true
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proveedores" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || editingSupplier ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Nuevo Proveedor' : `Editar Proveedor: ${editingSupplier?.name || ''}`}
                            </h2>
                            <Button
                                onClick={handleCancelForm}
                                className="gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <SupplierForm
                            supplier={editingSupplier ?? undefined}
                            onCancel={handleCancelForm}
                            userPermissions={userPermissions}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Proveedores</h2>
                            {userPermissions.includes('Crear Proveedores') && (
                                <Button onClick={handleCreateSupplier} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Nuevo Proveedor
                                </Button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <SuppliersTable
                                suppliers={suppliers}
                                perPage={filters.per_page || "10"}
                                onPerPageChange={() => { }}
                                onEditSupplier={handleEditSupplier}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ""}
                                onSearch={handleSearch}
                                userPermissions={userPermissions}
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
