import { IconActionButton } from '@/components/icon-action-button';
import { PeriodFilter } from '@/components/period-filter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Eye, History } from 'lucide-react';
import { useState } from 'react';

interface AuditLog {
    id: number;
    user_name: string;
    module: string | null;
    action: string;
    action_label: string;
    subject_type: string | null;
    subject_id: number | null;
    subject_label: string | null;
    reason: string | null;
    changes: Record<string, [unknown, unknown]> | null;
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
    userPermissions: string[];
    extraFilters?: Record<string, string | undefined>;
}

export default function AuditLogsTable({
    auditLogs,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onPeriodChange,
    userPermissions,
    extraFilters,
}: AuditLogsTableProps) {
    const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (extraFilters?.date_from) params.append('date_from', extraFilters.date_from);
        if (extraFilters?.date_to) params.append('date_to', extraFilters.date_to);
        const exportUrl = route('audit-logs.export') + '?' + params.toString();
        window.open(exportUrl, '_blank');
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
                    <SearchInput
                        placeholder="Buscar por usuario, acción, registro o motivo..."
                        searchValue={search}
                        onSearch={onSearch}
                        className="w-full sm:max-w-lg"
                    />
                    <PeriodFilter onChange={onPeriodChange} />
                </div>
                {userPermissions.includes('Exportar Auditoría') && (
                    <Button
                        size="sm"
                        onClick={handleExport}
                        title="Exportar auditoría a Excel (respeta el filtro aplicado)"
                        className="gap-2 bg-gray-500 text-white hover:bg-gray-600"
                    >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                    </Button>
                )}
            </div>

            <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Fecha y Hora</TableHead>
                            <TableHead>Módulo</TableHead>
                            <TableHead>Acción</TableHead>
                            <TableHead>Registro afectado</TableHead>
                            <TableHead>Motivo</TableHead>
                            <TableHead className="text-right">Detalle</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {auditLogs.data.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{log.user_name}</TableCell>
                                <TableCell className="whitespace-nowrap">{log.created_at}</TableCell>
                                <TableCell>{log.module ?? '-'}</TableCell>
                                <TableCell>{log.action_label}</TableCell>
                                <TableCell className="max-w-[260px] truncate" title={log.subject_label ?? undefined}>
                                    {log.subject_label ?? '-'}
                                </TableCell>
                                <TableCell className="max-w-[260px] text-sm text-gray-700 dark:text-gray-300">{log.reason || '-'}</TableCell>
                                <TableCell className="text-right">
                                    {log.changes && Object.keys(log.changes).length > 0 ? (
                                        <IconActionButton
                                            variant="ghost"
                                            onClick={() => setDetailLog(log)}
                                            className="text-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:text-sky-500 dark:hover:bg-sky-950/40 dark:hover:text-sky-400"
                                            label="Ver detalle del cambio"
                                        >
                                            <Eye className="size-3.5" />
                                        </IconActionButton>
                                    ) : (
                                        <span className="text-gray-400 dark:text-gray-600">-</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {auditLogs.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-gray-500 dark:text-gray-400">
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

            <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogTitle>Detalle del cambio</DialogTitle>
                    <DialogDescription>
                        {detailLog?.subject_label} — {detailLog?.action_label.toLowerCase()}
                    </DialogDescription>
                    <div className="max-h-[50vh] overflow-y-auto rounded-md border">
                        <Table>
                            <TableHeader className="bg-gray-400 dark:bg-gray-700">
                                <TableRow>
                                    <TableHead>Campo</TableHead>
                                    <TableHead>Antes</TableHead>
                                    <TableHead>Después</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(detailLog?.changes ?? {}).map(([field, value]) => {
                                    const [before, after] = Array.isArray(value) ? value : [null, value];
                                    return (
                                        <TableRow key={field}>
                                            <TableCell className="font-mono text-xs">{field}</TableCell>
                                            <TableCell className="text-xs text-gray-500 dark:text-gray-400">{String(before ?? '-')}</TableCell>
                                            <TableCell className="text-xs font-medium">{String(after ?? '-')}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
