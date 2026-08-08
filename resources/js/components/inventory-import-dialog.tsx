import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import Swal from '@/lib/swal';

interface PreviewRow {
    line: number;
    codigo: string;
    nombre: string | null;
    cantidad: string | number;
    tipo_movimiento: string;
    action: 'create_product' | 'update_stock';
    errors: string[];
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
                headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content },
            });
            if (!res.ok) throw new Error('No se pudo leer el archivo.');
            const data: PreviewResponse = await res.json();
            setPreview(data);
        } catch {
            Swal.fire({ icon: 'error', title: 'No se pudo procesar el archivo', text: 'Verifica que sea un .xlsx o .csv con las columnas esperadas.' });
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = () => {
        if (!preview) return;
        setConfirming(true);
        router.post(route('inventory-import.commit'), {
            token: preview.token,
            purchase_order_id: purchaseOrderId ?? null,
        }, {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
            onFinish: () => setConfirming(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Carga masiva</DialogTitle>
                    <DialogDescription>
                        Sube un Excel/CSV para crear varios productos o registrar varios movimientos de una vez.
                    </DialogDescription>
                </DialogHeader>

                {!preview && (
                    <div className="space-y-4">
                        <a
                            href={route('inventory-import.template')}
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                            <Download className="h-3.5 w-3.5" /> Descargar plantilla
                        </a>

                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:cursor-pointer"
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
                            <Button onClick={handleUpload} disabled={!file || uploading} className="gap-1">
                                <Upload className="h-4 w-4" /> {uploading ? 'Procesando...' : 'Ver vista previa'}
                            </Button>
                        </div>
                    </div>
                )}

                {preview && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="rounded-full bg-emerald-600 px-3 py-1 text-white">{preview.summary.create_product} productos nuevos</span>
                            <span className="rounded-full bg-sky-600 px-3 py-1 text-white">{preview.summary.update_stock} movimientos</span>
                            {preview.summary.errors > 0 && (
                                <span className="rounded-full bg-rose-600 px-3 py-1 text-white">{preview.summary.errors} con error (se omitirán)</span>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto rounded-md border border-input">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-400 dark:bg-gray-700 sticky top-0">
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
                                            <td className="p-2 text-rose-600 dark:text-rose-400">{row.errors.join(' ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={reset}>Volver a subir otro archivo</Button>
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
