import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardList, Key, LayoutGrid, Package, Shield, Tags, Truck, Users } from 'lucide-react'; // AGREGAR Truck
import AppLogo from './app-logo';
// import { NavFooter } from './nav-footer';

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
        title: 'Proveedores', // AGREGAR ESTE ÍTEM
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
    }
];

export function AppSidebar() {
    type Auth = {
        permissions: string[];
    };

    const { auth } = (usePage().props as unknown as { auth: Auth });
    const userPermissions = auth.permissions;

    // Debug: Log user permissions
    // console.log('User permissions:', userPermissions);

    // Filter items based on user permissions
    const filteredNavItems = mainNavItems.filter((item) => {
        // If item has no permission requirement, show it
        if (!item.permission) return true;

        // Check if user has the required permission
        return userPermissions.includes(item.permission);
    });

    // const appVersion = '1.0.0';
    // const currentYear = new Date().getFullYear();
    // const companyName = 'RafArenasDev';

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
                {/* <NavFooter
                    version={appVersion}
                    companyName={companyName}
                    currentYear={currentYear}
                /> */}
            </SidebarFooter>
        </Sidebar>
    );
}
