import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AppLayout from '@/layouts/app-layout';
import { resolveIcon } from '@/lib/icon-map';
import { type BreadcrumbItem, type SidebarModule } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import * as Chart from 'chart.js';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Download, LayoutGrid, ShoppingCart, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SaleModal } from './saleModal';
import SaleForm from './sales/saleForm';

// Color por módulo para las tarjetas de acceso directo — una entrada por
// cada `key` de ModuleSeeder. Un módulo nuevo sin color acá cae en el
// gris por defecto (ver MODULE_CARD_COLOR abajo), no rompe nada.
const MODULE_CARD_COLOR: Record<string, string> = {
    users: 'from-blue-600 to-blue-700',
    roles: 'from-violet-600 to-violet-700',
    categories: 'from-cyan-600 to-cyan-700',
    products: 'from-orange-600 to-orange-700',
    suppliers: 'from-teal-600 to-teal-700',
    'inventory-movements': 'from-indigo-600 to-indigo-700',
    'purchase-orders': 'from-amber-600 to-amber-700',
    sales: 'from-emerald-600 to-emerald-700',
    clients: 'from-green-600 to-green-700',
    'cash-register': 'from-rose-600 to-rose-700',
    transactions: 'from-sky-600 to-sky-700',
};

// Todas las tarjetas muestran un contador — mapea cada módulo a su
// conteo en `stats`. Un módulo nuevo sin entrada acá simplemente no
// muestra número (no rompe el layout).
const MODULE_STATS_KEY: Partial<Record<string, keyof DashboardProps['stats']>> = {
    users: 'usuarios',
    roles: 'roles',
    suppliers: 'proveedores',
    clients: 'clientes',
    products: 'productos',
    categories: 'categorias',
    'inventory-movements': 'movimientos',
    'purchase-orders': 'pedidos',
    sales: 'ventas',
    'cash-register': 'caja',
    transactions: 'finanzas',
};

// "Roles y Permisos" es el nombre real del permiso/módulo (debe coincidir
// con `Ver ${module.label}`), pero en la tarjeta angosta del dashboard se
// ve mejor acortado — solo cambia lo que se muestra, no el permiso.
const MODULE_CARD_TITLE: Record<string, string> = {
    roles: 'Roles',
    'inventory-movements': 'Movimientos',
};

// Tailwind necesita las clases completas y literales en el código para
// generarlas — de ahí el mapa en vez de un template string con el
// número. Fuerza SIEMPRE una sola fila en pantallas grandes (según
// cuántos módulos vea este usuario), que es lo que evita el scroll
// vertical del dashboard en desktop.
const GRID_COLS_CLASS: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
    9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10',
    11: 'lg:grid-cols-11',
    12: 'lg:grid-cols-12',
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

type Period = 'diario' | 'semanal' | 'mensual' | 'trimestral' | 'semestral' | 'anual';

interface Product {
    id: number;
    code: string;
    category_id?: number | string;
    category?: string;
    name: string;
    description: string;
    image_path?: string | null;
    price_without_tax?: number | null;
    price_with_tax?: number | null;
    iva_value?: number | null;
    sale_price?: number | null;
    supplier?: string | null;
    supplier_id?: number | null;
    stock: number;
    created_at?: string;
    updated_at?: string;
    movement_date?: string;
    movement_notes?: string;
    initial_movement_id?: number;
}

interface Client {
    id: number;
    document_type: string;
    document_number: number | string;
    verification_digit?: number;
    name: string;
    department_id?: number;
    department?: string;
    city_id?: number;
    city?: string;
    phone?: string;
    cellphone?: string;
    address?: string;
    email?: string;
    is_active: boolean;
}

interface Department {
    id: number;
    name: string;
}

interface City {
    id: number;
    name: string;
    department_id: number;
}

interface DashboardProps {
    stats: {
        usuarios: number;
        proveedores: number;
        clientes: number;
        ventas: number;
        movimientos: number;
        categorias: number;
        productos: number;
        roles: number;
        pedidos: number;
        caja: number;
        finanzas: number;
    };
    financials: Record<
        Period,
        {
            sales: { amount: number; count: number; growth: number };
            incomes: { amount: number; growth: number };
            expenses: { amount: number; growth: number };
        }
    >;
    charts: {
        sales_data: {
            labels: string[];
            ventas: number[];
            cantidad: number[];
        };
        category_data: {
            label: string;
            value: number;
            amount: number;
            color: string;
        }[];
    };
    salesProducts: Product[];
    salesClients: Client[];
    salesDepartments: Department[];
    salesCities: City[];
    annualInvoicingAlert: {
        year_to_date: number;
        threshold: number;
        percentage: number;
        exceeded: boolean;
    } | null;
}

