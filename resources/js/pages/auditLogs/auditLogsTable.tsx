import { PeriodFilter } from '@/components/period-filter';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History } from 'lucide-react';

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

interface AuditLogsTableProps {
    auditLogs: {
        data: AuditLog[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    perPage: string;
    onPerPageChange: (value: string) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    onPeriodChange: (range: { date_from: string; date_to: string }) => void;
    extraFilters?: Record<string, string | undefined>;
}

// El identificador técnico (ej. "sale.cancelled") no es lo que debe leer un
// administrador — se traduce a una frase corta y clara.
const ACTION_LABELS: Record<string, string> = {
    'sale.cancelled': 'Anuló una venta',
    'client.anonymized': 'Anonimizó un cliente',
    'client.deleted': 'Eliminó un cliente',
    'inventory.manual_adjustment': 'Ajuste manual de inventario',
};

export default function AuditLogsTable({
    auditLogs,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onPeriodChange,
    extraFilters,
}: AuditLogsTableProps) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
                    <SearchInput
                        placeholder="Buscar por usuario, acción o motivo..."
                        searchValue={search}
                        onSearch={onSearch}
                        className="w-full sm:max-w-lg"
                    />
                    <PeriodFilter onChange={onPeriodChange} />
                </div>
            </div>

            <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Acción</TableHead>
                            <TableHead>Registro afectado</TableHead>
                            <TableHead>Motivo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {auditLogs.data.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap">{log.created_at}</TableCell>
                                <TableCell>{log.user_name}</TableCell>
                                <TableCell>{ACTION_LABELS[log.action] ?? log.action}</TableCell>
                                <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                    {log.subject_type ? `${log.subject_type} #${log.subject_id}` : '-'}
                                </TableCell>
                                <TableCell className="max-w-[320px] text-sm text-gray-700 dark:text-gray-300">{log.reason || '-'}</TableCell>
                            </TableRow>
                        ))}
                        {auditLogs.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <History className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No hay registros de auditoría en este período</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={auditLogs}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="audit-logs.search"
                extraFilters={extraFilters}
            />
        </div>
    );
}
