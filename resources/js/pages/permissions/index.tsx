import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import PermissionsTable from './permissionsTable';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Key, Plus } from 'lucide-react';
import { useState } from 'react';
import PermissionForm from './permissionForm';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

const breadcrumbs: BreadcrumbItem[] = [
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
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingPermission;

    const handleCreatePermission = () => {
        setEditingPermission(null);
        setIsCreating(true);
    };

    const handleEditPermission = (permission: Permission) => {
        setEditingPermission(permission);
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingPermission(null);
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
                <PageHeader
                    icon={Key}
                    title="Permisos"
                    description="Administra los permisos que pueden asignarse a los roles."
                >
                    {userPermissions.includes('Crear Permisos') && (
                        <Button onClick={handleCreatePermission} className="gap-1">
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
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) attemptCloseForm(); }}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'Nuevo Permiso' : `Editar Permiso: ${editingPermission?.label}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Selecciona la acción y el módulo para generar el nuevo permiso.'
                                : 'Actualiza la acción y el módulo del permiso.'}
                        </DialogDescription>
                    </DialogHeader>
                    <PermissionForm
                        permission={editingPermission ?? undefined}
                        onCancel={attemptCloseForm}
                        onSaved={closeForm}
                        onDirtyChange={setIsFormDirty}
                        userPermissions={userPermissions}
                    />
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
