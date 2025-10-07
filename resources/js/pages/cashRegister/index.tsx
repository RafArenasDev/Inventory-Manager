import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import CashRegisterTable from './cashRegisterTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Clock } from 'lucide-react';
import CashRegisterForm from './cashRegisterForm';

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
    register_date: string;
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
    creating?: boolean;
    editingCashRegister?: CashRegister;
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    { title: 'Cajas', href: '/cash-register' },
];

export default function CashRegisterIndex({
    cashRegisters,
    filters,
    totalCount,
    filteredCount,
    todayRegister,
    creating = false,
    editingCashRegister
}: CashRegisterIndexProps) {
    const [isCreating] = useState(creating);
    const [currentEditingCashRegister] = useState<CashRegisterForForm | undefined>(
        editingCashRegister ? {
            id: editingCashRegister.id,
            register_date: editingCashRegister.register_date,
            opening_amount: editingCashRegister.opening_amount,
            closing_amount: editingCashRegister.closing_amount || editingCashRegister.opening_amount,
            notes: editingCashRegister.notes || '',
        } : undefined
    );
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions || [];

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                { title: 'Abrir Caja', href: '/cash-register/create' },
            ]);
        } else if (currentEditingCashRegister) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                { title: `Cerrar Caja: ${currentEditingCashRegister.register_date}`, href: `/cash-register/${currentEditingCashRegister.id}/edit` },
            ]);
        } else {
            setBreadcrumbs(initialBreadcrumbs);
        }
    }, [isCreating, currentEditingCashRegister]);

    const handleCreateCashRegister = () => {
        router.get(route('cash-register.create'));
    };

    const handleEditCashRegister = (cashRegister: CashRegister) => {
        router.get(route('cash-register.edit', cashRegister.id));
    };

    const handleCancelForm = () => {
        router.get(route('cash-register.index'), {}, { replace: true });
    };

    const handleSearch = (search: string) => {
        router.get(route('cash-register.index'), {
            ...filters,
            search,
            page: 1,
        }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Caja" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || currentEditingCashRegister ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Abrir Caja' : `Cerrar Caja: ${currentEditingCashRegister?.register_date}`}
                            </h2>
                            <Button onClick={handleCancelForm} className="gap-1">
                                <ChevronLeft className="h-4 w-4" /> Atrás
                            </Button>
                        </div>
                        <CashRegisterForm
                            cashRegister={currentEditingCashRegister}
                            onCancel={handleCancelForm}
                            userPermissions={userPermissions}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Cajas</h2>
                            {userPermissions.includes('Crear Caja') && !todayRegister && (
                                <Button onClick={handleCreateCashRegister}
                                 className="gap-1 bg-green-500 text-white">
                                    <Clock className="h-4 w-4" /> Abrir Caja
                                </Button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <CashRegisterTable
                                cashRegisters={cashRegisters}
                                perPage={filters.per_page || '10'}
                                onPerPageChange={() => {}}
                                onEditCashRegister={handleEditCashRegister}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ''}
                                onSearch={handleSearch}
                                userPermissions={userPermissions}
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
