import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    ClipboardList,
    DollarSign,
    Key,
    LayoutGrid,
    Package,
    Shield,
    ShoppingCart,
    Tags,
    Truck,
    Users,
    Wallet
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Roles',
        href: '/roles',
        icon: Shield,
        permission: 'Ver Roles',
    },
    {
        title: 'Permisos',
        href: '/permissions',
        icon: Key,
        permission: 'Ver Permisos',
    },
    {
        title: 'Usuarios',
        href: '/users',
        icon: Users,
        permission: 'Ver Usuarios',
    },
    {
        title: 'Proveedores',
        href: '/suppliers',
        icon: Truck,
        permission: 'Ver Proveedores',
    },
    {
        title: 'Categorías',
        href: '/categories',
        icon: Tags,
        permission: 'Ver Categorías',
    },
    {
        title: 'Productos',
        href: '/products',
        icon: Package,
        permission: 'Ver Productos',
    },
    {
        title: 'Movimientos Inventario',
        href: '/inventory-movements',
        icon: ClipboardList,
        permission: 'Ver Movimientos Inventario',
    },
    {
        title: 'Clientes',
        href: '/clients',
        icon: Users,
        permission: 'Ver Clientes',
    },
    {
        title: 'Ventas',
        href: '/sales',
        icon: ShoppingCart,
        permission: 'Ver Ventas',
    },
    {
        title: 'Caja',
        href: '/cash-register',
        icon: Wallet,
        permission: 'Ver Caja',
    },
    {
        title: 'Finanzas',
        href: '/transactions',
        icon: DollarSign,
        permission: 'Ver Finanzas',
    },
];

export function AppSidebar() {
    type Auth = {
        permissions: string[];
    };

    const { auth } = usePage().props as unknown as { auth: Auth };
    const userPermissions = auth.permissions;

    // Función recursiva para filtrar items con permisos
    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items
            .map((item) => {
                // Si el item tiene sub-items, filtrarlos recursivamente
                if (item.items && item.items.length > 0) {
                    const filteredSubItems = filterNavItems(item.items);

                    // Si no hay sub-items después del filtro, no mostrar el item padre
                    if (filteredSubItems.length === 0) {
                        return null;
                    }

                    return {
                        ...item,
                        items: filteredSubItems,
                    };
                }

                // Si el item no requiere permiso, mostrarlo
                if (!item.permission) return item;

                // Si el usuario tiene el permiso, mostrarlo
                return userPermissions.includes(item.permission) ? item : null;
            })
            .filter((item): item is NavItem => item !== null);
    };

    const filteredNavItems = filterNavItems(mainNavItems);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
