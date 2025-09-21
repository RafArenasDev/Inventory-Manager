import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import UsersTable from './usersTable';
import UserForm from './usersForm';

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

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Usuarios',
        href: '/users',
    },
];

export default function UserIndex({ users, roles, filters, totalCount, filteredCount }: UserIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingUser, setEditingUser] = useState<UserForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Usuario',
                    href: '/users/create',
                },
            ]);
            window.history.replaceState({}, '', route('users.create'));
        } else if (editingUser) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Usuario`,
                    href: `/users/${editingUser.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('users.edit', editingUser.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('users.index'));
        }
    }, [isCreating, editingUser]);

    const handleCreateUser = () => {
        const newUser: UserForForm = {
            name: '',
            email: '',
            roles: [],
            password: '',
            confirm_password: '',
        };
        setEditingUser(newUser);
        setIsCreating(true);
    };

    const handleEditUser = (user: User) => {
        const userForForm: UserForForm = {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            password: '',
            confirm_password: '',
        };
        setEditingUser(userForForm);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingUser(null);
        setIsCreating(false);
    };

    const handlePerPageChange = (value: string) => {
        router.get(
            route('users.index'),
            {
                ...filters,
                per_page: value,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const handleSearch = (search: string) => {
        router.get(
            route('users.index'),
            {
                ...filters,
                search,
                page: 1,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || editingUser ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Nuevo Usuario' : `Editar Usuario: ${editingUser?.name}`}
                            </h2>
                            <Button onClick={handleCancelForm} className="gap-1">
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <UserForm
                            user={editingUser ?? undefined}
                            roles={roles}
                            onCancel={handleCancelForm}
                            userPermissions={userPermissions}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
                            {userPermissions.includes('Crear Usuarios') && (
                                <Button onClick={handleCreateUser} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Nuevo Usuario
                                </Button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
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
                    </>
                )}
            </div>
        </AppLayout>
    );
}
