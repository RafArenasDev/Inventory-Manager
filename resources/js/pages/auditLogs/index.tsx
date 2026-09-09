import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { History } from 'lucide-react';
import AuditLogsTable from './auditLogsTable';

interface AuditLog {
    id: number;
    user_name: string;
    action: string;
    subject_type: string | null;
    subject_id: number | null;
    reason: string | null;
    created_at: string;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface AuditLogsIndexProps {
    auditLogs: {
        data: AuditLog[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    filters: {
        search?: string;
        per_page?: string;
        date_from?: string;
        date_to?: string;
    };
    totalCount: number;
    filteredCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Auditoría', href: '/audit-logs' }];

export default function AuditLogsIndex({ auditLogs, filters, totalCount, filteredCount }: AuditLogsIndexProps) {
    const handleSearch = (search: string) => {
        router.post(route('audit-logs.search'), { ...filters, search, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    // El cambio de per_page ya lo maneja Pagination internamente (POST a
    // audit-logs.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handlePeriodChange = (range: { date_from?: string; date_to?: string }) => {
        router.post(
            route('audit-logs.search'),
            { ...filters, date_from: range.date_from ?? '', date_to: range.date_to ?? '', page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    const hasMultiplePages = filteredCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auditoría" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={History} title="Auditoría" description="Historial de acciones críticas: quién, qué, cuándo y por qué." />
                <div
                    className={`bg-card relative overflow-hidden rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60 ${hasMultiplePages ? 'flex-1' : ''}`}
                >
                    <div className="h-full px-6 py-4">
                        <AuditLogsTable
                            auditLogs={auditLogs}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={handlePerPageChange}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ''}
                            onSearch={handleSearch}
                            onPeriodChange={handlePeriodChange}
                            extraFilters={{ date_from: filters.date_from, date_to: filters.date_to }}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
