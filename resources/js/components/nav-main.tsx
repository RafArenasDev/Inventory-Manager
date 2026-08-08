import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

const GROUP_STATE_KEY = 'inventory_pos_sidebar_groups_v1';

function loadGroupState(): Record<string, boolean> {
    try {
        const raw = localStorage.getItem(GROUP_STATE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveGroupState(state: Record<string, boolean>) {
    try {
        localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(state));
    } catch {
        // localStorage no disponible (modo privado, etc.) — solo se pierde
        // la memoria de abierto/cerrado, no es crítico.
    }
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const currentPath = page.url.split('?')[0];
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadGroupState());

    // Coincidencia por prefijo de path (no URL exacta): navegar dentro del
    // mismo módulo (búsqueda vía /modulo/search, paginación, /modulo/5/edit,
    // etc.) no debe hacer que el item deje de verse activo.
    const isPathActive = (href: string | undefined | null) => {
        if (!href || href === '#') return false;
        if (href === '/') return currentPath === '/';
        return currentPath === href || currentPath.startsWith(`${href}/`);
    };

    const toggleGroup = (group: string) => {
        setOpenGroups((prev) => {
            const next = { ...prev, [group]: !(prev[group] ?? true) };
            saveGroupState(next);
            return next;
        });
    };

    // Agrupa preservando el orden de llegada: los ítems sin `group` (hoy
    // solo Dashboard) van sueltos arriba de todo; el resto se agrupa por
    // nombre de grupo en el orden en que aparece cada uno por primera vez.
    const ungrouped: NavItem[] = [];
    const groupOrder: string[] = [];
    const groupedItems: Record<string, NavItem[]> = {};

    items.forEach((item) => {
        if (!item.group) {
            ungrouped.push(item);
            return;
        }
        if (!groupedItems[item.group]) {
            groupedItems[item.group] = [];
            groupOrder.push(item.group);
        }
        groupedItems[item.group].push(item);
    });

    const renderItem = (item: NavItem) => {
        // Si el item tiene sub-items, renderizar como Collapsible
        if (item.items && item.items.length > 0) {
            return (
                <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                >
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={{ children: item.title }}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.items.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={isPathActive(subItem.href)}
                                        >
                                            <Link href={subItem.href || '#'} prefetch>
                                                {subItem.icon && <subItem.icon />}
                                                <span>{subItem.title}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            );
        }

        // Si no tiene sub-items, renderizar como item normal
        return (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                    asChild
                    isActive={isPathActive(item.href)}
                    tooltip={{ children: item.title }}
                >
                    <Link href={item.href || '#'} prefetch>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    };

    return (
        <>
            {ungrouped.length > 0 && (
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>{ungrouped.map(renderItem)}</SidebarMenu>
                </SidebarGroup>
            )}
            {groupOrder.map((group) => {
                const isOpen = openGroups[group] ?? true;
                return (
                    <Collapsible key={group} open={isOpen} onOpenChange={() => toggleGroup(group)}>
                        <SidebarGroup className="px-2 py-0">
                            <CollapsibleTrigger asChild>
                                <SidebarGroupLabel className="cursor-pointer select-none hover:text-sidebar-foreground">
                                    {group}
                                    <ChevronRight
                                        className={`ml-auto size-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                                    />
                                </SidebarGroupLabel>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>{groupedItems[group].map(renderItem)}</SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                );
            })}
        </>
    );
}
