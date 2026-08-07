import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import Swal from '@/lib/swal';

export interface SaleItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity: number;
    price_at_sale: number;
    subtotal: number;
}

export interface Client {
    id: number;
    name: string;
    document_type: string;
    document_number: string;
    verification_digit?: number;
    department: string;
    city: string;
    email?: string;
    phone?: string;
    cellphone?: string;
    address?: string;
}

export interface Sale {
    id: number;
    invoice_number: string;
    client?: Client;
    user: { id: number; name: string };
    sale_date: string;
    sale_time: string;
    total_without_tax: number;
    total_with_discount: number;
    discount: number;
    total_paid: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
    discount_percentage: number;
    is_cancelled: boolean;
    public_invoice_url?: string | null;
}

interface SaleDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
    businessName: string;
}

const formatCurrency = (value: number): string => {
    return `$ ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatWhatsAppNumber = (rawNumber: string): string => {
    const digits = rawNumber.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
        return `57${digits}`;
    }
    return digits;
};

export default function SaleDetailModal({ isOpen, onClose, sale, businessName }: SaleDetailModalProps) {
    if (!sale) return null;

    const handleSendToWhatsApp = () => {
        if (sale.client?.cellphone && sale.public_invoice_url) {
            const bogotaTime = new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false });
            const hour = parseInt(bogotaTime);
            let greeting = 'Buenas noches';
            if (hour < 12) {
                greeting = 'Buenos días';
            } else if (hour < 18) {
                greeting = 'Buenas tardes';
            }
            const pdfUrl = `${window.location.origin}${sale.public_invoice_url}`;
            const message = encodeURIComponent(`${greeting}, de parte de ${businessName}. ¡Aquí está su recibo de pago adjunto!`);
            const link = `https://wa.me/${formatWhatsAppNumber(sale.client.cellphone)}?text=${message}`;
            window.open(link, '_blank');

            fetch(pdfUrl)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = decodeURIComponent(sale.public_invoice_url!.split('/').pop() || `Recibo_${sale.invoice_number}.pdf`);
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => {
                    console.error('Error downloading PDF:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo descargar el archivo PDF.',
                        timer: 2200,
                    });
                });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'No se puede enviar',
                text: 'Falta número de celular o URL de factura.',
                timer: 2200,
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-w-[95vw] max-h-[90vh] bg-card dark:border-gray-800 rounded-2xl p-0 shadow-2xl overflow-y-auto [&>button]:absolute [&>button]:top-4 [&>button]:right-4 [&>button]:z-10 [&>button]:p-3 [&>button]:rounded-full [&>button]:bg-white/90 [&>button]:dark:bg-gray-800/90 [&>button]:hover:bg-white [&>button]:dark:hover:bg-gray-700 [&>button]:transition-colors [&>button]:shadow-md [&>button]:border-0">
                <div className="p-6 space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Venta: {sale.invoice_number}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Detalle completo de la venta {sale.invoice_number}: cliente, productos y totales.
                            </DialogDescription>
                            {sale.is_cancelled && (
                                <span className="mt-2 inline-block rounded-full bg-red-500 px-4 py-1 text-sm font-semibold text-white">
                                    ANULADA
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Información del Cliente</h4>
                        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Nombre:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.client?.name || '-'}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Tipo Doc:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.client?.document_type || '-'}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Documento:</span>
                                <p className="text-gray-900 dark:text-gray-100">
                                    {sale.client?.document_number || '-'}
                                    {sale.client?.document_type === 'NIT' && sale.client?.verification_digit && ` - ${sale.client.verification_digit}`}
                                </p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Email:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.client?.email || '-'}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Teléfono:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.client?.phone || '-'}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Celular:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.client?.cellphone || '-'}</p>
                            </div>
                            <div className="md:col-span-3">
                                <span className="font-medium text-gray-500 dark:text-gray-400">Dirección:</span>
                                <p className="text-gray-900 dark:text-gray-100">
                                    {sale.client?.address || '-'}, {sale.client?.city || '-'}, {sale.client?.department || '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Detalles de la Venta</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Fecha:</span>
                                <p className="text-gray-900 dark:text-gray-100">{formatDate(sale.sale_date)}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Hora:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.sale_time}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Método de Pago:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.payment_method}</p>
                            </div>
                            <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">Vendedor:</span>
                                <p className="text-gray-900 dark:text-gray-100">{sale.user.name}</p>
                            </div>
                        </div>
                    </div>

                    {sale.notes && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Notas</h4>
                            <p className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/[0.03]">{sale.notes}</p>
                        </div>
                    )}

                    <div>
                        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Productos</h4>
                        <div className="max-h-[240px] overflow-y-auto rounded-md border dark:border-gray-800">
                            <Table>
                                <TableHeader className="bg-gray-400 dark:bg-gray-700">
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead className="text-right">Precio Unit.</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sale.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-sm">{item.product_code}</TableCell>
                                            <TableCell>{item.product_name}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.price_at_sale)}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Subtotal:</span>
                            <span>{formatCurrency(sale.total_without_tax)}</span>
                        </div>
                        {sale.discount_percentage > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Descuento ({sale.discount_percentage}%):</span>
                                <span className="text-red-600 dark:text-red-400">
                                    -{formatCurrency(sale.total_without_tax - sale.total_with_discount)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-700">
                            <span>TOTAL:</span>
                            <span className="text-green-600 dark:text-green-400">{formatCurrency(sale.total_paid)}</span>
                        </div>
                    </div>

                    {sale.public_invoice_url && sale.client?.cellphone && (
                        <div className="flex justify-end">
                            <Button onClick={handleSendToWhatsApp} className="gap-2 bg-[#25D366] text-white hover:bg-[#1DA851] dark:bg-[#25D366] dark:hover:bg-[#1DA851]">
                                <WhatsAppIcon className="h-4 w-4" />
                                Enviar a WhatsApp
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
