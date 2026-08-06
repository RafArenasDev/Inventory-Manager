import { Users, Package, Tags, ShoppingCart, ArrowUpRight, ArrowDownRight, Truck, ClipboardList, TrendingUp, Download, LayoutGrid } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import * as Chart from 'chart.js';
import SaleForm from './sales/saleForm';
import { SaleModal } from './saleModal';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';

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
    };
    financials: Record<Period, {
        sales: { amount: number; count: number; growth: number };
        incomes: { amount: number; growth: number };
        expenses: { amount: number; growth: number };
    }>;
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
}

export default function Dashboard({
    stats,
    financials,
    charts,
    salesProducts,
    salesClients,
    salesDepartments,
    salesCities
}: DashboardProps) {
    type Auth = {
        permissions: string[];
    };
    const { auth } = usePage().props as unknown as { auth: Auth };
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

    const allStatCards = [
        { title: 'Usuarios', value: stats.usuarios, icon: Users, color: 'from-blue-600 to-blue-700', route: '/users', permission: 'Ver Usuarios' },
        { title: 'Proveedores', value: stats.proveedores, icon: Truck, color: 'from-teal-600 to-teal-700', route: '/suppliers', permission: 'Ver Proveedores' },
        { title: 'Clientes', value: stats.clientes, icon: Users, color: 'from-green-600 to-green-700', route: '/clients', permission: 'Ver Clientes' },
        { title: 'Productos', value: stats.productos, icon: Package, color: 'from-orange-600 to-orange-700', route: '/products', permission: 'Ver Productos' },
        { title: 'Categorías', value: stats.categorias, icon: Tags, color: 'from-cyan-600 to-cyan-700', route: '/categories', permission: 'Ver Categorías' },
        { title: 'Movimientos', value: stats.movimientos, icon: ClipboardList, color: 'from-indigo-600 to-indigo-700', route: '/inventory-movements', permission: 'Ver Movimientos Inventario' },
        { title: 'Ventas', value: stats.ventas, icon: ShoppingCart, color: 'from-emerald-600 to-emerald-700', route: '/sales', permission: 'Ver Ventas' },
    ];

    const statCards = allStatCards.filter(card =>
        !card.permission || userPermissions.includes(card.permission)
    );

    const calculateFinancialTotals = () => {
        let totalIngresos = 0;
        let totalEgresos = 0;

        Object.entries(financials).forEach(([, data]) => {
            totalIngresos += data.incomes.amount;
            totalEgresos += data.expenses.amount;
        });

        return { totalIngresos, totalEgresos };
    };

    useEffect(() => {
        calculateFinancialTotals();
    }, []);

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
                        datasets: [{
                            label: 'Ventas',
                            data: salesData.ventas || [],
                            backgroundColor: 'rgba(59, 130, 246, 0.8)',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 1,
                            borderRadius: 8,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const amount = formatCOP(context.parsed.y);
                                        const count = salesData.cantidad?.[context.dataIndex] ?? 0;
                                        return [`Ventas: ${amount}`, `Transacciones: ${count}`];
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: (value) => formatCOP(Number(value))
                                }
                            },
                            x: {
                                ticks: {
                                    autoSkip: false,
                                    maxRotation: 45,
                                    minRotation: 0
                                }
                            }
                        }
                    }
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
                        labels: categoryData.map(d => d.label),
                        datasets: [{
                            data: categoryData.map(d => d.value),
                            backgroundColor: categoryData.map(d => d.color),
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
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
                                        return [
                                            `${label}: ${value}%`,
                                            `Monto: ${formatCOP(amount)}`
                                        ];
                                    }
                                }
                            }
                        }
                    }
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
        { title: 'Ventas', data: financials[period].sales, icon: ShoppingCart, color: 'from-blue-500 to-blue-600', subtext: `${financials[period].sales.count} ventas` },
        { title: 'Ingresos', data: financials[period].incomes, icon: ArrowUpRight, color: 'from-green-600 to-green-700', subtext: periodLabels[period] },
        { title: 'Egresos', data: financials[period].expenses, icon: ArrowDownRight, color: 'from-red-600 to-red-700', subtext: periodLabels[period] },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={LayoutGrid} title="Dashboard" description="Inventario • Ventas • Reportes">
                    <Button
                        onClick={handleOpenSaleModal}
                        size="sm"
                        className="gap-2 bg-green-700 text-white hover:bg-green-800"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Nueva Venta
                    </Button>

                    {userPermissions.includes('Exportar Dashboard') && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    className="gap-2 bg-gray-500 text-white hover:bg-gray-600"
                                >
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

                {/* Stats Cards */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${statCards.length === 7 ? 'lg:grid-cols-7' : statCards.length === 6 ? 'lg:grid-cols-6' : statCards.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <button
                                key={index}
                                onClick={() => handleNavigate(stat.route)}
                                className={`relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer bg-gradient-to-br ${stat.color} px-3 py-2 flex items-center justify-between gap-2 text-left`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon className="w-4 h-4 text-white shrink-0" />
                                    <p className="text-xs font-medium text-white/90 truncate">
                                        {stat.title}
                                    </p>
                                </div>
                                <p className="text-base font-bold text-white shrink-0">
                                    {stat.value.toLocaleString()}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Financials Section */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 rounded-xl border bg-card">
                    <div className="p-6 h-full flex flex-col gap-6">
                        {/* Header + selector de período (controla las tarjetas y el gráfico) */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Resumen Financiero
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">Análisis de rendimiento</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {(['diario', 'semanal', 'mensual', 'trimestral', 'semestral', 'anual'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                                            period === p
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                        }`}
                                    >
                                        {periodLabels[p]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tarjetas de resumen para el período seleccionado */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {financialSummaryCards.map((card) => (
                                <div
                                    key={card.title}
                                    className={`bg-gradient-to-br ${card.color} rounded-xl p-5 shadow-lg text-white`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 bg-white/20 rounded-lg shrink-0">
                                                <card.icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white/80">{card.title}</p>
                                                <p className="text-xl font-bold truncate">{formatCOP(card.data.amount)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs text-white/80">{card.subtext}</p>
                                            <span className={`px-3 py-1 bg-white text-xs font-semibold rounded-full ${card.data.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {card.data.growth >= 0 ? '+' : ''}{card.data.growth}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Bar Chart */}
                            <div className="lg:col-span-2 bg-muted/30 rounded-xl p-5 border border-border">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-foreground">Tendencia de Ventas</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
                                </div>
                                {noDataMessage ? (
                                    <div className="h-80 flex items-center justify-center text-center text-muted-foreground text-sm">
                                        {noDataMessage}
                                    </div>
                                ) : (
                                    <div className="h-80">
                                        <canvas ref={barChartRef}></canvas>
                                    </div>
                                )}
                            </div>

                            {/* Doughnut Chart */}
                            <div className="bg-muted/30 rounded-xl p-5 border border-border flex flex-col">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-foreground">Ventas por Categoría</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{periodLabels[period]}</p>
                                </div>
                                {categoryData.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm py-4">
                                        Sin ventas por categoría en este período
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <canvas ref={pieChartRef} className="max-h-96"></canvas>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <SaleModal open={showSaleModal} onOpenChange={(open) => { if (!open) handleCloseSaleModal(); }}>
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
