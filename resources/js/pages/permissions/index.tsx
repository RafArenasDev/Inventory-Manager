import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import PermissionsTable from './permissionsTable';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Key, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import PermissionForm from './permissionForm';
import { PageHeader } from '@/components/page-header';

interface Permission {
    id: number;
    name: string;
    label: string;
    module: string;
    description: string;
}

interface PermissionIndexProps {
    permissions: {
        data: Permission[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
        per_page: number;
    };
    filters: {
        search?: string;
        per_page?: string;
    };
    totalCount: number;
    filteredCount: number;
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Permisos',
        href: '/permissions',
    },
];

export default function PermissionIndex({
    permissions,
    filters,
    totalCount,
    filteredCount
}: PermissionIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Permiso',
                    href: '/permissions/create',
                },
            ]);
            window.history.replaceState({}, '', route('permissions.create'));
        } else if (editingPermission) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Permiso`,
                    href: `/permissions/${editingPermission.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('permissions.edit', editingPermission.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('permissions.index'));
        }
    }, [isCreating, editingPermission]);

    const handleEditPermission = (permission: Permission) => {
        setEditingPermission(permission);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingPermission(null);
        setIsCreating(false);
    };

    const handlePerPageChange = (value: string) => {
        router.get(route('permissions.index'), {
            ...filters,
            per_page: value
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handleSearch = (search: string) => {
        router.get(route('permissions.index'), {
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
            <Head title="Permisos" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || editingPermission ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <PageHeader
                            icon={Key}
                            title={isCreating ? 'Nuevo Permiso' : `Editar Permiso: ${editingPermission?.label}`}
                        >
                            <Button onClick={handleCancelForm} className="gap-1">
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </PageHeader>
                        <div className="mt-6">
                            <PermissionForm
                                permission={editingPermission ?? undefined}
                                onCancel={handleCancelForm}
                                userPermissions={userPermissions}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <PageHeader
                            icon={Key}
                            title="Permisos"
                            description="Administra los permisos que pueden asignarse a los roles."
                        >
                            {userPermissions.includes('Crear Permisos') && (
                                <Button onClick={() => setIsCreating(true)} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Nuevo Permiso
                                </Button>
                            )}
                        </PageHeader>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <PermissionsTable
                                permissions={permissions}
                                perPage={filters.per_page || "10"}
                                onPerPageChange={handlePerPageChange}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ''}
                                onSearch={handleSearch}
                                onEditPermission={handleEditPermission}
                                userPermissions={userPermissions}
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
