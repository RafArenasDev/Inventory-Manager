import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { Button } from '@/components/ui/button';
import { CurrencyCell } from '@/components/ui/currency-cell';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Swal from '@/lib/swal';
import { formatWhatsAppNumber, getWhatsAppGreeting } from '@/lib/whatsapp';

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
    discount_type: 'percentage' | 'fixed';
    total_paid: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
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
    return `$ ${Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function SaleDetailModal({ isOpen, onClose, sale, businessName }: SaleDetailModalProps) {
    if (!sale) return null;

    const handleSendToWhatsApp = () => {
        if (sale.client?.cellphone && sale.public_invoice_url) {
            const greeting = getWhatsAppGreeting();
            const pdfUrl = `${window.location.origin}${sale.public_invoice_url}`;
            const message = encodeURIComponent(`${greeting}, de parte de ${businessName}. ¡Aquí está su recibo de pago adjunto!`);
            const link = `https://wa.me/${formatWhatsAppNumber(sale.client.cellphone)}?text=${message}`;
            window.open(link, '_blank');

            fetch(pdfUrl)
                .then((response) => response.blob())
                .then((blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = decodeURIComponent(sale.public_invoice_url!.split('/').pop() || `Recibo_${sale.invoice_number}.pdf`);
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                })
                .catch((error) => {
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
            <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto rounded-2xl p-0 shadow-2xl sm:max-w-[800px] dark:border-gray-800">
                <div className="space-y-6 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Venta: {sale.invoice_number}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Detalle completo de la venta {sale.invoice_number}: cliente, productos y totales.
                            </DialogDescription>
                            {sale.is_cancelled && (
                                <span className="mt-2 inline-block rounded-full bg-red-500 px-4 py-1 text-sm font-semibold text-white">ANULADA</span>
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
                                    {sale.client?.document_type === 'NIT' &&
                                        sale.client?.verification_digit &&
                                        ` - ${sale.client.verification_digit}`}
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
                        <div className="max-h-[240px] overflow-y-auto rounded-md border">
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
                                            <TableCell>
                                                <CurrencyCell value={item.price_at_sale} />
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                <CurrencyCell value={item.subtotal} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Subtotal:</span>
                            <CurrencyCell value={sale.total_without_tax} className="w-28" />
                        </div>
                        {sale.discount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">
                                    Descuento (
                                    {sale.discount_type === 'percentage'
                                        ? // El servidor solo guarda el monto ya calculado del
                                          // descuento (no el % que se tecleó), así que el % se
                                          // reconstruye desde la proporción sobre el subtotal.
                                          `${sale.total_without_tax > 0 ? Math.round((sale.discount / sale.total_without_tax) * 100) : 0}%`
                                        : formatCurrency(sale.discount)}
                                    ):
                                </span>
                                <CurrencyCell
                                    value={-(sale.total_without_tax - sale.total_with_discount)}
                                    className="w-28 text-red-600 dark:text-red-400"
                                />
                            </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold dark:border-gray-700">
                            <span>TOTAL:</span>
                            <CurrencyCell value={sale.total_paid} className="w-28 text-green-600 dark:text-green-400" />
                        </div>
                    </div>

                    {sale.public_invoice_url && sale.client?.cellphone && (
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSendToWhatsApp}
                                className="gap-2 bg-[#25D366] text-white hover:bg-[#1DA851] dark:bg-[#25D366] dark:hover:bg-[#1DA851]"
                            >
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
