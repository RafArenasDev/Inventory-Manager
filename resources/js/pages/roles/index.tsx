import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus, Shield } from 'lucide-react';
import { useState } from 'react';
import RoleForm from './roleForm';
import RolesTable from './rolesTable';

interface Permission {
    id: number;
    name: string;
    label: string;
    module: string;
}

interface Role {
    id: number;
    name: string;
    label: string;
    description: string;
    permissions: Permission[];
    created_at: string;
    updated_at: string;
}

interface CatalogModule {
    id: number;
    key: string;
    label: string;
}

interface RoleForForm {
    id?: number;
    name: string;
    label: string;
    description?: string;
    permissions: Permission[];
}

interface RoleIndexProps {
    roles: {
        data: Role[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    permissions: Permission[];
    catalogModules: CatalogModule[];
    filters: {
        search?: string;
        per_page?: string;
    };
    totalCount: number;
    filteredCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles y Permisos',
        href: '/roles',
    },
];

export default function RoleIndex({ roles, permissions, catalogModules, filters, totalCount, filteredCount }: RoleIndexProps) {
    useLiveRefresh(['admin'], () => router.reload());

    const [isCreating, setIsCreating] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingRole;

    const handleCreateRole = () => {
        setEditingRole({ name: '', label: '', description: '', permissions: [] });
        setIsCreating(true);
    };

    const handleEditRole = (role: Role) => {
        setEditingRole({
            id: role.id,
            name: role.name,
            label: role.label,
            description: role.description,
            permissions: role.permissions,
        });
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingRole(null);
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
            route('roles.search'),
            {
                ...filters,
                search,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const hasMultiplePages = totalCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles y Permisos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={Shield} title="Roles y Permisos" description="Define los roles disponibles y los permisos asociados a cada módulo.">
                    {userPermissions.includes('Crear Roles y Permisos') && (
                        <Button onClick={handleCreateRole} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Rol
                        </Button>
                    )}
                </PageHeader>
                <div
                    className={`bg-card relative overflow-hidden rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60 ${hasMultiplePages ? 'flex-1' : ''}`}
                >
                    <div className="h-full px-6 py-4">
                        <RolesTable
                            roles={roles}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={() => {}}
                            onEditRole={handleEditRole}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ''}
                            onSearch={handleSearch}
                            userPermissions={userPermissions}
                        />
                    </div>
                </div>
            </div>

            <Dialog
                open={isModalOpen}
                onOpenChange={(open) => {
                    if (!open) attemptCloseForm();
                }}
            >
                <DialogContent
                    className="flex max-h-[90vh] w-[95vw] flex-col overflow-hidden sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{isCreating ? 'Nuevo Rol' : `Editar Rol: ${editingRole?.label}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating ? 'Completa los datos y selecciona los permisos del nuevo rol.' : 'Actualiza los datos y permisos del rol.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingRole && (
                        <RoleForm
                            role={editingRole}
                            permissions={permissions}
                            catalogModules={catalogModules}
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
