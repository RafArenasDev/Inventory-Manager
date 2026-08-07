import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import CashRegisterTable from './cashRegisterTable';
import { Button } from '@/components/ui/button';
import { Clock, Wallet } from 'lucide-react';
import CashRegisterForm from './cashRegisterForm';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

interface CashRegisterForForm {
    id?: number;
    register_date?: string;
    opening_amount: number;
    closing_amount: number;
    notes: string;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface CashRegisterIndexProps {
    cashRegisters: {
        data: CashRegister[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    filters: {
        search?: string;
        per_page?: string;
    };
    totalCount: number;
    filteredCount: number;
    todayRegister: CashRegister | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Caja', href: '/cash-register' },
];

export default function CashRegisterIndex({
    cashRegisters,
    filters,
    totalCount,
    filteredCount,
    todayRegister,
}: CashRegisterIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingCashRegister, setEditingCashRegister] = useState<CashRegisterForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions || [];

    const isModalOpen = isCreating || !!editingCashRegister;

    const handleCreateCashRegister = () => {
        setEditingCashRegister({ opening_amount: 0, closing_amount: 0, notes: '' });
        setIsCreating(true);
    };

    const handleEditCashRegister = (cashRegister: CashRegister) => {
        setEditingCashRegister({
            id: cashRegister.id,
            register_date: cashRegister.register_date,
            opening_amount: cashRegister.opening_amount,
            closing_amount: cashRegister.closing_amount || cashRegister.opening_amount,
            notes: cashRegister.notes || '',
        });
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingCashRegister(null);
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
        router.get(route('cash-register.index'), {
            ...filters,
            search,
            page: 1,
        }, { preserveState: true, replace: true });
    };

    const handlePerPageChange = (value: string) => {
        router.get(route('cash-register.index'), {
            ...filters,
            per_page: value,
        }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Caja" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader
                    icon={Wallet}
                    title="Cajas"
                    description="Controla la apertura y cierre de caja de cada jornada."
                >
                    {userPermissions.includes('Crear Caja') && !todayRegister && (
                        <Button onClick={handleCreateCashRegister} className="gap-1 bg-green-500 text-white">
                            <Clock className="h-4 w-4" /> Abrir Caja
                        </Button>
                    )}
                </PageHeader>
                <div className="bg-card overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <CashRegisterTable
                        cashRegisters={cashRegisters}
                        perPage={filters.per_page || '10'}
                        onPerPageChange={handlePerPageChange}
                        onEditCashRegister={handleEditCashRegister}
                        totalCount={totalCount}
                        filteredCount={filteredCount}
                        search={filters.search || ''}
                        onSearch={handleSearch}
                        userPermissions={userPermissions}
                    />
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) attemptCloseForm(); }}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'Abrir Caja' : `Cerrar Caja: ${editingCashRegister?.register_date ?? ''}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Abre la caja para iniciar la jornada.'
                                : 'Registra el cierre de caja de la jornada.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingCashRegister && (
                        <CashRegisterForm
                            cashRegister={editingCashRegister}
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
