import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { resolveIcon } from '@/lib/icon-map';
import { type NavItem, type SharedData, type SidebarModule } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import AppLogo from './app-logo';

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
            {/* Mismo divisor que separa la versión en el footer (border-sidebar-border)
                — acá marca el límite entre el logo y la navegación. Altura fija
                h-16 = misma altura exacta que el header principal (app-sidebar-header),
                para que las dos líneas queden a la misma altura de la pantalla en
                vez de verse disparejas. */}
            <SidebarHeader className="border-sidebar-border h-16 justify-center border-b p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild tooltip="Inventory Manager">
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
                <div className="border-sidebar-border space-y-0.5 border-t px-2 pt-3 pb-1 text-center group-data-[collapsible=icon]:hidden">
                    <p className="text-sidebar-foreground/60 text-[11px] font-medium tracking-wide">Versión {appVersion}</p>
                    <p className="text-sidebar-foreground/35 text-[10px]">© 2025–2026 RafArenasDev</p>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
