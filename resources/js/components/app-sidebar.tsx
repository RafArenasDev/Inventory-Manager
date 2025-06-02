import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Key, LayoutGrid, Package, Shield, Tags, Users } from 'lucide-react';
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
        permission: 'view-roles-module',
    },
    {
        title: 'Permisos',
        href: '/permissions',
        icon: Key,
        permission: 'view-permissions-module',
    },
    {
        title: 'Usuarios',
        href: '/users',
        icon: Users,
        permission: 'view-users-module',
    },
    {
        title: 'Categorías',
        href: '/categories',
        icon: Tags,
        permission: 'view-categories-module',
    },
    {
        title: 'Productos',
        href: '/products',
        icon: Package,
        permission: 'view-products-module',
    }
];

export function AppSidebar() {
    type Auth = {
        permissions: string[];
    };

    const { auth } = (usePage().props as unknown as { auth: Auth });
    const userPermissions = auth.permissions;

    // Debug: Log user permissions
    console.log('User permissions:', userPermissions);

    // Filter items based on user permissions
    const filteredNavItems = mainNavItems.filter((item) => {
        // If item has no permission requirement, show it
        if (!item.permission) return true;

        // Check if user has the required permission
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
