import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardList, Key, LayoutGrid, Package, Shield, ShoppingCart, Tags, Truck, Users } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Inicio',
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
];

export function AppSidebar() {
    type Auth = {
        permissions: string[];
    };

    const { auth } = (usePage().props as unknown as { auth: Auth });
    const userPermissions = auth.permissions;

    const filteredNavItems = mainNavItems.filter((item) => {
        if (!item.permission) return true;
        return userPermissions.includes(item.permission);
    });

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
