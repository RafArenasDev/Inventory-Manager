import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { DollarSign, Plus } from 'lucide-react';
import { useState } from 'react';
import TransactionForm from './transactionForm';
import TransactionsTable from './transactionsTable';

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
    // Solo para mostrar en el título del modal de edición ("Editar
    // Transacción: Gasto — Arriendo") — el id crudo no dice nada de un
    // vistazo. No se manda al backend.
    category_name?: string;
    amount: number;
    transaction_date: string;
    transaction_time: string;
    payment_method: string;
    description: string | null;
    notes: string | null;
    invoice_number: string | null;
    sale_id?: number | null;
}

interface TransactionFilters {
    search?: string;
    per_page?: string;
    date_from?: string;
    date_to?: string;
    category_id?: string;
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
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Finanzas',
        href: '/transactions',
    },
];

export default function TransactionsPage({ transactions, categories, filters, totals, totalCount, filteredCount }: TransactionsPageProps) {
    useLiveRefresh(['finance'], () => router.reload());

    const [isCreating, setIsCreating] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingTransaction;

    const handleCreateTransaction = () => {
        // Hora de Bogotá explícita: `toISOString()` da la fecha en UTC, lo que
        // desalinea transaction_date respecto a la hora local cerca de la
        // medianoche UTC (7pm-12am hora Bogotá).
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        setEditingTransaction({
            type: '' as 'Ingreso' | 'Gasto',
            transaction_category_id: 0,
            amount: 0,
            transaction_date: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`,
            transaction_time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
            payment_method: '',
            description: null,
            notes: null,
            invoice_number: null,
        });
        setIsCreating(true);
    };

    const handleEditTransaction = (transaction: Transaction) => {
        setEditingTransaction({
            id: transaction.id,
            type: transaction.type,
            transaction_category_id: transaction.transaction_category_id,
            category_name: transaction.category?.name,
            amount: transaction.amount,
            transaction_date: transaction.transaction_date,
            transaction_time: transaction.transaction_time,
            payment_method: transaction.payment_method,
            description: transaction.description,
            notes: transaction.notes,
            invoice_number: transaction.invoice_number,
            sale_id: transaction.sale_id,
        });
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingTransaction(null);
        setIsCreating(false);
        setIsFormDirty(false);
    };

    const attemptCloseForm = () => {
        if (!isFormDirty) {
            closeForm();
            return;
        }

        setShowDiscardConfirm(true);
    };

    const handleSearch = (search: string) => {
        router.post(
            route('transactions.search'),
            {
                ...filters,
                search,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    // El cambio de per_page ya lo maneja Pagination internamente (POST a
    // transactions.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handlePeriodChange = (range: { date_from?: string; date_to?: string }) => {
        router.post(
            route('transactions.search'),
            {
                ...filters,
                date_from: range.date_from ?? '',
                date_to: range.date_to ?? '',
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const hasMultiplePages = totalCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Finanzas" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={DollarSign} title="Finanzas" description="Registra los ingresos y gastos del negocio.">
                    {userPermissions.includes('Crear Finanzas') && (
                        <Button onClick={handleCreateTransaction} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nueva Transacción
                        </Button>
                    )}
                </PageHeader>
                <div
                    className={`bg-card relative overflow-hidden rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60 ${hasMultiplePages ? 'flex-1' : ''}`}
                >
                    <div className="h-full px-6 py-4">
                        <TransactionsTable
                            transactions={transactions}
                            categories={categories}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={handlePerPageChange}
                            onEditTransaction={handleEditTransaction}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ''}
                            onSearch={handleSearch}
                            onPeriodChange={handlePeriodChange}
                            totals={totals}
                            userPermissions={userPermissions}
                            extraFilters={{ date_from: filters.date_from, date_to: filters.date_to }}
                            filters={filters}
                        />
                    </div>
                </div>
            </div>

            <Dialog
                open={isModalOpen}
                onOpenChange={(open) => {
                    if (!open) attemptCloseForm();
                }}
            >
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>
                            {isCreating
                                ? 'Nueva Transacción'
                                : `Editar ${editingTransaction?.type ?? 'Transacción'}${editingTransaction?.category_name ? ` — ${editingTransaction.category_name}` : ''}`}
                        </DialogTitle>
                        <DialogDescription>
                            {isCreating ? 'Completa los datos para registrar una nueva transacción.' : 'Actualiza los datos de la transacción.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingTransaction && (
                        <TransactionForm
                            transaction={editingTransaction}
                            categories={categories}
                            onCancel={attemptCloseForm}
                            onSaved={closeForm}
                            onDirtyChange={setIsFormDirty}
                            userPermissions={userPermissions}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                title="¿Descartar cambios?"
                description="Tienes cambios sin guardar que se perderán."
                confirmText="Sí, descartar"
                cancelText="Seguir editando"
                onConfirm={closeForm}
            />
        </AppLayout>
    );
}