export default function Dashboard({
    stats,
    financials,
    charts,
    salesProducts,
    salesClients,
    salesDepartments,
    salesCities,
    annualInvoicingAlert,
}: DashboardProps) {
    type Auth = {
        permissions: string[];
    };
    const { auth, modules } = usePage().props as unknown as { auth: Auth; modules: SidebarModule[] };
    const userPermissions = auth.permissions;

    const [period, setPeriod] = useState<Period>('diario');
    const [salesData, setSalesData] = useState(charts.sales_data);
    const [categoryData, setCategoryData] = useState(charts.category_data);
    const [noDataMessage, setNoDataMessage] = useState('');
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [isSaleFormDirty, setIsSaleFormDirty] = useState(false);
    const [showSaleDiscardConfirm, setShowSaleDiscardConfirm] = useState(false);
    const barChartRef = useRef<HTMLCanvasElement>(null);
    const pieChartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart.Chart | null>(null);
    const pieInstanceRef = useRef<Chart.Chart | null>(null);

    // Una tarjeta por cada módulo al que el usuario tenga acceso — misma
    // fuente (`modules`, compartida por Inertia) y misma regla de permiso
    // ("Ver {label}") que usa la sidebar, así nunca quedan desincronizados.
    const statCards = (modules ?? [])
        .filter((module) => module.key !== 'dashboard')
        .filter((module) => userPermissions.includes(`Ver ${module.label}`))
        .map((module) => {
            const statsKey = MODULE_STATS_KEY[module.key];
            return {
                key: module.key,
                title: MODULE_CARD_TITLE[module.key] ?? module.label,
                fullName: module.label,
                value: statsKey ? stats[statsKey] : null,
                icon: resolveIcon(module.icon),
                color: MODULE_CARD_COLOR[module.key] ?? 'from-slate-600 to-slate-700',
                route: module.route ?? '#',
            };
        });

    const loadChartData = async (newPeriod: Period) => {
        try {
            const response = await fetch(`/dashboard/chart-data/${newPeriod}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            setSalesData(data.sales_data);
            setCategoryData(data.category_data);

            const hasData = data.sales_data?.ventas?.some((value: number) => value > 0) ?? false;
            setNoDataMessage(hasData ? '' : `No hay datos de ventas disponibles para ${newPeriod}`);
        } catch (error) {
            console.error(`Error loading chart data for ${newPeriod}:`, error);
            setNoDataMessage(`Error al cargar datos para ${newPeriod}`);
        }
    };

    useEffect(() => {
        loadChartData(period);
    }, [period]);

    // Contadores del sidebar, resumen financiero y gráficos deben reflejar
    // cambios de cualquier otra sesión, igual que el resto de los módulos.
    useLiveRefresh(['sales', 'inventory', 'admin', 'finance', 'clients', 'purchase-orders'], () => {
        router.reload();
        loadChartData(period);
    });

    useEffect(() => {
        Chart.Chart.register(...Chart.registerables);

        if (barChartRef.current) {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const ctx = barChartRef.current.getContext('2d');
            if (ctx) {
                chartInstanceRef.current = new Chart.Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: salesData.labels || [],
                        datasets: [
                            {
                                label: 'Ventas',
                                data: salesData.ventas || [],
                                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                                borderColor: 'rgba(59, 130, 246, 1)',
                                borderWidth: 1,
                                borderRadius: 8,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false,
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const amount = formatCOP(context.parsed.y);
                                        const count = salesData.cantidad?.[context.dataIndex] ?? 0;
                                        return [`Ventas: ${amount}`, `Transacciones: ${count}`];
                                    },
                                },
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: (value) => formatCOP(Number(value)),
                                },
                            },
                            x: {
                                ticks: {
                                    autoSkip: false,
                                    maxRotation: 45,
                                    minRotation: 0,
                                },
                            },
                        },
                    },
                });
            }
        }

        if (pieChartRef.current) {
            if (pieInstanceRef.current) {
                pieInstanceRef.current.destroy();
            }

            const ctx = pieChartRef.current.getContext('2d');
            if (ctx) {
                pieInstanceRef.current = new Chart.Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: categoryData.map((d) => d.label),
                        datasets: [
                            {
                                data: categoryData.map((d) => d.value),
                                backgroundColor: categoryData.map((d) => d.color),
                                borderWidth: 2,
                                borderColor: '#fff',
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const label = context.label;
                                        const value = context.parsed;
                                        const amount = categoryData[context.dataIndex]?.amount || 0;
                                        return [`${label}: ${value}%`, `Monto: ${formatCOP(amount)}`];
                                    },
                                },
                            },
                        },
                    },
                });
            }
        }

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
            if (pieInstanceRef.current) {
                pieInstanceRef.current.destroy();
            }
        };
    }, [salesData, categoryData, period]);

    const handleNavigate = (route: string) => {
        router.visit(route);
    };

    const handleOpenSaleModal = () => {
        setShowSaleModal(true);
    };

    const closeSaleModal = () => {
        setShowSaleModal(false);
        setIsSaleFormDirty(false);
    };

    const handleCloseSaleModal = () => {
        if (!isSaleFormDirty) {
            closeSaleModal();
            return;
        }

        setShowSaleDiscardConfirm(true);
    };

    const handleExport = (format: 'excel' | 'pdf') => {
        const exportUrl = `/dashboard/export/${period}/${format}`;
        window.open(exportUrl, '_blank');
    };

    const periodLabels: Record<Period, string> = {
        diario: 'Diario',
        semanal: 'Semanal',
        mensual: 'Mensual',
        trimestral: 'Trimestral',
        semestral: 'Semestral',
        anual: 'Anual',
    };

    const financialSummaryCards = [
        {
            title: 'Ventas',
            data: financials[period].sales,
            icon: ShoppingCart,
            color: 'from-blue-500 to-blue-600',
            subtext: periodLabels[period],
        },
        {
            title: 'Ingresos',
            data: financials[period].incomes,
            icon: ArrowUpRight,
            color: 'from-green-600 to-green-700',
            subtext: periodLabels[period],
        },
        {
            title: 'Egresos',
            data: financials[period].expenses,
            icon: ArrowDownRight,
            color: 'from-red-600 to-red-700',
            subtext: periodLabels[period],
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={LayoutGrid} title="Dashboard" description="Inventario • Ventas • Reportes">
                    {userPermissions.includes('Crear Ventas') && (
                        <Button onClick={handleOpenSaleModal} size="sm" className="gap-2 bg-green-700 text-white hover:bg-green-800">
                            <ShoppingCart className="h-4 w-4" />
                            Nueva Venta
                        </Button>
                    )}

                    {userPermissions.includes('Exportar Dashboard') && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="gap-2 bg-gray-500 text-white hover:bg-gray-600">
                                    <Download className="h-4 w-4" />
                                    Exportar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem
                                    onClick={() => handleExport('excel')}
                                    className="focus:bg-green-100 focus:text-green-900 dark:focus:bg-green-900/30 dark:focus:text-green-200"
                                >
                                    Exportar a Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport('pdf')}
                                    className="focus:bg-red-100 focus:text-red-900 dark:focus:bg-red-900/30 dark:focus:text-red-200"
                                >
                                    Exportar a PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </PageHeader>

                {annualInvoicingAlert && (
                    <div
                        className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
                            annualInvoicingAlert.exceeded
                                ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
                                : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
                        }`}
                    >
                        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                        <div>
                            <p className="font-semibold">
                                {annualInvoicingAlert.exceeded
                                    ? 'Superaste el tope de facturación electrónica obligatoria de la DIAN'
                                    : 'Te estás acercando al tope de facturación electrónica obligatoria de la DIAN'}
                            </p>
                            <p className="mt-0.5">
                                Ingresos del año: <strong>${annualInvoicingAlert.year_to_date.toLocaleString('es-CO')}</strong> de un tope de{' '}
                                <strong>${annualInvoicingAlert.threshold.toLocaleString('es-CO')}</strong> ({annualInvoicingAlert.percentage}%).
                                {annualInvoicingAlert.exceeded
                                    ? ' Consulta con tu contador si ya debes registrarte como facturador electrónico ante la DIAN.'
                                    : ' Este software no genera facturas electrónicas certificadas — si sigues creciendo, consulta con tu contador cuándo debes habilitarte.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Cards — una por módulo accesible para este usuario.
                    Ancho de columna dinámico según cuántos módulos vea este
                    usuario, para que SIEMPRE quepan en una sola fila en
                    pantallas grandes (nada de scroll vertical acá). Ícono +
                    nombre apilados a la izquierda, contador centrado a la
                    derecha — dos "columnas", no tres filas — mismo alto que
                    la tarjeta original de una sola línea. */}
                <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 ${GRID_COLS_CLASS[statCards.length] ?? 'lg:grid-cols-6'}`}>
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Tooltip key={stat.key}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => handleNavigate(stat.route)}
                                        className={`relative cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br transition-all duration-300 hover:scale-105 hover:shadow-xl ${stat.color} flex items-center justify-between gap-2 px-3 py-2 text-left`}
                                    >
                                        <div className="flex min-w-0 flex-col gap-0.5">
                                            <Icon className="h-4 w-4 shrink-0 text-white" />
                                            <p className="truncate text-xs leading-none font-semibold text-white">{stat.title}</p>
                                        </div>
                                        {stat.value !== null && (
                                            <span className="shrink-0 text-xs font-bold text-white">{stat.value.toLocaleString()}</span>
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>{stat.fullName}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Financials Section */}
                <div className="bg-card relative flex-1 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60">
                    <div className="flex h-full flex-col gap-6 p-6">
                        {/* Header + selector de período (controla las tarjetas y el gráfico) */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-foreground flex items-center gap-2 text-xl font-bold">
                                    <TrendingUp className="h-5 w-5" />
                                    Resumen Financiero
                                </h2>
                                <p className="text-muted-foreground mt-1 text-sm">Análisis de rendimiento</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(['diario', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                            period === p ? 'bg-blue-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                        }`}
                                    >
                                        {periodLabels[p]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tarjetas de resumen para el período seleccionado */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {financialSummaryCards.map((card) => (
                                <div key={card.title} className={`bg-gradient-to-br ${card.color} rounded-xl p-5 text-white shadow-lg`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="shrink-0 rounded-lg bg-white/20 p-2">
                                                <card.icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white/80">{card.title}</p>
                                                <p className="truncate text-xl font-bold">{formatCOP(card.data.amount)}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-xs text-white/80">{card.subtext}</p>
                                            <span
                                                className={`rounded-full bg-white px-3 py-1 text-xs font-semibold ${
                                                    card.data.growth > 0 ? 'text-green-500' : card.data.growth < 0 ? 'text-red-500' : 'text-gray-500'
                                                }`}
                                            >
                                                {card.data.growth > 0 ? '+' : ''}
                                                {card.data.growth}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Bar Chart */}
                            <div className="bg-muted/30 border-border rounded-xl border p-5 lg:col-span-2">
                                <div className="mb-4">
                                    <h3 className="text-foreground text-lg font-bold">Tendencia de Ventas</h3>
                                    <p className="text-muted-foreground mt-1 text-xs">{periodLabels[period]}</p>
                                </div>
                                {noDataMessage ? (
                                    <div className="text-muted-foreground flex h-80 items-center justify-center text-center text-sm">
                                        {noDataMessage}
                                    </div>
                                ) : (
                                    <div className="h-80">
                                        <canvas ref={barChartRef}></canvas>
                                    </div>
                                )}
                            </div>

                            {/* Doughnut Chart */}
                            <div className="bg-muted/30 border-border flex flex-col rounded-xl border p-5">
                                <div className="mb-4">
                                    <h3 className="text-foreground text-lg font-bold">Ventas por Categoría</h3>
                                    <p className="text-muted-foreground mt-1 text-xs">{periodLabels[period]}</p>
                                </div>
                                {categoryData.length === 0 ? (
                                    <div className="text-muted-foreground flex flex-1 items-center justify-center py-4 text-center text-sm">
                                        Sin ventas por categoría en este período
                                    </div>
                                ) : (
                                    <div className="flex flex-1 items-center justify-center">
                                        <canvas ref={pieChartRef} className="max-h-96"></canvas>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <SaleModal
                open={showSaleModal}
                onOpenChange={(open) => {
                    if (!open) handleCloseSaleModal();
                }}
            >
                {showSaleModal && (
                    <SaleForm
                        sale={undefined}
                        products={salesProducts}
                        clients={salesClients}
                        departments={salesDepartments}
                        cities={salesCities}
                        onCancel={handleCloseSaleModal}
                        onSaved={closeSaleModal}
                        onDirtyChange={setIsSaleFormDirty}
                        userPermissions={userPermissions}
                    />
                )}
            </SaleModal>

            <ConfirmDialog
                open={showSaleDiscardConfirm}
                onOpenChange={setShowSaleDiscardConfirm}
                title="¿Descartar venta?"
                description="Tienes una venta en progreso que se perderá."
                confirmText="Sí, descartar"
                cancelText="Seguir editando"
                onConfirm={closeSaleModal}
            />
        </AppLayout>
    );
}
