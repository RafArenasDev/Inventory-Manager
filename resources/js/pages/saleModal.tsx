import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReactNode } from 'react';

interface SaleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    children: ReactNode;
}

export function SaleModal({
    open,
    onOpenChange,
    title = 'Nueva Venta',
    description = 'Completa los datos para registrar una nueva venta.',
    children,
}: SaleModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[90vh] w-[95vw] flex-col overflow-hidden sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl"
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader className="shrink-0">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}
