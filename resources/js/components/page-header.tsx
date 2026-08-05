import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface PageHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    children?: ReactNode;
}

export function PageHeader({ icon: Icon, title, description, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-2xl leading-tight font-bold tracking-tight">{title}</h2>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
    );
}
