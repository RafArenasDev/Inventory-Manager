import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInitials } from '@/hooks/use-initials';
import { Loader2, ShoppingBag } from 'lucide-react';

interface Client {
    id: number;
    document_type: string;
    document_number: number | string;
    verification_digit?: number;
    name: string;
    department?: string | null;
    city?: string | null;
    phone?: string | null;
    cellphone?: string | null;
    address?: string | null;
    email?: string | null;
    is_active: boolean;
    created_at?: string;
}

interface SaleItem {
    id: number;
    product_id: number;
    product_name?: string;
    product_code?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface SaleEntry {
    id: number;
    sale_date: string;
    items: SaleItem[];
    total?: number;
}

interface ClientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p className="text-foreground truncate text-sm">{value || '-'}</p>
        </div>
    );
}

interface Option {
    value: number;
    label: string;
}

const MESES: Option[] = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
].map((label, i) => ({ value: i + 1, label }));

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const YEARS: Option[] = Array.from({ length: 6 }, (_, i) => ({ value: currentYear - i, label: String(currentYear - i) }));

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function formatCOP(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ClientDetailModal({ isOpen, onClose, client }: ClientDetailModalProps) {
    const getInitials = useInitials();
    const [year, setYear] = useState<number>(currentYear);
    const [month, setMonth] = useState<number>(currentMonth);
    const [sales, setSales] = useState<SaleEntry[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !client) return;

        setLoading(true);
        axios
            .get(route('clients.history', client.id), {
                params: {
                    start_date: `${year}-${pad(month)}-01`,
                    end_date: `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`,
                },
            })
            .then((response) => setSales(response.data.sales || []))
            .catch(() => setSales([]))
            .finally(() => setLoading(false));
    }, [isOpen, client, year, month]);

    // Al abrir un cliente distinto, siempre partir del mes actual.
    useEffect(() => {
        if (isOpen) {
            setYear(currentYear);
            setMonth(currentMonth);
        }
    }, [client?.id, isOpen]);

    const totalMes = useMemo(() => sales.reduce((sum, sale) => sum + (sale.items?.reduce((s, i) => s + i.total_price, 0) ?? 0), 0), [sales]);

    if (!client) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[92vh] max-w-[97vw] overflow-y-auto rounded-2xl p-0 shadow-2xl sm:max-w-[1100px]">
                <div className="space-y-6 p-6">
                    {/* Encabezado */}
                    <div className="flex items-start gap-4">
                        <Avatar className="h-14 w-14 shrink-0">
                            <AvatarFallback className="bg-neutral-200 text-lg font-semibold text-black dark:bg-neutral-700 dark:text-white">
                                {getInitials(client.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-foreground text-xl font-bold">{client.name}</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm">
                                {client.document_type} {client.document_number}
                                {client.verification_digit ? `-${client.verification_digit}` : ''}
                            </DialogDescription>
                            <span
                                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                                    client.is_active ? 'bg-green-600 text-white dark:bg-green-700' : 'bg-red-600 text-white dark:bg-red-700'
                                }`}
                            >
                                {client.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>

                    {/* Datos de contacto */}
                    <div className="border-border grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-3">
                        <InfoField label="Email" value={client.email} />
                        <InfoField label="Teléfono" value={client.phone} />
                        <InfoField label="Celular" value={client.cellphone} />
                        <InfoField label="Ciudad" value={client.city} />
                        <InfoField label="Departamento" value={client.department} />
                        <InfoField label="Dirección" value={client.address} />
                    </div>

                    {/* Historial de compras */}
                    <div className="border-border space-y-3 border-t pt-5">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <h3 className="text-foreground text-sm font-semibold">Historial de Compras</h3>
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground text-xs">Año</Label>
                                    <Combobox
                                        items={YEARS}
                                        itemToStringLabel={(o: Option) => o.label}
                                        itemToStringValue={(o: Option) => String(o.value)}
                                        value={YEARS.find((o) => o.value === year) ?? null}
                                        onValueChange={(o: Option | null) => o && setYear(o.value)}
                                    >
                                        <ComboboxInput className="w-28" />
                                        <ComboboxContent>
                                            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                            <ComboboxList>
                                                {(option: Option) => (
                                                    <ComboboxItem key={option.value} value={option}>
                                                        {option.label}
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground text-xs">Mes</Label>
                                    <Combobox
                                        items={MESES}
                                        itemToStringLabel={(o: Option) => o.label}
                                        itemToStringValue={(o: Option) => String(o.value)}
                                        value={MESES.find((o) => o.value === month) ?? null}
                                        onValueChange={(o: Option | null) => o && setMonth(o.value)}
                                    >
                                        <ComboboxInput className="w-40" />
                                        <ComboboxContent>
                                            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                            <ComboboxList>
                                                {(option: Option) => (
                                                    <ComboboxItem key={option.value} value={option}>
                                                        {option.label}
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando historial...
                            </div>
                        ) : sales.length === 0 ? (
                            <div className="text-muted-foreground py-6 text-center text-sm">No tiene compras registradas en este mes.</div>
                        ) : (
                            <>
                                <div className="bg-muted/40 border-border flex flex-wrap items-center gap-4 rounded-lg border px-4 py-3">
                                    <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                                        <ShoppingBag className="text-muted-foreground h-4 w-4" />
                                        {sales.length} venta{sales.length !== 1 ? 's' : ''} este mes
                                    </div>
                                    <div className="text-foreground text-sm font-semibold">Total: {formatCOP(totalMes)}</div>
                                </div>

                                <div className="overflow-x-auto rounded-md">
                                    <Table className="min-w-full">
                                        <TableHeader className="bg-gray-400 dark:bg-gray-700">
                                            <TableRow>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Código</TableHead>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>Cantidad</TableHead>
                                                <TableHead>Precio Unitario</TableHead>
                                                <TableHead>Total Compra</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sales.flatMap((sale) =>
                                                sale.items.map((item, index) => (
                                                    <TableRow key={`${sale.id}-${item.id}`}>
                                                        {index === 0 && (
                                                            <TableCell rowSpan={sale.items.length}>{formatDate(sale.sale_date)}</TableCell>
                                                        )}
                                                        <TableCell className="font-mono text-xs">{item.product_code || '-'}</TableCell>
                                                        <TableCell>{item.product_name || 'Producto no especificado'}</TableCell>
                                                        <TableCell>{item.quantity}</TableCell>
                                                        <TableCell>{formatCOP(item.unit_price)}</TableCell>
                                                        {index === 0 && (
                                                            <TableCell rowSpan={sale.items.length} className="font-semibold">
                                                                {formatCOP(sale.items.reduce((s, i) => s + i.total_price, 0))}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                )),
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
