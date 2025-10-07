import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Download } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import SearchInput from "@/components/ui/search-input"
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
        data: Transaction[]
        links: LinkProps[]
        from: number
        to: number;
        total: number
    }
    categories: TransactionCategory[]
    perPage: string
    onPerPageChange: (perPage: string) => void
    onEditTransaction: (transaction: Transaction) => void
    totalCount: number
    filteredCount: number
    search: string
    onSearch: (search: string) => void
    totals: {
        total_amount: number
        total_count: number
    }
    userPermissions: string[]
    filters: TransactionFilters
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
    userPermissions,
    }: TransactionsTableProps) {

    // console.log("Datos recibidos:", transactions.data);

    const formatDate = (dateString: string) => {
        try {
            if (dateString.includes('T')) {
                const date = new Date(dateString);
                return date.toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const [year, month, day] = dateString.split('-');
                return `${day}/${month}/${year}`;
            }
            return 'N/A';
        } catch (error) {
            console.error('Error formateando fecha:', dateString, error);
            return 'N/A';
        }
    };

    const formatTime = (timeString: string) => {
        try {
            if (!timeString) return 'N/A';
            const date = new Date(timeString);
            if (isNaN(date.getTime())) {
                return 'N/A';
            }
            return date.toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formateando hora:', timeString, error);
            return 'N/A';
        }
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getTypeColor = (type: 'Ingreso' | 'Gasto') => {
        return type === 'Ingreso' ? 'bg-green-500' : 'bg-red-500';
    };

    const handleExport = () => {
        const exportUrl = route('transactions.export');
        window.open(exportUrl, '_blank');
    };

    const showActionsColumn = userPermissions.includes('Editar Finanzas');

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <SearchInput
                    placeholder="Buscar por descripción o referencia..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:w-auto"
                />
                {userPermissions.includes('Exportar Transacciones') && (
                    <Button
                        onClick={handleExport}
                        className="gap-2"
                        variant="outline"
                    >
                        <Download className="h-4 w-4" />
                        Exportar
                    </Button>
                )}
            </div>

            <div className="rounded-md border overflow-hidden">
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
                                    <span className={`px-3 py-1 ${getTypeColor(transaction.type)} text-white text-xs font-semibold rounded-full`}>
                                        {transaction.type}
                                    </span>
                                </TableCell>
                                <TableCell>{transaction.category.name}</TableCell>
                                <TableCell className="font-semibold">
                                    {formatAmount(transaction.amount)}
                                </TableCell>
                                <TableCell>{transaction.payment_method}</TableCell>
                                <TableCell>
                                    {formatDate(transaction.transaction_date)} - {formatTime(transaction.transaction_time)}
                                </TableCell>
                                <TableCell>
                                    {transaction.invoice_number || 'N/A'}
                                </TableCell>
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
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => onEditTransaction(transaction)}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                    aria-label="Editar transacción"
                                                >
                                                    <Pencil className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
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
            />
        </div>
    )
}
