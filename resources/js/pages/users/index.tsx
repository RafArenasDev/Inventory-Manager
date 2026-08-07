import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import UsersTable from './usersTable';
import UserForm from './usersForm';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
}

interface Role {
    id: number;
    name: string;
    label: string;
}

interface UserForForm {
    id?: number;
    name: string;
    email: string;
    roles: string[];
    password?: string;
    confirm_password?: string;
}

interface UserIndexProps {
    users: {
        data: User[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    roles: Role[];
    filters: {
        search?: string;
        per_page?: string;
    };
    totalCount: number;
    filteredCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Usuarios',
        href: '/users',
    },
];

export default function UserIndex({ users, roles, filters, totalCount, filteredCount }: UserIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState<UserForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingUser;

    const handleCreateUser = () => {
        setEditingUser({ name: '', email: '', roles: [], password: '', confirm_password: '' });
        setIsCreating(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser({
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            password: '',
            confirm_password: '',
        });
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingUser(null);
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
    // users.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handleSearch = (search: string) => {
        router.post(route('users.search'), { ...filters, search, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader
                    icon={Users}
                    title="Usuarios"
                    description="Gestiona las cuentas de acceso al sistema."
                >
                    {userPermissions.includes('Crear Usuarios') && (
                        <Button onClick={handleCreateUser} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    )}
                </PageHeader>
                <div className="bg-card overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <UsersTable
                        users={users}
                        roles={roles}
                        perPage={filters.per_page || '10'}
                        onPerPageChange={handlePerPageChange}
                        onEditUser={handleEditUser}
                        totalCount={totalCount}
                        filteredCount={filteredCount}
                        search={filters.search || ''}
                        onSearch={handleSearch}
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
                        <DialogTitle>{isCreating ? 'Nuevo Usuario' : `Editar Usuario: ${editingUser?.name}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Completa los datos para crear un nuevo usuario.'
                                : 'Actualiza los datos del usuario.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <UserForm
                            user={editingUser}
                            roles={roles}
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
