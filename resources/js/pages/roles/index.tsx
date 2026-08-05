import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import RolesTable from './rolesTable';
import { Button } from '@/components/ui/button';
import { Plus, Shield } from 'lucide-react';
import RoleForm from './roleForm';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

interface RoleForForm {
    id?: number;
    name: string;
    label: string;
    description?: string;
    permissions: number[];
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: '/roles',
    },
];

export default function RoleIndex({ roles, permissions, filters, totalCount, filteredCount }: RoleIndexProps) {
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
            permissions: role.permissions.map((p) => p.id),
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
        router.get(route('roles.index'), {
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
            <Head title="Roles" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader
                    icon={Shield}
                    title="Roles"
                    description="Define los roles disponibles y sus permisos asociados."
                >
                    {userPermissions.includes('Crear Roles') && (
                        <Button onClick={handleCreateRole} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Rol
                        </Button>
                    )}
                </PageHeader>
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
                        userPermissions={userPermissions}
                    />
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) attemptCloseForm(); }}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'Nuevo Rol' : `Editar Rol: ${editingRole?.label}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Completa los datos y selecciona los permisos del nuevo rol.'
                                : 'Actualiza los datos y permisos del rol.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingRole && (
                        <RoleForm
                            role={editingRole}
                            permissions={permissions}
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
