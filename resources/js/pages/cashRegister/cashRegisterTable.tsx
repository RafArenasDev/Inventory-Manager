import { PeriodFilter } from '@/components/period-filter';
import { Button } from '@/components/ui/button';
import { CurrencyCell } from '@/components/ui/currency-cell';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-datetime';
import { Download, Landmark } from 'lucide-react';

interface CashRegister {
    id: number;
    register_date: string;
    opening_amount: number;
    closing_amount: number;
    total_sales: number;
    other_income: number;
    total_income: number;
    total_expenses: number;
    difference: number;
    opened_by: number;
    closed_by: number;
    opened_at: string;
    closed_at: string;
    opened_at_formatted: string;
    closed_at_formatted: string;
    is_closed: boolean;
    notes: string;
    openedBy: { id: number; name: string };
    closedBy: { id: number; name: string };
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface CashRegisterTableProps {
    cashRegisters: {
        data: CashRegister[];
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

export default function CashRegisterTable({
    cashRegisters,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onPeriodChange,
    userPermissions,
    extraFilters,
}: CashRegisterTableProps) {
    const handleExport = () => {
        const exportUrl = route('cash-register.export');
        window.open(exportUrl, '_blank');
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
                    <SearchInput
                        placeholder="Buscar por usuario o notas..."
                        searchValue={search}
                        onSearch={onSearch}
                        className="w-full sm:max-w-lg"
                    />
                    <PeriodFilter onChange={onPeriodChange} />
                </div>
                {userPermissions.includes('Exportar Caja') && (
                    <Button
                        size="sm"
                        onClick={handleExport}
                        title="Exportar cajas a Excel"
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
                            <TableHead>Fecha Apertura</TableHead>
                            <TableHead>Monto Apertura</TableHead>
                            <TableHead>Ventas</TableHead>
                            <TableHead>Otros Ingresos</TableHead>
                            <TableHead>Egresos</TableHead>
                            <TableHead>Monto Cierre</TableHead>
                            <TableHead>Resultado del Día</TableHead>
                            <TableHead>Notas</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Abierto por</TableHead>
                            <TableHead>Cerrado por</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cashRegisters.data.map((cashRegister) => (
                            <TableRow key={cashRegister.id}>
                                <TableCell>{formatDateTime(cashRegister.opened_at)}</TableCell>
                                <TableCell>
                                    <CurrencyCell value={cashRegister.opening_amount} />
                                </TableCell>
                                <TableCell>
                                    <CurrencyCell value={cashRegister.total_sales} />
                                </TableCell>
                                <TableCell>
                                    <CurrencyCell value={cashRegister.other_income} />
                                </TableCell>
                                <TableCell>
                                    <CurrencyCell value={cashRegister.total_expenses} />
                                </TableCell>
                                <TableCell>{cashRegister.is_closed ? <CurrencyCell value={cashRegister.closing_amount} /> : '-'}</TableCell>
                                <TableCell
                                    className={
                                        !cashRegister.is_closed
                                            ? ''
                                            : cashRegister.difference > 0
                                              ? 'font-semibold text-emerald-600'
                                              : cashRegister.difference < 0
                                                ? 'font-semibold text-rose-600'
                                                : ''
                                    }
                                >
                                    {cashRegister.is_closed ? <CurrencyCell value={cashRegister.difference} showSign /> : '-'}
                                </TableCell>
                                <TableCell>{cashRegister.notes || '-'}</TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex w-20 items-center justify-center rounded-full px-2.5 py-0.5 text-center text-xs font-bold shadow-sm ${
                                            cashRegister.is_closed
                                                ? 'bg-rose-600 text-white dark:bg-rose-700'
                                                : 'bg-emerald-600 text-white dark:bg-emerald-700'
                                        }`}
                                    >
                                        {cashRegister.is_closed ? 'Cerrada' : 'Abierta'}
                                    </span>
                                </TableCell>
                                <TableCell>{cashRegister.openedBy.name}</TableCell>
                                <TableCell>{cashRegister.closedBy?.name || '-'}</TableCell>
                            </TableRow>
                        ))}
                        {cashRegisters.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={11} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Landmark className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron registros de caja</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <Pagination
                data={cashRegisters}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="cash-register.search"
                extraFilters={extraFilters}
            />
        </div>
    );
}
