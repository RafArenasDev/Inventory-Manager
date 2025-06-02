import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import RolesTable from './rolesTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Modal from '@/components/ui/modal';
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: '/roles',
    },
];

export default function RoleIndex({ roles, permissions, filters, totalCount, filteredCount }: RoleIndexProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined);

    const handleCreateRole = () => {
        setSelectedRole(undefined);
        setIsModalOpen(true);
    };

    const handleEditRole = (role: Role) => {
        setSelectedRole(role);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRole(undefined);
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
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={selectedRole ? `Editar Rol: ${selectedRole.label}` : 'Crear Rol'}
                size="lg"
            >
                <RoleForm
                    role={selectedRole}
                    permissions={permissions}
                    onCancel={handleCloseModal}
                />
            </Modal>
        </AppLayout>
    );
}
