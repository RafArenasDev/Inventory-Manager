import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { csrfHeader } from '@/lib/csrf';
import Swal from '@/lib/swal';
import { escapeHtml } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { AlertTriangle, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useState } from 'react';

// Debe coincidir con InventoryImportService::MAX_ROWS — no hay endpoint
// dedicado para este número porque no cambia dinámicamente por datos.
const MAX_ROWS = 50;

type ImportMode = 'products' | 'movements';

interface ImportGuideRow {
    field: string;
    howTo: string;
    example: string;
}

// Carga masiva de Productos: solo crea productos nuevos, así que todos los
// campos del formulario "Nuevo Producto" son obligatorios acá también.
const IMPORT_GUIDE_PRODUCTS: ImportGuideRow[] = [
    { field: 'codigo', howTo: 'Único y nuevo — no debe existir todavía en el sistema.', example: 'PROD-045' },
    { field: 'nombre', howTo: 'El nombre del producto.', example: 'Mouse Inalámbrico Logitech' },
    { field: 'categoria', howTo: 'El nombre exacto de una categoría ya creada en el sistema.', example: 'Accesorios' },
    { field: 'proveedor', howTo: 'El nombre exacto de un proveedor ya creado en el sistema.', example: 'TecnoMayorista S.A.S' },
    { field: 'precio_sin_iva', howTo: 'Solo el número, sin puntos ni el símbolo $.', example: '50000' },
    { field: 'precio_con_iva', howTo: 'Solo el número.', example: '59500' },
    { field: 'precio_venta', howTo: 'Solo el número.', example: '80000' },
    { field: 'cantidad', howTo: 'El stock inicial, solo el número.', example: '10' },
];

