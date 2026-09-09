import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { csrfHeader } from '@/lib/csrf';
import Swal from '@/lib/swal';
import SupplierForm from '@/pages/suppliers/supplierForm';
import { router, usePage } from '@inertiajs/react';
import { Info, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

interface Supplier {
    id: number;
    name: string;
    phone?: string | null;
    cellphone?: string | null;
}

interface Product {
    id: number;
    code: string;
    name: string;
    supplier_id: number | null;
    stock: number;
    price_without_tax: number;
}

const formatCOP = (value: number): string =>
    `$ ${Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

// En local (Herd) es común que ráfagas de pestañas + refrescos por
// WebSocket saturen un instante el pool de PHP y devuelvan 503 — no es un
// error real del pedido, así que antes de mostrarlo como fallo se reintenta
// con backoff creciente. Evita el "tuve que hacer doble clic en Guardar"
// que eso causaba (un solo reintento no alcanzaba cuando la ráfaga duraba
// más de medio segundo).
async function fetchWithRetry(url: string, options: RequestInit, attempt = 0): Promise<Response> {
    const MAX_ATTEMPTS = 4;
    try {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
            return fetchWithRetry(url, options, attempt + 1);
        }
        return res;
    } catch (err) {
        if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
            return fetchWithRetry(url, options, attempt + 1);
        }
        throw err;
    }
}

interface DraftItem {
    product_id: number;
    product_code: string;
    product_name: string;
    quantity_requested: number;
    quantity_received?: number;
}

interface EditableOrder {
    id: number;
    supplier: { id: number; name: string; phone?: string | null } | null;
    notes: string | null;
    expected_at: string | null;
    is_low_stock_order?: boolean;
    items: { product_id: number; product_code: string; product_name: string; quantity_requested: number; quantity_received: number }[];
}

const CREATE_SUPPLIER_SENTINEL_ID = -1;

// Mismo semáforo que Product::stockTier() + DashboardController::ALERT_STOCK_THRESHOLD
// (backend): agotado (0), crítico (1-3), bajo (4-7). Fuera de ese rango no es
// una alerta — no se muestra badge.
const ALERT_STOCK_THRESHOLD = 7;
type StockTier = 'agotado' | 'critico' | 'bajo';

function stockTier(stock: number): StockTier | null {
    if (stock > ALERT_STOCK_THRESHOLD) return null;
    if (stock === 0) return 'agotado';
    if (stock <= 3) return 'critico';
    return 'bajo';
}

const TIER_BADGE: Record<StockTier, string> = {
    agotado: 'bg-rose-800 text-white',
    critico: 'bg-rose-600 text-white',
    bajo: 'bg-amber-600 text-white',
};

const TIER_LABEL: Record<StockTier, string> = {
    agotado: 'Agotado',
    critico: 'Crítico',
    bajo: 'Bajo',
};

interface PurchaseOrderFormProps {
    suppliers: Supplier[];
    products: Product[];
    onCancel?: () => void;
    onSaved: (result?: { supplier: Supplier | null; items: DraftItem[] }) => void;
    onDirtyChange: (dirty: boolean) => void;
    initialSupplierId?: number | null;
    initialProductIds?: number[];
    /** 'inline' se usa embebido (p.ej. dentro de un acordeón) y no navega: envía por fetch/JSON. 'dialog' (default) mantiene el comportamiento normal de Inertia. */
    mode?: 'dialog' | 'inline';
    submitLabel?: string;
    submitIcon?: React.ReactNode;
    /** Cuando se pasa, el formulario edita ese pedido (PUT) en vez de crear uno nuevo (POST). */
    order?: EditableOrder | null;
    /**
     * 'alert-only' limita el selector a productos actualmente en alerta de
     * stock bajo (agotado/crítico/bajo); 'non-alert-only' a los que NO lo
     * están. Sin valor, se ven todos los productos del proveedor. Mantiene
     * separados los pedidos "por alertas" de los "normales" — ver
     * is_low_stock_order en el backend.
     */
    productFilter?: 'alert-only' | 'non-alert-only';
    /** Se llama cada vez que cambia el proveedor elegido (o se limpia). */
    onSupplierChange?: (supplier: Supplier | null) => void;
    /** Se llama cada vez que cambia el modo efectivo (forzado o deducido del primer producto elegido) — para que quien use el formulario pueda reflejarlo, p.ej. en el título del modal. */
    onProductFilterChange?: (filter: 'alert-only' | 'non-alert-only' | undefined) => void;
}

export default function PurchaseOrderForm({
    suppliers,
    products,
    onCancel,
    onSaved,
    onDirtyChange,
    initialSupplierId = null,
    initialProductIds = [],
    mode = 'dialog',
    submitLabel,
    submitIcon,
    order = null,
    productFilter,
    onSupplierChange,
    onProductFilterChange,
}: PurchaseOrderFormProps) {
    const isEditing = order !== null;
    const originalSupplierId = order?.supplier?.id ?? null;
    const resolvedSubmitLabel = submitLabel ?? (isEditing ? 'Guardar Cambios' : 'Solicitar Pedido');
    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions || [];

    const [productsOpen, setProductsOpen] = useState(false);
    const [supplierList, setSupplierList] = useState(suppliers);
    const [supplierId, setSupplierId] = useState<number | null>(order?.supplier?.id ?? initialSupplierId);
    const [items, setItems] = useState<DraftItem[]>(() => {
        if (order) {
            return order.items.map((i) => ({ ...i }));
        }
        return initialProductIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is Product => !!p)
            .map((p) => ({ product_id: p.id, product_code: p.code, product_name: p.name, quantity_requested: 1 }));
    });
    const [supplierQuery, setSupplierQuery] = useState('');
    const [pendingSupplierName, setPendingSupplierName] = useState('');
    const [showCreateSupplier, setShowCreateSupplier] = useState(false);
    // Cuando llega con un proveedor ya definido (el del grupo de alertas o
    // el pedido que se está editando), el campo arranca bloqueado para
    // evitar cambios accidentales — "Cambiar proveedor" lo habilita a
    // pedido explícito.
    const [supplierLocked, setSupplierLocked] = useState(isEditing || initialSupplierId !== null);
    const [notes, setNotes] = useState(order?.notes ?? '');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reinicia el formulario cuando cambia A QUÉ pedido apunta (de crear a
    // editar, entre dos pedidos distintos, etc.) — en vez de forzar un
    // remount del componente entero con una prop "key" desde el padre, que
    // termina interfiriendo con el bloqueo de foco/scroll que usa Radix
    // Dialog (dejaba la página con pointer-events:none pegado y había que
    // hacer doble clic). Mismo componente, mismo Dialog, solo se resetea el
    // estado derivado del pedido.
    useEffect(() => {
        if (order) {
            setSupplierList((prev) => (order.supplier && !prev.some((s) => s.id === order.supplier!.id) ? [...prev, order.supplier] : prev));
            setSupplierId(order.supplier?.id ?? null);
            setItems(order.items.map((i) => ({ ...i })));
            setNotes(order.notes ?? '');
            setSupplierLocked(true);
        } else {
            setSupplierId(initialSupplierId);
            setItems(
                initialProductIds
                    .map((id) => products.find((p) => p.id === id))
                    .filter((p): p is Product => !!p)
                    .map((p) => ({ product_id: p.id, product_code: p.code, product_name: p.name, quantity_requested: 1 })),
            );
            setNotes('');
            setSupplierLocked(initialSupplierId !== null);
        }
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id]);

    const selectedSupplier = supplierList.find((s) => s.id === supplierId) ?? null;

    // Cualquier producto en la lista de alertas (agotado/crítico/bajo) es
    // "pedido por stock bajo"; el resto es "pedido nuevo" — nunca deben
    // mezclarse en un mismo pedido. Si nadie forzó el modo desde afuera
    // (productFilter), lo decide el PRIMER producto que se agregue: apenas
    // hay un ítem, el resto del selector se restringe a su mismo tipo, para
    // que no se puedan traslapar los orígenes sin importar si ya existía o
    // no otro pedido activo de ese proveedor.
    const effectiveProductFilter = useMemo<'alert-only' | 'non-alert-only' | undefined>(() => {
        if (productFilter) return productFilter;
        const first = items[0] && products.find((p) => p.id === items[0].product_id);
        if (!first) return undefined;
        return stockTier(first.stock) !== null ? 'alert-only' : 'non-alert-only';
    }, [productFilter, items, products]);

    useEffect(() => {
        onProductFilterChange?.(effectiveProductFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveProductFilter]);

    // El proveedor por defecto de cada producto se muestra primero, pero no
    // Solo productos del proveedor elegido — si se mostrara el catálogo
    // completo, los de otros proveedores con stock bajo aparecerían sin
    // marcar en este pedido (ya que ellos se piden desde su propio
    // acordeón), lo que se veía como "productos dentro del semáforo sin
    // seleccionar" sin serlo realmente.
    const sortedProducts = useMemo(() => {
        return products
            .filter((p) => p.supplier_id === supplierId)
            .filter((p) => {
                if (!effectiveProductFilter) return true;
                const inAlert = stockTier(p.stock) !== null;
                return effectiveProductFilter === 'alert-only' ? inAlert : !inAlert;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [products, supplierId, effectiveProductFilter]);

    const selectedProducts = useMemo(
        () => items.map((i) => products.find((p) => p.id === i.product_id)).filter((p): p is Product => !!p),
        [items, products],
    );

    // Referencia interna con el precio ya registrado en cada producto — no
    // es una cotización del proveedor, pero le sirve al usuario para
    // ajustar cantidades antes de enviar si el pedido se ve muy costoso.
    const totalValue = useMemo(
        () =>
            items.reduce((sum, item) => {
                const unitPrice = products.find((p) => p.id === item.product_id)?.price_without_tax ?? 0;
                return sum + unitPrice * item.quantity_requested;
            }, 0),
        [items, products],
    );

    // Mismo estándar de validación que el resto de módulos: proveedor y al
    // menos un producto son los únicos campos realmente obligatorios acá
    // (la cantidad de cada ítem ya nunca baja de 1 por el stepper).
    const isFormValid = supplierId !== null && items.length > 0;

    const canCreateSupplier = userPermissions.includes('Crear Proveedores');
    const supplierHasExactMatch = supplierList.some((s) => s.name.toLowerCase() === supplierQuery.trim().toLowerCase());
    const showCreateSupplierOption = canCreateSupplier && supplierQuery.trim().length > 0 && !supplierHasExactMatch;

    // Se agrega como un ítem más de la colección (en vez de un ComboboxItem
    // suelto fuera de ComboboxList) para que el filtrado y la navegación por
    // teclado del combobox lo traten igual que a cualquier proveedor real.
    const supplierComboboxItems = useMemo(() => {
        if (!showCreateSupplierOption) return supplierList;
        return [...supplierList, { id: CREATE_SUPPLIER_SENTINEL_ID, name: supplierQuery.trim() }];
    }, [supplierList, showCreateSupplierOption, supplierQuery]);

    const markDirty = () => onDirtyChange(true);

    const handleSupplierChange = (s: Supplier | null) => {
        if (s?.id === CREATE_SUPPLIER_SENTINEL_ID) {
            setPendingSupplierName(supplierQuery.trim());
            setShowCreateSupplier(true);
            return;
        }
        setSupplierId(s?.id ?? null);
        // Cambiar de proveedor vacía los productos elegidos — el listado
        // queda libre para volver a buscar con el proveedor nuevo.
        setItems([]);
        markDirty();
        onSupplierChange?.(s);
    };

    const handleSupplierCreated = (created: Supplier & { id: number }) => {
        setSupplierList((prev) => [...prev, created]);
        setSupplierId(created.id);
        setItems([]);
        setShowCreateSupplier(false);
        markDirty();
        onSupplierChange?.(created);
    };

    const handleProductsChange = (selected: Product[]) => {
        setItems((prev) => {
            const prevIds = new Set(prev.map((i) => i.product_id));
            const nextIds = new Set(selected.map((p) => p.id));
            const kept = prev.filter((i) => nextIds.has(i.product_id));
            const added = selected
                .filter((p) => !prevIds.has(p.id))
                .map((p) => ({ product_id: p.id, product_code: p.code, product_name: p.name, quantity_requested: 1 }));
            return [...kept, ...added];
        });
        // Se cierra tras cada selección — un multi-select que se queda
        // abierto invitaba a seguir clickeando sobre una lista que ya
        // había cambiado de posición, con selecciones accidentales.
        setProductsOpen(false);
        markDirty();
    };

    const handleQuantityChange = (productId: number, quantity: number) => {
        setItems((prev) =>
            prev.map((i) => {
                if (i.product_id !== productId) return i;
                const min = Math.max(1, i.quantity_received ?? 0);
                return { ...i, quantity_requested: Math.max(min, quantity) };
            }),
        );
        markDirty();
    };

    const handleRemoveItem = (productId: number) => {
        const item = items.find((i) => i.product_id === productId);
        if (item && (item.quantity_received ?? 0) > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No se puede quitar',
                text: `"${item.product_name}" ya tiene recepción parcial registrada — no se puede quitar del pedido.`,
                timer: 3000,
                showConfirmButton: false,
            });
            return;
        }
        setItems((prev) => prev.filter((i) => i.product_id !== productId));
        markDirty();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!supplierId) {
            Swal.fire({ icon: 'warning', title: 'Selecciona un proveedor', timer: 2200, showConfirmButton: false });
            return;
        }
        if (items.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Agrega al menos un producto', timer: 2200, showConfirmButton: false });
            return;
        }

        const payload = {
            supplier_id: supplierId,
            notes: notes || null,
            expected_at: order?.expected_at ?? null,
            items: items.map((i) => ({ product_id: i.product_id, quantity_requested: i.quantity_requested })),
        };

        setProcessing(true);

        if (isEditing && mode === 'inline') {
            fetchWithRetry(route('purchase-orders.update', order!.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeader(),
                },
                body: JSON.stringify(payload),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const body = await res.json().catch(() => null);
                        if (res.status === 422 && body?.errors) {
                            setErrors(Object.fromEntries(Object.entries(body.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]])));
                            return;
                        }
                        throw new Error('request failed');
                    }
                    onDirtyChange(false);
                    Swal.fire({ icon: 'success', title: 'Pedido actualizado.', timer: 2200, showConfirmButton: false }).then(() => onSaved());
                })
                .catch(() => {
                    Swal.fire({
                        icon: 'error',
                        title: 'No se pudo actualizar el pedido',
                        text: 'Intenta de nuevo.',
                        timer: 3000,
                        showConfirmButton: false,
                    });
                })
                .finally(() => setProcessing(false));
            return;
        }

        if (isEditing) {
            router.visit(route('purchase-orders.update', order!.id), {
                method: 'put',
                data: payload,
                onSuccess: () => {
                    onDirtyChange(false);
                    Swal.fire({ icon: 'success', title: 'Pedido actualizado.', timer: 2200, showConfirmButton: false }).then(() => onSaved());
                },
                onError: (err) => setErrors(err as Record<string, string>),
                onFinish: () => setProcessing(false),
            });
            return;
        }

        if (mode === 'inline') {
            fetchWithRetry(route('purchase-orders.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeader(),
                },
                body: JSON.stringify(payload),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const body = await res.json().catch(() => null);
                        if (res.status === 422 && body?.errors) {
                            setErrors(Object.fromEntries(Object.entries(body.errors as Record<string, string[]>).map(([k, v]) => [k, v[0]])));
                            return;
                        }
                        throw new Error('request failed');
                    }
                    onDirtyChange(false);
                    // El WhatsApp que dispara onSaved abre una pestaña nueva
                    // y le roba el foco a esta — se espera a que el usuario
                    // vea (o cierre) este Swal antes de dejarlo pasar.
                    Swal.fire({
                        icon: 'success',
                        html: `Pedido creado exitosamente a <b>${selectedSupplier?.name}</b>`,
                        timer: 2500,
                        showConfirmButton: false,
                    }).then(() => onSaved({ supplier: selectedSupplier, items }));
                })
                .catch(() => {
                    Swal.fire({
                        icon: 'error',
                        title: 'No se pudo crear el pedido',
                        text: 'Intenta de nuevo.',
                        timer: 3000,
                        showConfirmButton: false,
                    });
                })
                .finally(() => setProcessing(false));
            return;
        }

        router.visit(route('purchase-orders.store'), {
            method: 'post',
            data: payload,
            onSuccess: () => {
                onDirtyChange(false);
                Swal.fire({
                    icon: 'success',
                    html: `Pedido creado exitosamente a <b>${selectedSupplier?.name}</b>`,
                    timer: 2500,
                    showConfirmButton: false,
                }).then(() => onSaved({ supplier: selectedSupplier, items }));
            },
            onError: (err) => setErrors(err as Record<string, string>),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <>
            <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto p-1">
                    <div>
                        <Label className="mb-1 block text-sm font-medium">Proveedor *</Label>
                        {supplierLocked ? (
                            <div className="border-input flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                                <span className="font-medium">{selectedSupplier?.name}</span>
                                <button
                                    type="button"
                                    className="flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-500"
                                    onClick={() => setSupplierLocked(false)}
                                >
                                    <Pencil className="h-3 w-3" /> Cambiar proveedor
                                </button>
                            </div>
                        ) : (
                            <Combobox
                                items={supplierComboboxItems}
                                itemToStringLabel={(s: Supplier) => s.name}
                                itemToStringValue={(s: Supplier) => String(s.id)}
                                value={selectedSupplier}
                                onValueChange={handleSupplierChange}
                                onInputValueChange={(value: string) => setSupplierQuery(value)}
                            >
                                <ComboboxInput placeholder="Buscar o crear proveedor" className="w-full" />
                                <ComboboxContent>
                                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(s: Supplier) =>
                                            s.id === CREATE_SUPPLIER_SENTINEL_ID ? (
                                                <ComboboxItem key="create" value={s} className="font-medium text-emerald-600 dark:text-emerald-500">
                                                    <Plus className="h-3.5 w-3.5" /> Crear proveedor "{s.name}"
                                                </ComboboxItem>
                                            ) : (
                                                <ComboboxItem key={s.id} value={s}>
                                                    {s.name}
                                                </ComboboxItem>
                                            )
                                        }
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        )}
                        <InputError message={errors.supplier_id} />
                    </div>

                    <div>
                        <Label className="mb-1 block text-sm font-medium">Productos</Label>
                        {effectiveProductFilter && (
                            <p className="text-muted-foreground mb-2 text-xs">
                                {effectiveProductFilter === 'alert-only'
                                    ? 'Pedido por alertas — solo se muestran productos agotados, críticos o con stock bajo.'
                                    : 'Pedido nuevo — solo se muestran productos que no están en alerta de stock.'}
                            </p>
                        )}
                        {isEditing && supplierId !== originalSupplierId && (
                            <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-600/40 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-400">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>Cambiaste de proveedor — los productos se reiniciaron. Selecciona de nuevo los que quieras pedir.</span>
                            </div>
                        )}
                        <Combobox
                            items={sortedProducts}
                            multiple
                            itemToStringLabel={(p: Product) => `${p.code} - ${p.name}`}
                            itemToStringValue={(p: Product) => String(p.id)}
                            isItemEqualToValue={(a: Product, b: Product) => a.id === b.id}
                            value={selectedProducts}
                            onValueChange={handleProductsChange}
                            open={productsOpen}
                            onOpenChange={setProductsOpen}
                            disabled={!supplierId}
                        >
                            <ComboboxInput
                                placeholder={supplierId ? 'Buscar producto por código o nombre...' : 'Elige primero un proveedor'}
                                className="w-full"
                                disabled={!supplierId}
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                <ComboboxList>
                                    {(p: Product) => {
                                        const tier = stockTier(p.stock);
                                        return (
                                            <ComboboxItem key={p.id} value={p}>
                                                {p.code} - {p.name} <span className="text-muted-foreground">({p.stock} und)</span>
                                                {tier && (
                                                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TIER_BADGE[tier]}`}>
                                                        {TIER_LABEL[tier]}
                                                    </span>
                                                )}
                                            </ComboboxItem>
                                        );
                                    }}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>

                        {items.length > 0 && (
                            <div className="border-input mt-2 rounded-md border p-2">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {items.map((item) => {
                                        const product = products.find((p) => p.id === item.product_id);
                                        const currentStock = product?.stock ?? Infinity;
                                        // El badge refleja el stock PROYECTADO (actual + lo que se está
                                        // pidiendo), no el actual — así se ve en vivo si la cantidad
                                        // elegida alcanza para salir del semáforo.
                                        const projectedTier = stockTier(currentStock + item.quantity_requested);
                                        const unitPrice = product?.price_without_tax ?? 0;
                                        return (
                                            <div
                                                key={item.product_id}
                                                className="border-input flex items-center justify-between gap-2 rounded-lg border px-3 py-2 shadow-sm transition-shadow hover:shadow-md"
                                            >
                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                    <div className="truncate text-sm font-medium">{item.product_name}</div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-muted-foreground text-xs">{item.product_code}</span>
                                                        {projectedTier ? (
                                                            <span
                                                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TIER_BADGE[projectedTier]}`}
                                                            >
                                                                {TIER_LABEL[projectedTier]}
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                                Óptimo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">Valor unitario: {formatCOP(unitPrice)}</div>
                                                    <div className="text-muted-foreground text-xs">
                                                        Valor total:{' '}
                                                        <span className="text-foreground font-medium">
                                                            {formatCOP(unitPrice * item.quantity_requested)}
                                                        </span>
                                                    </div>
                                                    {(item.quantity_received ?? 0) > 0 && (
                                                        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                                                            Ya recibido: {item.quantity_received} und
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="border-input flex shrink-0 items-center gap-1 rounded-md border px-1 py-0.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        disabled={item.quantity_requested <= Math.max(1, item.quantity_received ?? 0)}
                                                        onClick={() => handleQuantityChange(item.product_id, item.quantity_requested - 1)}
                                                    >
                                                        <Minus className="size-3" />
                                                    </Button>
                                                    <span className="w-5 text-center text-sm font-semibold tabular-nums">
                                                        {item.quantity_requested}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        onClick={() => handleQuantityChange(item.product_id, item.quantity_requested + 1)}
                                                    >
                                                        <Plus className="size-3" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    disabled={(item.quantity_received ?? 0) > 0}
                                                    title={
                                                        (item.quantity_received ?? 0) > 0
                                                            ? 'Ya tiene recepción parcial — no se puede quitar'
                                                            : undefined
                                                    }
                                                    className="shrink-0 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:text-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                                    onClick={() => handleRemoveItem(item.product_id)}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {items.length === 0 && <p className="text-muted-foreground mt-1.5 text-sm">Sin productos seleccionados todavía.</p>}
                    </div>

                    <div>
                        <Label htmlFor="notes" className="mb-1 block text-sm font-medium">
                            Notas
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => {
                                setNotes(e.target.value);
                                markDirty();
                            }}
                            placeholder="Notas opcionales..."
                            rows={2}
                        />
                    </div>

                    {items.length > 0 && (
                        <div className="border-input flex items-center justify-between rounded-lg border px-4 py-3">
                            <span className="text-sm font-bold">Total del pedido</span>
                            <span className="text-base font-bold">{formatCOP(totalValue)}</span>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 justify-end gap-3 pt-1">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                    )}
                    <Button type="submit" disabled={processing || !isFormValid} className="gap-1.5">
                        {submitIcon}
                        {processing ? 'Guardando...' : resolvedSubmitLabel}
                    </Button>
                </div>
            </form>

            <Dialog open={showCreateSupplier} onOpenChange={setShowCreateSupplier}>
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Nuevo Proveedor</DialogTitle>
                        <DialogDescription>Se agregará a la lista y quedará seleccionado en este pedido.</DialogDescription>
                    </DialogHeader>
                    <SupplierForm
                        supplier={{ name: pendingSupplierName }}
                        onCancel={() => setShowCreateSupplier(false)}
                        onSaved={() => {}}
                        userPermissions={userPermissions}
                        submitViaFetch
                        onCreated={handleSupplierCreated}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
