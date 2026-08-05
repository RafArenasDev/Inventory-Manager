import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, MessageCircle } from "lucide-react";
import Swal from '@/lib/swal';

interface SaleItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity: number;
    price_at_sale: number;
    subtotal: number;
}

interface Client {
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

interface Sale {
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

interface SaleShowProps {
    sale: Sale;
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

export default function SaleShow({ sale }: SaleShowProps) {
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    const handleSendToWhatsApp = () => {
        if (sale?.client?.cellphone && sale.public_invoice_url) {
            const bogotaTime = new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false });
            const hour = parseInt(bogotaTime);
            let greeting = 'Buenas noches';
            if (hour < 12) {
                greeting = 'Buenos días';
            } else if (hour < 18) {
                greeting = 'Buenas tardes';
            }
            const pdfUrl = `${window.location.origin}${sale.public_invoice_url}`;
            const message = encodeURIComponent(`${greeting}, de parte de Moto Repuestos Arcoiris. ¡Aquí está su recibo de pago adjunto!`);
            const link = `https://wa.me/${sale.client.cellphone}?text=${message}`;
            window.open(link, '_blank');

            fetch(pdfUrl)
                .then(response => response.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `recibo_${sale.invoice_number}.pdf`;
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
                icon: "error",
                title: "No se puede enviar",
                text: "Falta número de celular o URL de factura.",
                timer: 2200,
            });
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Ventas', href: '/sales' }, {
            title: `Venta: ${sale.invoice_number}`,
            href: ''
        }]}>
            <Head title={`Venta ${sale.invoice_number}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold tracking-tight">Detalles de la Venta:  {sale.invoice_number}</h2>
                        <Button onClick={() => router.visit('/sales')} className="gap-1">
                            <ChevronLeft className="h-4 w-4" />
                            Atrás
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-6">
                            <img src={theme === 'dark' ? '/assets/img/white.png' : '/assets/img/black.png'} alt="Logo" className="h-16 w-auto object-contain" />
                            <div className="flex-1">
                                <h3 className="text-xl font-bold">RECIBO DE PAGO</h3>
                                <p className="text-lg">No. {sale.invoice_number}</p>
                                {sale.is_cancelled && (
                                    <span className="px-4 py-1 bg-red-500 text-white font-semibold rounded-full text-sm mt-2 inline-block">
                                        ANULADA
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-xs italic text-gray-600">
                            Este documento corresponde a un comprobante interno de venta. No constituye factura electrónica con validación previa de la DIAN.
                        </p>

                        <div>
                            <h4 className="text-lg font-semibold mb-4">Información del Cliente</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-600">Nombre:</span>
                                    <p>{sale.client?.name || '-'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Tipo Doc:</span>
                                    <p>{sale.client?.document_type || '-'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Documento:</span>
                                    <p>
                                        {sale.client?.document_number || '-'}
                                        {sale.client?.document_type === 'NIT' && sale.client?.verification_digit && ` - ${sale.client.verification_digit}`}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Email:</span>
                                    <p>{sale.client?.email || '-'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Teléfono:</span>
                                    <p>{sale.client?.phone || '-'}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Celular:</span>
                                    <p>{sale.client?.cellphone || '-'}</p>
                                </div>
                                <div className="md:col-span-3">
                                    <span className="font-medium text-gray-600">Dirección:</span>
                                    <p>{sale.client?.address || '-'}, {sale.client?.city || '-'}, {sale.client?.department || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-4">Detalles de la Venta</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-600">Fecha:</span>
                                    <p>{formatDate(sale.sale_date)}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Hora:</span>
                                    <p>{sale.sale_time}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Método de Pago:</span>
                                    <p>{sale.payment_method}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-600">Vendedor:</span>
                                    <p>{sale.user.name}</p>
                                </div>
                            </div>
                        </div>

                        {sale.notes && (
                            <div>
                                <h4 className="text-lg font-semibold mb-4">Notas</h4>
                                <p className="text-sm bg-gray-50 p-4 rounded-lg">{sale.notes}</p>
                            </div>
                        )}

                        <div>
                            <h4 className="text-lg font-semibold mb-4">Productos</h4>
                            <div className="rounded-md border overflow-hidden">
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

                        <div className="space-y-2 p-4 bg-white dark:bg-[oklch(0.100205_0_0)] rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Subtotal:</span>
                                <span>{formatCurrency(sale.total_without_tax)}</span>
                            </div>
                            {sale.discount_percentage > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Descuento ({sale.discount_percentage}%):</span>
                                    <span className="text-red-600">-{formatCurrency(sale.total_without_tax - sale.total_with_discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                <span>TOTAL:</span>
                                <span className="text-green-600">{formatCurrency(sale.total_paid)}</span>
                            </div>
                        </div>

                        {sale.public_invoice_url && sale.client?.cellphone && (
                            <div className="flex justify-end mt-4">
                                <Button onClick={handleSendToWhatsApp} className="gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    Enviar a WhatsApp
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
