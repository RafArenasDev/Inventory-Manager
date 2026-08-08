import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { resolveIcon } from '@/lib/icon-map';
import AppLogo from './app-logo';

interface SidebarModule {
    key: string;
    label: string;
    icon: string | null;
    route: string | null;
    group: string | null;
}

export function AppSidebar() {
    type Auth = {
        permissions: string[];
    };

    const { auth, modules, appVersion } = usePage().props as unknown as SharedData & { auth: Auth; modules: SidebarModule[] };
    const userPermissions = auth.permissions;

    const mainNavItems: NavItem[] = (modules ?? []).map((module) => ({
        title: module.label,
        href: module.route ?? '#',
        icon: resolveIcon(module.icon),
        // El módulo Dashboard no tiene permiso "Ver Dashboard" propio, siempre es visible.
        permission: module.key === 'dashboard' ? undefined : `Ver ${module.label}`,
        group: module.group,
    }));

    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items
            .map((item) => {
                if (item.items && item.items.length > 0) {
                    const filteredSubItems = filterNavItems(item.items);

                    if (filteredSubItems.length === 0) {
                        return null;
                    }

                    return {
                        ...item,
                        items: filteredSubItems,
                    };
                }

                if (!item.permission) return item;

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

            <SidebarSeparator />

            <SidebarContent>
                <NavMain items={filteredNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <div className="group-data-[collapsible=icon]:hidden px-2 py-1 text-[11px] leading-tight text-sidebar-foreground/50">
                    <p>v{appVersion}</p>
                    <p>© 2025–2026 RafArenasDev</p>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
