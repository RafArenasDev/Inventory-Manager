import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import RolesTable from './rolesTable';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
        links: unknown[]
    }
    permissions: Permission[]
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: '/roles',
    },
];

export default function RoleIndex({ roles, permissions }: RoleIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
                    <Link href={route('roles.create')}>
                        <Button className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Rol
                        </Button>
                    </Link>
                </div>
                <div className="bg-white dark:bg-black overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <RolesTable
                        roles={{
                            data: roles.data,
                            links: roles.links as LinkProps[], // Replace 'LinkProps[]' with the correct type if needed
                            from: 1, // Replace with actual value if available
                            to: roles.data.length, // Replace with actual value if available
                            total: roles.data.length // Replace with actual value if available
                        }}
                        permissions={permissions}
                        perPage="10"
                        onPerPageChange={() => {}}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
