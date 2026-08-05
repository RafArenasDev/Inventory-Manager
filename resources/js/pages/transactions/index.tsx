import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import TransactionsTable from './transactionsTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, DollarSign, Plus } from 'lucide-react';
import TransactionForm from './transactionForm';
import { PageHeader } from '@/components/page-header';

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

interface TransactionForForm {
    id?: number;
    type: 'Ingreso' | 'Gasto';
    transaction_category_id: number;
    amount: number;
    transaction_date: string;
    transaction_time: string;
    payment_method: string;
    description: string | null;
    notes: string | null;
    invoice_number: string | null;
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

interface TransactionsPageProps {
    transactions: {
        data: Transaction[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    categories: TransactionCategory[];
    filters: TransactionFilters;
    totals: {
        total_amount: number;
        total_count: number;
    };
    totalCount: number;
    filteredCount: number;
    showForm?: boolean;
    editingTransaction?: Transaction;
    showModal?: boolean;
    transactionDetails: Transaction | null;
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Transacciones',
        href: '/transactions',
    },
];

export default function TransactionsPage({
    transactions,
    categories,
    filters,
    totals,
    totalCount,
    filteredCount,
    showForm: initialShowForm = false,
    editingTransaction: initialEditingTransaction,
}: TransactionsPageProps) {
    const [isCreating, setIsCreating] = useState(initialShowForm && !initialEditingTransaction);
    const [editingTransaction, setEditingTransaction] = useState<TransactionForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (initialEditingTransaction) {
            const transactionForForm: TransactionForForm = {
                id: initialEditingTransaction.id,
                type: initialEditingTransaction.type,
                transaction_category_id: initialEditingTransaction.transaction_category_id,
                amount: initialEditingTransaction.amount,
                transaction_date: initialEditingTransaction.transaction_date,
                transaction_time: initialEditingTransaction.transaction_time,
                payment_method: initialEditingTransaction.payment_method,
                description: initialEditingTransaction.description,
                notes: initialEditingTransaction.notes,
                invoice_number: initialEditingTransaction.invoice_number
            };
            setEditingTransaction(transactionForForm);
            setIsCreating(false);
        }
    }, [initialEditingTransaction]);

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Transacción',
                    href: '/transactions/create',
                },
            ]);
            window.history.replaceState({}, '', route('transactions.create'));
        } else if (editingTransaction) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Transacción`,
                    href: `/transactions/${editingTransaction.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('transactions.edit', editingTransaction.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('transactions.index'));
        }
    }, [isCreating, editingTransaction]);

    const handleCreateTransaction = () => {
        const newTransaction: TransactionForForm = {
            type: '',
            transaction_category_id: 0,
            amount: 0,
            transaction_date: new Date().toISOString().split('T')[0],
            transaction_time: new Date().toTimeString().slice(0, 5),
            payment_method: '',
            description: null,
            notes: null,
            invoice_number: null,
        };
        setEditingTransaction(newTransaction);
        setIsCreating(true);
    };

    const handleEditTransaction = (transaction: Transaction) => {
        const transactionForForm: TransactionForForm = {
            id: transaction.id,
            type: transaction.type,
            transaction_category_id: transaction.transaction_category_id,
            amount: transaction.amount,
            transaction_date: transaction.transaction_date,
            transaction_time: transaction.transaction_time,
            payment_method: transaction.payment_method,
            description: transaction.description,
            notes: transaction.notes,
            invoice_number: transaction.invoice_number
        };
        setEditingTransaction(transactionForForm);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingTransaction(null);
        setIsCreating(false);
    };

    const handleSearch = (search: string) => {
        router.get(route('transactions.index'), {
            ...filters,
            search,
            page: 1
        }, {
            preserveState: true,
            replace: true
        });
    };

    const handlePerPageChange = (perPage: string) => {
        router.get(route('transactions.index'), {
            ...filters,
            per_page: perPage,
            page: 1
        }, {
            preserveState: true,
            replace: true
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transacciones" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || editingTransaction ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <PageHeader
                            icon={DollarSign}
                            title={isCreating ? 'Nueva Transacción' : `Editar Transacción: #${editingTransaction?.id}`}
                        >
                            <Button onClick={handleCancelForm} className="gap-1">
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </PageHeader>
                        <div className="mt-6">
                            <TransactionForm
                                transaction={editingTransaction ?? undefined}
                                categories={categories}
                                onCancel={handleCancelForm}
                                userPermissions={userPermissions}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <PageHeader
                            icon={DollarSign}
                            title="Finanzas"
                            description="Registra los ingresos y gastos del negocio."
                        >
                            {userPermissions.includes('Crear Finanzas') && (
                                <Button onClick={handleCreateTransaction} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Nueva Transacción
                                </Button>
                            )}
                        </PageHeader>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <TransactionsTable
                                transactions={transactions}
                                categories={categories}
                                perPage={filters.per_page || "10"}
                                onPerPageChange={handlePerPageChange}
                                onEditTransaction={handleEditTransaction}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ""}
                                onSearch={handleSearch}
                                totals={totals}
                                userPermissions={userPermissions}
                                filters={filters}
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
