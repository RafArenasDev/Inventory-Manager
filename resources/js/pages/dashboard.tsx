import { Users, Package, Tags, ShoppingCart, ArrowUpRight, ArrowDownRight, Calendar, Truck, ClipboardList, TrendingUp, Download } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import * as Chart from 'chart.js';
import LowStockModal from './lowStockModal';
import SaleForm from './sales/saleForm';
import { SaleModal } from './saleModal';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    products: {
        id: number;
        name: string;
        stock: number;
    }[];
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
    products,
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
    const [showLowStockModal, setShowLowStockModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
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

    const lowStockProducts = products.filter(p => p.stock <= 3);

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

    const handleCloseSaleModal = () => {
        setShowSaleModal(false);
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

    const salesCards = [
        { period: 'diario' as const, title: 'Ventas Hoy', data: financials.diario.sales, icon: Calendar, color: 'from-blue-500 to-blue-600', subtext: `${financials.diario.sales.count} ventas` },
        { period: 'semanal' as const, title: 'Ventas Semana', data: financials.semanal.sales, icon: Calendar, color: 'from-blue-500 to-blue-600', subtext: `${financials.semanal.sales.count} ventas` },
        { period: 'mensual' as const, title: 'Ventas Mes', data: financials.mensual.sales, icon: Calendar, color: 'from-blue-500 to-blue-600', subtext: `${financials.mensual.sales.count} ventas` },
        { period: 'trimestral' as const, title: 'Ventas Trimestre', data: financials.trimestral.sales, icon: Calendar, color: 'from-blue-500 to-blue-600', subtext: `${financials.trimestral.sales.count} ventas` },
        { period: 'semestral' as const, title: 'Ventas Semestre', data: financials.semestral.sales, icon: Calendar, color: 'from-blue-500 to-blue-600', subtext: `${financials.semestral.sales.count} ventas` },
        { period: 'anual' as const, title: 'Ventas Año', data: financials.anual.sales, icon: Calendar, color: 'from-blue-500 to-blue-600', subtext: `${financials.anual.sales.count} ventas` },
    ];

    const incomesCards = [
        { period: 'diario' as const, title: 'Ingresos Hoy', data: financials.diario.incomes, icon: ArrowUpRight, color: 'from-green-600 to-green-700', subtext: 'Hoy' },
        { period: 'semanal' as const, title: 'Ingresos Semana', data: financials.semanal.incomes, icon: ArrowUpRight, color: 'from-green-600 to-green-700', subtext: 'Semana actual' },
        { period: 'mensual' as const, title: 'Ingresos Mes', data: financials.mensual.incomes, icon: ArrowUpRight, color: 'from-green-600 to-green-700', subtext: 'Mes actual' },
        { period: 'trimestral' as const, title: 'Ingresos Trimestre', data: financials.trimestral.incomes, icon: ArrowUpRight, color: 'from-green-600 to-green-700', subtext: 'Trimestre actual' },
        { period: 'semestral' as const, title: 'Ingresos Semestre', data: financials.semestral.incomes, icon: ArrowUpRight, color: 'from-green-600 to-green-700', subtext: 'Semestre actual' },
        { period: 'anual' as const, title: 'Ingresos Año', data: financials.anual.incomes, icon: ArrowUpRight, color: 'from-green-600 to-green-700', subtext: 'Año actual' },
    ];

    const expensesCards = [
        { period: 'diario' as const, title: 'Egresos Hoy', data: financials.diario.expenses, icon: ArrowDownRight, color: 'from-red-600 to-red-700', subtext: 'Hoy' },
        { period: 'semanal' as const, title: 'Egresos Semana', data: financials.semanal.expenses, icon: ArrowDownRight, color: 'from-red-600 to-red-700', subtext: 'Semana actual' },
        { period: 'mensual' as const, title: 'Egresos Mes', data: financials.mensual.expenses, icon: ArrowDownRight, color: 'from-red-600 to-red-700', subtext: 'Mes actual' },
        { period: 'trimestral' as const, title: 'Egresos Trimestre', data: financials.trimestral.expenses, icon: ArrowDownRight, color: 'from-red-600 to-red-700', subtext: 'Trimestre actual' },
        { period: 'semestral' as const, title: 'Egresos Semestre', data: financials.semestral.expenses, icon: ArrowDownRight, color: 'from-red-600 to-red-700', subtext: 'Semestre actual' },
        { period: 'anual' as const, title: 'Egresos Año', data: financials.anual.expenses, icon: ArrowDownRight, color: 'from-red-600 to-red-700', subtext: 'Año actual' },
    ];

    const [salesSlide, setSalesSlide] = useState(salesCards.findIndex(card => card.period === period));
    const [incomesSlide, setIncomesSlide] = useState(incomesCards.findIndex(card => card.period === period));
    const [expensesSlide, setExpensesSlide] = useState(expensesCards.findIndex(card => card.period === period));

    useEffect(() => {
        const index = salesCards.findIndex(card => card.period === period);
        setSalesSlide(index);
        setIncomesSlide(index);
        setExpensesSlide(index);
    }, [period]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
                        <p className="text-muted-foreground mt-1">
                            Inventario • Ventas • Reportes
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {/* <Button
                            size="sm"
                            className="gap-2 bg-green-500 text-white"
                        >
                            <Clock className="w-4 h-4" />
                            Abrir Caja
                        </Button> */}

                        <Button
                            onClick={handleOpenSaleModal}
                            size="sm"
                            className="gap-2 bg-green-700 text-white"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Nueva Venta
                        </Button>

                        {/* <Button
                            size="sm"
                            className="gap-2 bg-red-500 text-white"
                        >
                            <ArrowDownRight className="w-4 h-4" />
                            Cerrar Caja
                        </Button> */}

                        {userPermissions.includes('Exportar Dashboard') && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="sm"
                                        className="gap-2 bg-gray-500 text-white"
                                    >
                                        <Download className="h-4 w-4" />
                                        Exportar
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                                        Exportar a Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                        Exportar a PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${statCards.length === 7 ? 'lg:grid-cols-7' : statCards.length === 6 ? 'lg:grid-cols-6' : statCards.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <button
                                key={index}
                                onClick={() => handleNavigate(stat.route)}
                                className={`relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer bg-gradient-to-br ${stat.color} p-4 flex flex-col items-center text-center`}
                            >
                                <div className="mb-2">
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-xs font-medium text-white/90 mb-1">
                                    {stat.title}
                                </p>
                                <p className="text-2xl font-bold text-white">
                                    {stat.value.toLocaleString()}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Stock Status Overview */}
                <div className="bg-card rounded-xl p-5 border border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-600" />
                                Alertas de Inventario
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">Productos con stock bajo</p>
                        </div>
                        <button
                            onClick={() => setShowLowStockModal(true)}
                            className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                        >
                            Ver todos →
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {lowStockProducts.slice(0, 5).map((product, index) => {
                            const getStockStatus = (stock: number) => {
                                if (stock === 0) {
                                    return { label: 'Sin Stock', color: 'bg-red-600 text-white font-bold dark:bg-red-700' };
                                } else if (stock <= 3) {
                                    return { label: 'Bajo', color: 'bg-red-600 text-white font-bold dark:bg-red-700' };
                                }
                            };

                            const stockStatus = getStockStatus(product.stock);

                            return (
                                <div
                                    key={index}
                                    className="bg-muted/30 rounded-lg p-4 border border-border hover:border-blue-600/50 transition-colors"
                                >
                                    <div className="mb-3">
                                        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-foreground">
                                            Stock: {product.stock}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${stockStatus?.color}`}>
                                            {stockStatus?.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Financials Section */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 rounded-xl border bg-card">
                    <div className="p-6 h-full flex flex-col gap-6">
                        {/* Sliders */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Sales Slider */}
                            <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg text-white overflow-hidden">
                                <div className="flex justify-center mb-4">
                                    <h4 className="text-lg font-bold text-white text-center">Ventas</h4>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setSalesSlide(salesSlide === 0 ? salesCards.length - 1 : salesSlide - 1)}
                                        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-10"
                                    >
                                        ←
                                    </button>
                                    <div className="mx-10 overflow-hidden">
                                        <div
                                            className="flex transition-transform duration-300 ease-in-out"
                                            style={{ transform: `translateX(-${salesSlide * 100}%)` }}
                                        >
                                            {salesCards.map((card, index) => (
                                                <div key={index} className="w-full flex-shrink-0 min-w-full px-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white/20 rounded-lg">
                                                                <card.icon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white/80">{card.title}</p>
                                                                <p className="text-xl font-bold">{formatCOP(card.data.amount)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-white/80">{card.subtext}</p>
                                                            <span className={`px-3 py-1 bg-white text-xs font-semibold rounded-full ${card.data.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                {card.data.growth >= 0 ? '+' : ''}{card.data.growth}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSalesSlide(salesSlide === salesCards.length - 1 ? 0 : salesSlide + 1)}
                                        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-10"
                                    >
                                        →
                                    </button>
                                </div>
                            </div>

                            {/* Incomes Slider */}
                            <div className="relative bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 shadow-lg text-white overflow-hidden">
                                <div className="flex justify-center mb-4">
                                    <h4 className="text-lg font-bold text-white text-center">Ingresos</h4>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setIncomesSlide(incomesSlide === 0 ? incomesCards.length - 1 : incomesSlide - 1)}
                                        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-10"
                                    >
                                        ←
                                    </button>
                                    <div className="mx-10 overflow-hidden">
                                        <div
                                            className="flex transition-transform duration-300 ease-in-out"
                                            style={{ transform: `translateX(-${incomesSlide * 100}%)` }}
                                        >
                                            {incomesCards.map((card, index) => (
                                                <div key={index} className="w-full flex-shrink-0 min-w-full px-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white/20 rounded-lg">
                                                                <card.icon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white/80">{card.title}</p>
                                                                <p className="text-xl font-bold">{formatCOP(card.data.amount)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-white/80">{card.subtext}</p>
                                                            <span className={`px-3 py-1 bg-white text-xs font-semibold rounded-full ${card.data.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                {card.data.growth >= 0 ? '+' : ''}{card.data.growth}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIncomesSlide(incomesSlide === incomesCards.length - 1 ? 0 : incomesSlide + 1)}
                                        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-10"
                                    >
                                        →
                                    </button>
                                </div>
                            </div>

                            {/* Expenses Slider */}
                            <div className="relative bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-5 shadow-lg text-white overflow-hidden">
                                <div className="flex justify-center mb-4">
                                    <h4 className="text-lg font-bold text-white text-center">Egresos</h4>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setExpensesSlide(expensesSlide === 0 ? expensesCards.length - 1 : expensesSlide - 1)}
                                        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-10"
                                    >
                                        ←
                                    </button>
                                    <div className="mx-10 overflow-hidden">
                                        <div
                                            className="flex transition-transform duration-300 ease-in-out"
                                            style={{ transform: `translateX(-${expensesSlide * 100}%)` }}
                                        >
                                            {expensesCards.map((card, index) => (
                                                <div key={index} className="w-full flex-shrink-0 min-w-full px-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white/20 rounded-lg">
                                                                <card.icon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white/80">{card.title}</p>
                                                                <p className="text-xl font-bold">{formatCOP(card.data.amount)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-white/80">{card.subtext}</p>
                                                            <span className={`px-3 py-1 bg-white text-xs font-semibold rounded-full ${card.data.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                {card.data.growth >= 0 ? '+' : ''}{card.data.growth}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setExpensesSlide(expensesSlide === expensesCards.length - 1 ? 0 : expensesSlide + 1)}
                                        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/20 p-2 rounded-full hover:bg-white/30 z-10"
                                    >
                                        →
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Bar Chart */}
                            <div className="lg:col-span-2 bg-muted/30 rounded-xl p-5 border border-border">
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5" />
                                            Tendencia de Ventas
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
                                {noDataMessage && (
                                    <div className="text-center text-muted-foreground py-4">
                                        {noDataMessage}
                                    </div>
                                )}
                                <div className="h-80">
                                    <canvas ref={barChartRef}></canvas>
                                </div>
                            </div>

                            {/* Doughnut Chart */}
                            <div className="bg-muted/30 rounded-xl p-5 border border-border flex flex-col">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-foreground">Ventas por Categoría</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Distribución del año</p>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <canvas ref={pieChartRef} className="max-h-96"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <LowStockModal
                isOpen={showLowStockModal}
                onClose={() => {
                    setShowLowStockModal(false);
                }}
                products={lowStockProducts}
            />
            <SaleModal open={showSaleModal} onOpenChange={setShowSaleModal}>
                <SaleForm
                    sale={undefined}
                    products={salesProducts}
                    clients={salesClients}
                    departments={salesDepartments}
                    cities={salesCities}
                    onCancel={handleCloseSaleModal}
                    userPermissions={userPermissions}
                />
            </SaleModal>
        </AppLayout>
    );
}