// Carga masiva de Movimientos: un código existente solo registra un
// movimiento (nombre/categoría/proveedor/precio se ignoran); solo si el
// código es nuevo se exigen para crear el producto.
const IMPORT_GUIDE_MOVEMENTS: ImportGuideRow[] = [
    { field: 'codigo', howTo: 'Si ya existe, registra un movimiento; si es nuevo, crea el producto.', example: 'PROD-001' },
    { field: 'nombre', howTo: 'Solo si el código es nuevo.', example: 'Mouse Inalámbrico' },
    { field: 'categoria', howTo: 'Nombre exacto de una categoría ya creada — solo si el código es nuevo.', example: 'Accesorios' },
    { field: 'proveedor', howTo: 'Nombre exacto de un proveedor ya creado (opcional).', example: 'TecnoMayorista S.A.S' },
    { field: 'precio_sin_iva', howTo: 'Solo el número — solo si el código es nuevo.', example: '50000' },
    { field: 'cantidad', howTo: 'Las unidades del movimiento, solo el número.', example: '10' },
    {
        field: 'tipo_movimiento',
        howTo: 'Entrada, Salida, Devolucion Cliente/Proveedor, Consignacion o Cambio Entrada/Salida, Ajuste Inventario. Vacío = Entrada.',
        example: 'Entrada',
    },
];

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
    /**
     * "products": la carga solo crea productos nuevos (siempre Entrada,
     * proveedor obligatorio, un código ya existente es error). "movements":
     * comportamiento dual actual — código nuevo crea producto, código
     * existente registra un movimiento con el tipo indicado.
     */
    mode: ImportMode;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export function InventoryImportDialog({ open, onOpenChange, purchaseOrderId, mode }: InventoryImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [fileError, setFileError] = useState<{ name: string; reason: string } | null>(null);
    const [preview, setPreview] = useState<PreviewResponse | null>(null);
    const [uploading, setUploading] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const isProductsMode = mode === 'products';

    const reset = () => {
        setFile(null);
        setFileError(null);
        setPreview(null);
    };

    const handleClose = (o: boolean) => {
        if (!o) reset();
        onOpenChange(o);
    };

    const validateAndSetFile = (candidate: File) => {
        setFileError(null);

        const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) => candidate.name.toLowerCase().endsWith(ext));
        if (!hasValidExtension) {
            const reason = 'no es un archivo válido. Solo se permiten .xlsx, .xls o .csv.';
            setFileError({ name: candidate.name, reason });
            Swal.fire({ title: 'Archivo no permitido', html: `<b>${escapeHtml(candidate.name)}</b> ${reason}`, icon: 'error' });
            return;
        }
        if (candidate.size > 5 * 1024 * 1024) {
            const reason = `pesa ${(candidate.size / 1024 / 1024).toFixed(1)}MB. El máximo permitido es 5MB.`;
            setFileError({ name: candidate.name, reason });
            Swal.fire({ title: 'Archivo demasiado pesado', html: `<b>${escapeHtml(candidate.name)}</b> ${reason}`, icon: 'error' });
            return;
        }

        setFile(candidate);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const candidate = e.target.files?.[0];
        if (candidate) validateAndSetFile(candidate);
        e.target.value = '';
    };

    const handleFileDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const candidate = e.dataTransfer.files?.[0];
        if (candidate) validateAndSetFile(candidate);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mode', mode);
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
                mode,
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

    const totalToApply = preview ? preview.summary.create_product + preview.summary.update_stock : 0;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-h-[95vh] w-[95vw] overflow-y-auto sm:max-w-3xl md:max-h-none md:overflow-visible">
                <DialogHeader>
                    <DialogTitle>{isProductsMode ? 'Carga masiva de productos' : 'Carga masiva de movimientos'}</DialogTitle>
                    <DialogDescription>
                        {isProductsMode
                            ? 'Sube un Excel/CSV para crear varios productos nuevos de una vez.'
                            : 'Sube un Excel/CSV para crear varios productos o registrar varios movimientos de una vez.'}
                    </DialogDescription>
                </DialogHeader>

                {!preview && (
                    <div className="space-y-4">
                        <div className="space-y-3 rounded-lg border border-sky-100 bg-sky-50 p-4 dark:border-sky-900/30 dark:bg-sky-950/20">
                            <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">Cómo completar el archivo, columna por columna</p>
                            <div className="overflow-hidden rounded-md border border-sky-200 dark:border-sky-900/40">
                                <table className="w-full text-sm">
                                    <thead className="bg-sky-100 dark:bg-sky-900/30">
                                        <tr>
                                            <th className="p-2 text-left font-semibold text-sky-800 dark:text-sky-300">Columna</th>
                                            <th className="p-2 text-left font-semibold text-sky-800 dark:text-sky-300">Qué poner</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sky-100 bg-white dark:divide-sky-900/30 dark:bg-transparent">
                                        {(isProductsMode ? IMPORT_GUIDE_PRODUCTS : IMPORT_GUIDE_MOVEMENTS).map((row) => (
                                            <tr key={row.field}>
                                                <td className="p-2 align-top font-medium whitespace-nowrap text-gray-800 dark:text-gray-200">
                                                    {row.field}
                                                </td>
                                                <td className="p-2 align-top text-gray-600 dark:text-gray-400">
                                                    {row.howTo} <span className="text-gray-400 italic dark:text-gray-500">Ej: {row.example}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="flex items-start gap-1.5 border-t border-sky-200 pt-2.5 text-xs text-sky-700 dark:border-sky-900/40 dark:text-sky-400">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                    Si la categoría o el proveedor todavía no existen en el sistema, créalos primero en sus módulos — el archivo no
                                    los crea por ti. Máximo {MAX_ROWS} filas por archivo, y no cambies el formato de las columnas numéricas de la
                                    plantilla.
                                </span>
                            </p>
                        </div>

                        <a
                            href={route('inventory-import.template', { mode })}
                            className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
                        >
                            <Download className="h-3.5 w-3.5" /> Descargar plantilla
                        </a>

                        {file ? (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-900/20">
                                    <FileSpreadsheet className="h-6 w-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setFile(null)}
                                    title="Quitar archivo"
                                    aria-label="Quitar archivo"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <label
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDraggingFile(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDraggingFile(false);
                                }}
                                onDrop={handleFileDrop}
                                className={`flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-all duration-200 ${
                                    isDraggingFile
                                        ? 'scale-[1.01] border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                                        : 'border-gray-300 bg-gray-50 hover:border-emerald-400 dark:border-gray-600 dark:bg-black dark:hover:border-emerald-500'
                                }`}
                            >
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md shadow-emerald-900/20 transition-transform duration-200 ${
                                        isDraggingFile ? 'scale-110 -rotate-3' : ''
                                    }`}
                                >
                                    <FileSpreadsheet className="h-6 w-6 text-white" />
                                </div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    Arrastra tu archivo aquí o haz clic para buscarlo
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">XLSX, XLS o CSV · Máximo 5MB</p>
                                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileInputChange} className="sr-only" />
                            </label>
                        )}
                        {fileError && (
                            <p className="text-sm text-rose-600 dark:text-rose-400">
                                <strong>{fileError.name}</strong> {fileError.reason}
                            </p>
                        )}

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
                            {!isProductsMode && (
                                <span className="rounded-full bg-sky-600 px-3 py-1 text-white">{preview.summary.update_stock} movimientos</span>
                            )}
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
                                disabled={confirming || totalToApply === 0}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {confirming ? 'Aplicando...' : `Confirmar (${totalToApply})`}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
