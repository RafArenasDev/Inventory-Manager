import { IconActionButton } from '@/components/icon-action-button';
import { PeriodFilter } from '@/components/period-filter';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatTime } from '@/lib/format-datetime';
import { Download, Pencil, Wallet } from 'lucide-react';
// import Swal from 'sweetalert2'
// import { router } from "@inertiajs/react"

interface TransactionCategory {
    id: number;
    name: string;
    type: 'Ingreso' | 'Gasto';
}

interface Transaction {
    id: number;
    type: 'Ingreso' | 'Gasto';
    transaction_category_id: number;
    category: TransactionCategory;
    amount: number;
    transaction_date: string;
    transaction_time: string;
    payment_method: string;
    description: string | null;
    notes: string | null;
    sale_id: number | null;
    invoice_number: string | null;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface TransactionFilters {
    search?: string;
    per_page?: string;
    date_from?: string;
    date_to?: string;
    category_id?: string;
    status?: string;
    type?: string;
}

interface TransactionsTableProps {
    transactions: {
        data: Transaction[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    categories: TransactionCategory[];
    perPage: string;
    onPerPageChange: (perPage: string) => void;
    onEditTransaction: (transaction: Transaction) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    onPeriodChange: (range: { date_from: string; date_to: string }) => void;
    totals: {
        total_amount: number;
        total_count: number;
    };
    userPermissions: string[];
    extraFilters?: Record<string, string | undefined>;
    filters: TransactionFilters;
}

export default function TransactionsTable({
    transactions,
    perPage,
    onPerPageChange,
    onEditTransaction,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onPeriodChange,
    userPermissions,
    extraFilters,
}: TransactionsTableProps) {
    // console.log("Datos recibidos:", transactions.data);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getTypeColor = (type: 'Ingreso' | 'Gasto') => {
        return type === 'Ingreso' ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-rose-600 dark:bg-rose-700';
    };

    const handleExport = () => {
        const exportUrl = route('transactions.export');
        window.open(exportUrl, '_blank');
    };

    const showActionsColumn = userPermissions.includes('Editar Finanzas');

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
                    <SearchInput
                        placeholder="Buscar por descripción o referencia..."
                        searchValue={search}
                        onSearch={onSearch}
                        className="w-full sm:max-w-lg"
                    />
                    <PeriodFilter onChange={onPeriodChange} />
                </div>
                {userPermissions.includes('Exportar Transacciones') && (
                    <Button onClick={handleExport} className="gap-2 bg-gray-500 text-white hover:bg-gray-600">
                        <Download className="h-4 w-4" />
                        Exportar
                    </Button>
                )}
            </div>

            <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Medio de Pago</TableHead>
                            <TableHead>Fecha y Hora</TableHead>
                            <TableHead>N° Factura/Recibo</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Notas</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.data.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell>
                                    <span
                                        className={`rounded-full px-3 py-0.5 text-xs ${getTypeColor(transaction.type)} w-fit font-bold text-white shadow-sm`}
                                    >
                                        {transaction.type}
                                    </span>
                                </TableCell>
                                <TableCell>{transaction.category.name}</TableCell>
                                <TableCell className="font-semibold">{formatAmount(transaction.amount)}</TableCell>
                                <TableCell>{transaction.payment_method}</TableCell>
                                <TableCell>
                                    {formatDate(transaction.transaction_date)} - {formatTime(transaction.transaction_time)}
                                </TableCell>
                                <TableCell>{transaction.invoice_number || 'N/A'}</TableCell>
                                <TableCell className="max-w-xs">
                                    {transaction.description ? (
                                        <div className="truncate" title={transaction.description}>
                                            {transaction.description}
                                        </div>
                                    ) : (
                                        'N/A'
                                    )}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                    {transaction.notes ? (
                                        <div className="truncate" title={transaction.notes}>
                                            {transaction.notes}
                                        </div>
                                    ) : (
                                        'N/A'
                                    )}
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Editar Finanzas') && !transaction.sale_id && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => onEditTransaction(transaction)}
                                                    className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                    label="Editar transacción"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {transactions.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 9 : 8} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Wallet className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron transacciones</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={transactions}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="transactions.search"
                extraFilters={extraFilters}
            />
        </div>
    );
}
