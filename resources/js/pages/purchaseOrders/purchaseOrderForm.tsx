import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import Swal from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';

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
}

interface DraftItem {
    product_id: number;
    product_code: string;
    product_name: string;
    quantity_requested: number;
}

interface PurchaseOrderFormProps {
    suppliers: Supplier[];
    products: Product[];
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange: (dirty: boolean) => void;
    initialSupplierId?: number | null;
    initialProductIds?: number[];
}

export default function PurchaseOrderForm({
    suppliers,
    products,
    onCancel,
    onSaved,
    onDirtyChange,
    initialSupplierId = null,
    initialProductIds = [],
}: PurchaseOrderFormProps) {
    const [supplierId, setSupplierId] = useState<number | null>(initialSupplierId);
    const [items, setItems] = useState<DraftItem[]>(() =>
        initialProductIds
            .map((id) => products.find((p) => p.id === id))
            .filter((p): p is Product => !!p)
            .map((p) => ({ product_id: p.id, product_code: p.code, product_name: p.name, quantity_requested: 1 }))
    );
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantityToAdd, setQuantityToAdd] = useState('1');
    const [notes, setNotes] = useState('');
    const [expectedAt, setExpectedAt] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectedSupplier = suppliers.find((s) => s.id === supplierId) ?? null;

    // El proveedor por defecto de cada producto se muestra primero, pero no
    // se restringe la lista — a veces conviene pedir el mismo producto a un
    // proveedor distinto (justo el caso de "cambiar de proveedor").
    const availableProducts = useMemo(() => {
        const already = new Set(items.map((i) => i.product_id));
        const sorted = [...products].sort((a, b) => {
            const aMatches = a.supplier_id === supplierId ? 0 : 1;
            const bMatches = b.supplier_id === supplierId ? 0 : 1;
            return aMatches - bMatches || a.name.localeCompare(b.name);
        });
        return sorted.filter((p) => !already.has(p.id));
    }, [products, supplierId, items]);

    const markDirty = () => onDirtyChange(true);

    const handleAddItem = () => {
        if (!selectedProduct) return;
        const quantity = Math.max(1, parseInt(quantityToAdd) || 1);
        setItems((prev) => [
            ...prev,
            { product_id: selectedProduct.id, product_code: selectedProduct.code, product_name: selectedProduct.name, quantity_requested: quantity },
        ]);
        setSelectedProduct(null);
        setQuantityToAdd('1');
        markDirty();
    };

    const handleRemoveItem = (productId: number) => {
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

        setProcessing(true);
        router.visit(route('purchase-orders.store'), {
            method: 'post',
            data: {
                supplier_id: supplierId,
                notes: notes || null,
                expected_at: expectedAt || null,
                items: items.map((i) => ({ product_id: i.product_id, quantity_requested: i.quantity_requested })),
            },
            onSuccess: () => {
                onDirtyChange(false);
                onSaved();
            },
            onError: (err) => setErrors(err as Record<string, string>),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <Label className="block text-sm font-medium mb-1">Proveedor *</Label>
                <Combobox
                    items={suppliers}
                    itemToStringLabel={(s: Supplier) => s.name}
                    itemToStringValue={(s: Supplier) => String(s.id)}
                    value={selectedSupplier}
                    onValueChange={(s: Supplier | null) => {
                        setSupplierId(s?.id ?? null);
                        markDirty();
                    }}
                >
                    <ComboboxInput placeholder="Seleccionar proveedor" className="w-full" />
                    <ComboboxContent>
                        <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                        <ComboboxList>{(s: Supplier) => <ComboboxItem key={s.id} value={s}>{s.name}</ComboboxItem>}</ComboboxList>
                    </ComboboxContent>
                </Combobox>
                {errors.supplier_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.supplier_id}</p>
                )}
            </div>

            <div>
                <Label className="block text-sm font-medium mb-1">Agregar producto</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Combobox
                            items={availableProducts}
                            itemToStringLabel={(p: Product) => `${p.code} - ${p.name}`}
                            itemToStringValue={(p: Product) => String(p.id)}
                            value={selectedProduct}
                            onValueChange={(p: Product | null) => setSelectedProduct(p)}
                        >
                            <ComboboxInput placeholder="Buscar producto por código o nombre" className="w-full" />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                <ComboboxList>
                                    {(p: Product) => (
                                        <ComboboxItem key={p.id} value={p}>
                                            {p.code} - {p.name} <span className="text-muted-foreground">(stock: {p.stock})</span>
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                    <Input
                        type="number"
                        min={1}
                        value={quantityToAdd}
                        onChange={(e) => setQuantityToAdd(e.target.value)}
                        className="w-24"
                    />
                    <Button type="button" onClick={handleAddItem} disabled={!selectedProduct} className="gap-1">
                        <Plus className="h-4 w-4" /> Agregar
                    </Button>
                </div>
            </div>

            <div className="rounded-md border border-input overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead className="text-right">Quitar</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.product_id}>
                                <TableCell>{item.product_code}</TableCell>
                                <TableCell>{item.product_name}</TableCell>
                                <TableCell>{item.quantity_requested}</TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleRemoveItem(item.product_id)}>
                                        <Trash2 className="size-3.5 text-rose-600" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">
                                    Sin productos agregados todavía.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="expected_at" className="block text-sm font-medium mb-1">Fecha esperada (opcional)</Label>
                    <Input
                        id="expected_at"
                        type="date"
                        value={expectedAt}
                        onChange={(e) => { setExpectedAt(e.target.value); markDirty(); }}
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="notes" className="block text-sm font-medium mb-1">Notas</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); markDirty(); }}
                    placeholder="Notas opcionales..."
                    rows={2}
                />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" disabled={processing} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    {processing ? 'Guardando...' : 'Solicitar Pedido'}
                </Button>
            </div>
        </form>
    );
}
