import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import CashRegisterTable from './cashRegisterTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import CashRegisterForm from './cashRegisterForm';

interface CashRegister {
    id: number;
    register_date: string;
    opening_balance: number;
    total_sales: number;
    total_income: number;
    total_expenses: number;
    expected_balance: number;
    actual_balance: number | null;
    difference: number | null;
    opened_by: number;
    closed_by: number | null;
    opened_at: string;
    closed_at: string | null;
    is_closed: boolean;
    opening_notes: string | null;
    closing_notes: string | null;
}

interface CashRegisterForForm {
    id?: number;
    register_date: string;
    opening_balance: number;
    actual_balance?: number;
    opening_notes?: string;
    closing_notes?: string;
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
        date_from?: string;
        date_to?: string;
        status?: string;
    };
    totalCount: number;
    filteredCount: number;
    todayRegister: CashRegister | null;
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cajas',
        href: '/cash-register',
    },
];

export default function CashRegisterIndex({ cashRegisters, filters, totalCount, filteredCount, todayRegister }: CashRegisterIndexProps) {
    const [isOpening, setIsOpening] = useState(false);
    const [closingCashRegister, setClosingCashRegister] = useState<CashRegisterForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (isOpening) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Abrir Caja',
                    href: '/cash-register/open',
                },
            ]);
            window.history.replaceState({}, '', route('cash-register.open'));
        } else if (closingCashRegister) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Cerrar Caja`,
                    href: `/cash-register/${closingCashRegister.id}/close`,
                },
            ]);
            window.history.replaceState({}, '', route('cash-register.close', closingCashRegister.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('cash-register.index'));
        }
    }, [isOpening, closingCashRegister]);

    const handleOpenCashRegister = () => {
        setClosingCashRegister(null);
        setIsOpening(true);
    };

    const handleCloseCashRegister = (cashRegister: CashRegister) => {
        const cashRegisterForForm: CashRegisterForForm = {
            id: cashRegister.id,
            register_date: cashRegister.register_date,
            actual_balance: 0,
            closing_notes: '',
            opening_balance: 0
        };
        setClosingCashRegister(cashRegisterForForm);
        setIsOpening(false);
    };

    const handleCancelForm = () => {
        setClosingCashRegister(null);
        setIsOpening(false);
    };

    const handleSearch = (search: string) => {
        router.get(route('cash-register.index'), {
            ...filters,
            search,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cajas" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isOpening || closingCashRegister ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isOpening ? 'Abrir Caja' : `Cerrar Caja: ${closingCashRegister?.register_date}`}
                            </h2>
                            <Button
                                onClick={handleCancelForm}
                                className="gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <CashRegisterForm
                            cashRegister={closingCashRegister ?? undefined}
                            onCancel={handleCancelForm}
                            isOpening={isOpening}
                            userPermissions={userPermissions}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Cajas</h2>
                            {userPermissions.includes('Abrir Cajas') && !todayRegister && (
                                <Button onClick={handleOpenCashRegister} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Abrir Caja
                                </Button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <CashRegisterTable
                                cashRegisters={cashRegisters}
                                perPage={filters.per_page || "10"}
                                onPerPageChange={() => { }}
                                onCloseCashRegister={handleCloseCashRegister}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ""}
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
