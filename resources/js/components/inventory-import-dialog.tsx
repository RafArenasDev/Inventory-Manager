import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { csrfHeader } from '@/lib/csrf';
import Swal from '@/lib/swal';
import { router } from '@inertiajs/react';
import { AlertTriangle, Download, Hash, ListChecks, Tags, Truck, Upload } from 'lucide-react';
import { useState } from 'react';

// Debe coincidir con InventoryImportService::MAX_ROWS — no hay endpoint
// dedicado para este número porque no cambia dinámicamente por datos.
const MAX_ROWS = 50;

interface PreviewRow {
    line: number;
    codigo: string;
    nombre: string | null;
    cantidad: string | number;
    tipo_movimiento: string;
    action: 'create_product' | 'update_stock';
    errors: string[];
    detail: string;
}

interface PreviewResponse {
    token: string;
    rows: PreviewRow[];
    summary: { total: number; create_product: number; update_stock: number; errors: number };
}

interface InventoryImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrderId?: number;
}

export function InventoryImportDialog({ open, onOpenChange, purchaseOrderId }: InventoryImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewResponse | null>(null);
    const [uploading, setUploading] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const reset = () => {
        setFile(null);
        setPreview(null);
    };

    const handleClose = (o: boolean) => {
        if (!o) reset();
        onOpenChange(o);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(route('inventory-import.preview'), {
                method: 'POST',
                body: formData,
                headers: csrfHeader(),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'No se pudo leer el archivo.');
            setPreview(data as PreviewResponse);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo procesar el archivo',
                text: error instanceof Error ? error.message : 'Verifica que sea un .xlsx o .csv con las columnas esperadas.',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = () => {
        if (!preview) return;
        setConfirming(true);
        router.post(
            route('inventory-import.commit'),
            {
                token: preview.token,
                purchase_order_id: purchaseOrderId ?? null,
            },
            {
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
                onFinish: () => setConfirming(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Carga masiva</DialogTitle>
                    <DialogDescription>Sube un Excel/CSV para crear varios productos o registrar varios movimientos de una vez.</DialogDescription>
                </DialogHeader>

                {!preview && (
                    <div className="space-y-4">
                        <div className="space-y-3 rounded-lg border border-sky-100 bg-sky-50 p-4 dark:border-sky-900/30 dark:bg-sky-950/20">
                            <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">Cómo completar el archivo</p>
                            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <li className="flex gap-2">
                                    <Tags className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                                    <span>
                                        <strong>Categoría:</strong> el <strong>nombre</strong> tal como aparece en el sistema (ej.{' '}
                                        <span className="font-mono">Accesorios</span>), nunca un número de ID. Debe existir antes de subir el archivo
                                        — créala primero en el módulo Categorías si hace falta.
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                                    <span>
                                        <strong>Proveedor:</strong> también por <strong>nombre</strong>, y es opcional. Vacío deja el producto sin
                                        proveedor asignado.
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <Hash className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                                    <span>
                                        <strong>Código:</strong> si ya existe en el sistema, la fila solo registra un movimiento de stock sobre ese
                                        producto; si es nuevo, lo crea (necesita nombre, categoría y precio sin IVA).
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                                    <span>
                                        <strong>Tipo de movimiento:</strong> Entrada, Salida, Devolucion Cliente, Devolucion Proveedor, Consignacion
                                        Entrada/Salida, Cambio Entrada/Salida o Ajuste Inventario. Vacío se toma como "Entrada".
                                    </span>
                                </li>
                            </ul>
                            <p className="flex items-center gap-1.5 border-t border-sky-200 pt-2.5 text-xs text-sky-700 dark:border-sky-900/40 dark:text-sky-400">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                Máximo {MAX_ROWS} filas por archivo — si tienes más productos, divídelos en varias cargas.
                            </p>
                        </div>

                        <a
                            href={route('inventory-import.template')}
                            className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
                        >
                            <Download className="h-3.5 w-3.5" /> Descargar plantilla
                        </a>

                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="file:bg-primary file:text-primary-foreground block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-2"
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleClose(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleUpload} disabled={!file || uploading} className="gap-1">
                                <Upload className="h-4 w-4" /> {uploading ? 'Procesando...' : 'Ver vista previa'}
                            </Button>
                        </div>
                    </div>
                )}

                {preview && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="rounded-full bg-emerald-600 px-3 py-1 text-white">
                                {preview.summary.create_product} productos nuevos
                            </span>
                            <span className="rounded-full bg-sky-600 px-3 py-1 text-white">{preview.summary.update_stock} movimientos</span>
                            {preview.summary.errors > 0 && (
                                <span className="rounded-full bg-rose-600 px-3 py-1 text-white">
                                    {preview.summary.errors} con error (se omitirán)
                                </span>
                            )}
                        </div>

                        <div className="border-input max-h-80 overflow-y-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-400 dark:bg-gray-700">
                                    <tr>
                                        <th className="p-2 text-left">Fila</th>
                                        <th className="p-2 text-left">Código</th>
                                        <th className="p-2 text-left">Acción</th>
                                        <th className="p-2 text-left">Cantidad</th>
                                        <th className="p-2 text-left">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.map((row) => (
                                        <tr key={row.line} className={row.errors.length > 0 ? 'bg-rose-50 dark:bg-rose-900/10' : ''}>
                                            <td className="p-2">{row.line}</td>
                                            <td className="p-2">{row.codigo || '-'}</td>
                                            <td className="p-2">{row.action === 'create_product' ? 'Crear producto' : 'Actualizar stock'}</td>
                                            <td className="p-2">{row.cantidad}</td>
                                            <td
                                                className={
                                                    row.errors.length > 0
                                                        ? 'p-2 text-rose-600 dark:text-rose-400'
                                                        : 'p-2 text-gray-600 dark:text-gray-400'
                                                }
                                            >
                                                {row.errors.length > 0 ? row.errors.join(' ') : row.detail}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={reset}>
                                Volver a subir otro archivo
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={confirming || preview.summary.create_product + preview.summary.update_stock === 0}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {confirming ? 'Aplicando...' : `Confirmar (${preview.summary.create_product + preview.summary.update_stock})`}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
