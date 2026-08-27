import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { type ComponentPropsWithoutRef } from 'react';

export function NavFooter({
    className,
    version,
    companyName,
    currentYear,
    ...props
}: ComponentPropsWithoutRef<typeof SidebarGroup> & {
    version?: string;
    companyName?: string;
    currentYear?: number;
}) {
    return (
        <SidebarGroup {...props} className={`group-data-[collapsible=icon]:p-0 ${className || ''}`}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {companyName && currentYear && (
                        <SidebarMenuItem>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                &copy; {currentYear} {companyName}. Todos los derechos reservados.
                            </span>
                        </SidebarMenuItem>
                    )}
                    {version && (
                        <SidebarMenuItem>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">Versión {version}</span>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
