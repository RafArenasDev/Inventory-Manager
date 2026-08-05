import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { X, Download, Landmark } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import SearchInput from "@/components/ui/search-input";

interface CashRegister {
    id: number;
    register_date: string;
    opening_amount: number;
    closing_amount: number;
    total_sales: number;
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
    onPerPageChange: () => void;
    onEditCashRegister: (cashRegister: CashRegister) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    userPermissions: string[];
}

export default function CashRegisterTable({
    cashRegisters,
    perPage,
    onPerPageChange,
    onEditCashRegister,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions,
}: CashRegisterTableProps) {
    const formatCurrency = (value: number) => {
        return value ? '$' + value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '$0';
    };

    const formatDifference = (value: number) => {
        if (value >= 0) {
            return '+$' + value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
        return '-$' + Math.abs(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const handleExport = () => {
        const exportUrl = route('cash-register.export');
        window.open(exportUrl, '_blank');
    };

    const showActionsColumn = userPermissions.includes('Actualizar Caja');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por Fecha o Usuario..."
                    searchValue={search}
                    onSearch={onSearch}
                />
                {userPermissions.includes('Exportar Caja') && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        title="Exportar cajas a Excel"
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                    </Button>
                )}
            </div>
            {filteredCount !== totalCount && (
                <div className="text-sm text-muted-foreground">
                    Mostrando {filteredCount} de {totalCount} registros de caja
                </div>
            )}
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Fecha Apertura</TableHead>
                            <TableHead>Monto Apertura</TableHead>
                            <TableHead>Ventas</TableHead>
                            <TableHead>Ingresos</TableHead>
                            <TableHead>Egresos</TableHead>
                            <TableHead>Monto Cierre</TableHead>
                            <TableHead>Diferencia</TableHead>
                            <TableHead>Notas</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Abierto por</TableHead>
                            <TableHead>Cerrado por</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cashRegisters.data.map((cashRegister) => (
                            <TableRow key={cashRegister.id}>
                                <TableCell>{cashRegister.opened_at_formatted || '-'}</TableCell>
                                <TableCell>{formatCurrency(cashRegister.opening_amount)}</TableCell>
                                <TableCell>{formatCurrency(cashRegister.total_sales)}</TableCell>
                                <TableCell>{formatCurrency(cashRegister.total_income)}</TableCell>
                                <TableCell>{formatCurrency(cashRegister.total_expenses)}</TableCell>
                                <TableCell>{cashRegister.is_closed ? formatCurrency(cashRegister.closing_amount) : '-'}</TableCell>
                                <TableCell className={
                                    !cashRegister.is_closed ? '' :
                                    cashRegister.difference > 0 ? 'text-green-600 font-semibold' :
                                    cashRegister.difference < 0 ? 'text-red-600 font-semibold' : ''
                                }>
                                    {cashRegister.is_closed ? formatDifference(cashRegister.difference) : '-'}
                                </TableCell>
                                <TableCell>{cashRegister.notes || '-'}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border w-20 text-center shadow-sm ${
                                        cashRegister.is_closed
                                            ? 'bg-red-600 text-white dark:bg-red-700'
                                            : 'bg-green-600 text-white dark:bg-green-700'
                                    }`}>
                                        {cashRegister.is_closed ? 'Cerrada' : 'Abierta'}
                                    </span>
                                </TableCell>
                                <TableCell>{cashRegister.openedBy.name}</TableCell>
                                <TableCell>{cashRegister.closedBy?.name || '-'}</TableCell>
                                {showActionsColumn && !cashRegister.is_closed && (
                                    <TableCell className="text-right">
                                        <Button
                                            variant="default"
                                            size="icon"
                                            onClick={() => onEditCashRegister(cashRegister)}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                            aria-label="Cerrar caja"
                                        >
                                            <X className="h-4 w-4 text-white" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {cashRegisters.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 12 : 11} className="h-24 text-center text-gray-500 dark:text-gray-400">
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
            />
        </div>
    );
}
