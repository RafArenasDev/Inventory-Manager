import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import React, { useEffect } from 'react';

const MOVEMENT_TYPES = [
    { value: 'Entrada', label: 'Entrada' },
    { value: 'Salida', label: 'Salida' },
    { value: 'Devolucion Cliente', label: 'Devolución Cliente' },
    { value: 'Devolucion Proveedor', label: 'Devolución Proveedor' },
    { value: 'Consignacion Entrada', label: 'Consignación Entrada' },
    { value: 'Consignacion Salida', label: 'Consignación Salida' },
    { value: 'Cambio Entrada', label: 'Cambio Entrada' },
    { value: 'Cambio Salida', label: 'Cambio Salida' },
    { value: 'Ajuste Inventario', label: 'Ajuste Inventario' },
] as const;

interface InventoryMovementForForm {
    id?: number;
    type:
        | 'Entrada'
        | 'Salida'
        | 'Devolucion Cliente'
        | 'Devolucion Proveedor'
        | 'Consignacion Entrada'
        | 'Consignacion Salida'
        | 'Cambio Entrada'
        | 'Cambio Salida'
        | 'Ajuste Inventario'
        | '';
    product_id: number | '' | null;
    supplier_id: number | '' | null;
    quantity: number;
    date: string;
    notes?: string;
}

interface Product {
    id: number;
    name: string;
    supplier_id?: number | null;
    supplier?: {
        id: number;
        name: string;
    };
}

interface Supplier {
    id: number;
    name: string;
}

interface InventoryMovementFormProps {
    movement?: InventoryMovementForForm;
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    products: Product[];
    suppliers: Supplier[];
    userPermissions: string[];
}

const InventoryMovementForm: React.FC<InventoryMovementFormProps> = ({ movement, onCancel, onSaved, onDirtyChange, products, userPermissions }) => {
    // Fecha actual en America/Bogota
    const now = new Date();
    const bogotaTime = new Date(now.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const year = bogotaTime.getFullYear();
    const month = String(bogotaTime.getMonth() + 1).padStart(2, '0');
    const day = String(bogotaTime.getDate()).padStart(2, '0');
    const formattedToday = `${year}-${month}-${day}`;

    const { data, setData, post, put, processing, errors, reset, isDirty } = useForm({
        type: movement?.type || '',
        product_id: movement?.product_id || '',
        supplier_id: movement?.supplier_id || '',
        quantity: movement?.quantity || 0,
        date: movement?.date || formattedToday,
        notes: movement?.notes || '',
    });

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => {
        if (movement) {
            setData({
                type: movement.type,
                product_id: movement.product_id ?? '',
                supplier_id: movement.supplier_id ?? '',
                quantity: movement.quantity,
                date: movement.date,
                notes: movement.notes || '',
            });
        } else {
            setData('date', formattedToday);
        }
    }, [movement, setData, formattedToday]);

    const handleProductChange = (value: string) => {
        const productId = value ? Number(value) : '';
        setData('product_id', productId);
        const selectedProduct = products.find((p) => p.id === productId);
        setData('supplier_id', selectedProduct?.supplier_id ?? '');
    };

    const supplierName = products.find((p) => p.id === (typeof data.product_id === 'number' ? data.product_id : 0))?.supplier?.name ?? '';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (movement?.id) {
            put(route('inventory-movements.update', movement.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Movimiento actualizado correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: (errors) => {
                    if (Object.keys(errors).length > 0) {
                        Swal.fire({
                            position: 'center',
                            icon: 'error',
                            title: 'Error al actualizar el movimiento',
                            text: 'Por favor corrija los errores en el formulario.',
                            showConfirmButton: false,
                            timer: 2200,
                        });
                    }
                },
            });
        } else {
            post(route('inventory-movements.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Movimiento registrado correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: (errors) => {
                    if (Object.keys(errors).length > 0) {
                        Swal.fire({
                            position: 'center',
                            icon: 'error',
                            title: 'Error al crear el movimiento',
                            text: 'Por favor corrija los errores en el formulario.',
                            showConfirmButton: false,
                            timer: 2200,
                        });
                    }
                },
            });
        }
    };

    // Determinar si puede enviar el formulario
    const canSubmit = movement?.id
        ? userPermissions.includes('Actualizar Movimientos Inventario')
        : userPermissions.includes('Crear Movimientos Inventario');

    const quantityMin = data.type === 'Ajuste Inventario' ? undefined : 1;

    return (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto pr-1">
                {/* Tipo */}
                <div>
                    <Label htmlFor="type" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tipo *
                    </Label>
                    <Combobox
                        items={MOVEMENT_TYPES}
                        value={MOVEMENT_TYPES.find((t) => t.value === data.type) ?? null}
                        onValueChange={(t: { value: string; label: string } | null) => setData('type', (t?.value ?? '') as typeof data.type)}
                    >
                        <ComboboxInput placeholder="Seleccione un tipo" className="mt-1 w-full" />
                        <ComboboxContent>
                            <ComboboxEmpty>No se encontraron resultados.</ComboboxEmpty>
                            <ComboboxList>
                                {(type: { value: string; label: string }) => (
                                    <ComboboxItem key={type.value} value={type}>
                                        {type.label}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                </div>

                {/* Fecha */}
                <div>
                    <Label htmlFor="date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fecha *
                    </Label>
                    <Input
                        id="date"
                        type="date"
                        value={data.date}
                        onChange={(e) => setData('date', e.target.value)}
                        max={formattedToday}
                        className="w-full"
                        required
                    />
                    {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                </div>

                {/* Producto */}
                <div>
                    <Label htmlFor="product_id" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Producto *
                    </Label>
                    <Combobox
                        items={products}
                        itemToStringLabel={(p: Product) => p.name}
                        itemToStringValue={(p: Product) => p.id.toString()}
                        value={products.find((p) => p.id === data.product_id) ?? null}
                        onValueChange={(p: Product | null) => handleProductChange(p ? p.id.toString() : '')}
                    >
                        <ComboboxInput placeholder="Seleccione un producto" className="mt-1 w-full" />
                        <ComboboxContent>
                            <ComboboxEmpty>No se encontraron productos.</ComboboxEmpty>
                            <ComboboxList>
                                {(p: Product) => (
                                    <ComboboxItem key={p.id} value={p}>
                                        {p.name}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.product_id && <p className="mt-1 text-sm text-red-600">{errors.product_id}</p>}
                </div>

                {/* Proveedor */}
                <div>
                    <Label htmlFor="supplier_name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Proveedor *
                    </Label>
                    <Input id="supplier_name" type="text" value={supplierName} readOnly className="w-full cursor-not-allowed" />
                    {errors.supplier_id && <p className="mt-1 text-sm text-red-600">{errors.supplier_id}</p>}
                </div>

                {/* Cantidad */}
                <div>
                    <Label htmlFor="quantity" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cantidad *
                    </Label>
                    <Input
                        id="quantity"
                        type="number"
                        value={data.quantity || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setData('quantity', val ? parseInt(val) : 0);
                        }}
                        min={quantityMin}
                        placeholder="0"
                        required
                        className="w-full"
                    />
                    {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
                </div>

                {/* Notas */}
                <div>
                    <Label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notas
                    </Label>
                    <Textarea
                        id="notes"
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        className="w-full"
                        rows={3}
                        placeholder="Opcional: agregar notas sobre este movimiento..."
                    />
                    {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Guardando...' : movement?.id ? 'Actualizar' : 'Registrar'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default InventoryMovementForm;
