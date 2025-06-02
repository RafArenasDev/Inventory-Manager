import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import PermissionsTable from './permissionsTable';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Permisos',
        href: '/permissions',
    },
];

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

export default function PermissionIndex({
    permissions,
    filters,
    totalCount,
    filteredCount
}: PermissionIndexProps) {
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
            page: 1 // Reset to first page when searching
        }, {
            preserveState: true,
            replace: true
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permisos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Permisos</h2>
                    <Link href={route('permissions.create')}>
                        <Button className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Permiso
                        </Button>
                    </Link>
                </div>
                <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <PermissionsTable
                        permissions={permissions}
                        perPage={filters.per_page || "10"}
                        onPerPageChange={handlePerPageChange}
                        totalCount={totalCount}
                        filteredCount={filteredCount}
                        search={filters.search || ''}
                        onSearch={handleSearch}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
