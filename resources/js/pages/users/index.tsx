import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import UsersTable from './usersTable';

interface User {
    id: number
    name: string
    email: string
    roles: string
}

interface Role {
    id: number
    name: string
    label: string
    description: string
    permissions: unknown[]
    created_at: string
    updated_at: string
}

interface UserIndexProps {
    users: {
        data: User[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    roles: Role[]
    filters: {
        search?: string
        per_page?: string
    }
    totalCount: number
    filteredCount: number
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Usuarios',
        href: '/users',
    },
];

export default function UserIndex({ users, roles, filters, totalCount, filteredCount }: UserIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
                    <Link href={route('users.create')}>
                        <Button className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                    </Link>
                </div>
                <div className="bg-white dark:bg-black overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <UsersTable
                        users={users}
                        roles={roles}
                        perPage={filters.per_page || "10"}
                        onPerPageChange={() => { }}
                        totalCount={totalCount}
                        filteredCount={filteredCount}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
