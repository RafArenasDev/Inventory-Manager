import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import RolesTable from './rolesTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import RoleForm from './roleForm';

interface Role {
    id: number
    name: string
    label: string
    description: string
    permissions: Permission[]
    created_at: string
    updated_at: string
}

interface Permission {
    id: number
    name: string
    label: string
    module: string
}

interface RoleIndexProps {
    roles: {
        data: Role[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    permissions: Record<string, Permission[]>
    filters: {
        search?: string
        per_page?: string
    }
    totalCount: number
    filteredCount: number
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: '/roles',
    },
];

export default function RoleIndex({ roles, permissions, filters, totalCount, filteredCount }: RoleIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Rol',
                    href: '/roles/create',
                },
            ]);
            // Usamos replace: true para evitar agregar una nueva entrada al historial
            window.history.replaceState({}, '', route('roles.create'));
        } else if (editingRole) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Rol`,
                    href: `/roles/${editingRole.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('roles.edit', editingRole.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('roles.index'));
        }
    }, [isCreating, editingRole]);

    const handleCreateRole = () => {
        setEditingRole(null);
        setIsCreating(true);
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingRole(null);
        setIsCreating(false);
    };

    const handleSearch = (search: string) => {
        router.get(route('roles.index'), {
            ...filters,
            search,
            page: 1 // Reset to first page when searching
        }, {
            preserveState: true,
            replace: true
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Mostrar formulario o lista según el estado */}
                {isCreating || editingRole ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Nuevo Rol' : `Editar Rol: ${editingRole?.label}`}
                            </h2>
                            <Button
                                onClick={handleCancelForm}
                                className="gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <RoleForm
                            role={editingRole ?? undefined}
                            permissions={permissions}
                            onCancel={handleCancelForm}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
                            <Button onClick={handleCreateRole} className="gap-1">
                                <Plus className="h-4 w-4" />
                                Nuevo Rol
                            </Button>
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <RolesTable
                                roles={roles}
                                permissions={permissions}
                                perPage={filters.per_page || "10"}
                                onPerPageChange={() => { }}
                                onEditRole={handleEditRole}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ""}
                                onSearch={handleSearch}
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
