import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, X } from "lucide-react";

interface SaleItem {
    id?: number;
    product_id: number;
    quantity: number;
    price_at_sale?: number;
    subtotal?: number;
    item_discount: number;
}

interface SaleFormData {
    id?: number;
    client_id?: number | null;
    sale_date: string;
    discount: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
    total_without_tax: number;
    total_with_tax: number;
    total_paid: number;
}

interface Product {
    id: number;
    name: string;
    sale_price: number;
    stock: number;
}

interface Client {
    id: number;
    name: string;
}

interface SaleFormProps {
    sale?: SaleFormData;
    onCancel: () => void;
    products: Product[];
    clients: Client[];
    userPermissions: string[];
}

const SaleForm: React.FC<SaleFormProps> = ({ sale, onCancel, products, clients, userPermissions }) => {
    const initialData: SaleFormData = {
        id: sale?.id,
        client_id: sale?.client_id ?? null,
        sale_date: typeof sale?.sale_date === 'string' ? sale.sale_date : new Date().toISOString().split('T')[0],
        discount: sale?.discount || 0,
        payment_method: sale?.payment_method || 'Efectivo',
        notes: sale?.notes || '',
        items: sale?.items || [],
        total_without_tax: sale?.total_without_tax || 0,
        total_with_tax: sale?.total_with_tax || 0,
        total_paid: sale?.total_paid || 0,
    };

    const [formData, setFormData] = useState<SaleFormData>(initialData);
    const [selectedItems, setSelectedItems] = useState<SaleItem[]>(formData.items);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setFormData(prev => ({ ...prev, items: selectedItems }));
    }, [selectedItems]);

    const handleAddItem = () => {
        const defaultProductId = products.length > 0 ? products[0].id : 0;
        setSelectedItems([...selectedItems, { product_id: defaultProductId, quantity: 1, item_discount: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const handleUpdateItem = (index: number, field: keyof SaleItem, value: number) => {
        const newItems = [...selectedItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setSelectedItems(newItems);
    };

    const calculateItemSubtotal = (item: SaleItem) => {
        const product = products.find(p => p.id === item.product_id);
        return product ? (product.sale_price * item.quantity) - item.item_discount : 0;
    };

    const calculateTotals = () => {
        const totalWithoutTax = selectedItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
        const totalWithTax = totalWithoutTax;
        const totalPaid = totalWithTax - formData.discount;
        return { totalWithoutTax, totalWithTax, totalPaid };
    };

    const { totalWithoutTax, totalWithTax, totalPaid } = calculateTotals();

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            total_without_tax: totalWithoutTax,
            total_with_tax: totalWithTax,
            total_paid: totalPaid,
        }));
    }, [totalWithoutTax, totalWithTax, totalPaid]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const invalidItems = selectedItems.some(item => item.product_id === 0 || !products.some(p => p.id === item.product_id));
        if (invalidItems) {
            Swal.fire({
                position: "center",
                icon: "error",
                title: "Error en los items",
                text: "Todos los items deben tener un producto válido seleccionado.",
                showConfirmButton: false,
                timer: 2200,
            });
            setProcessing(false);
            return;
        }

        const fd = new FormData();
        if (formData.id) fd.append('id', formData.id.toString());
       if (formData.client_id !== undefined && formData.client_id !== null) fd.append('client_id', formData.client_id.toString());
        fd.append('sale_date', formData.sale_date);
        fd.append('discount', formData.discount.toString());
        fd.append('payment_method', formData.payment_method);
        if (formData.notes) fd.append('notes', formData.notes);
        formData.items.forEach((item, index) => {
            if (item.id) fd.append(`items[${index}][id]`, item.id.toString());
            fd.append(`items[${index}][product_id]`, item.product_id.toString());
            fd.append(`items[${index}][quantity]`, item.quantity.toString());
            if (item.price_at_sale) fd.append(`items[${index}][price_at_sale]`, item.price_at_sale.toString());
            if (item.subtotal) fd.append(`items[${index}][subtotal]`, item.subtotal.toString());
            fd.append(`items[${index}][item_discount]`, item.item_discount.toString());
        });
        fd.append('total_without_tax', formData.total_without_tax.toString());
        fd.append('total_with_tax', formData.total_with_tax.toString());
        fd.append('total_paid', formData.total_paid.toString());

        const url = formData.id ? route('sales.update', formData.id) : route('sales.store');
        router.visit(url, {
            method: formData.id ? 'put' : 'post',
            data: fd,
            onSuccess: () => {
                Swal.fire({
                    position: "center",
                    icon: "success",
                    title: formData.id ? "Venta actualizada correctamente" : "Venta creada correctamente",
                    showConfirmButton: false,
                    timer: 2200,
                });
                setFormData(initialData);
                onCancel();
            },
            onError: (err) => {
                setErrors(err);
                Swal.fire({
                    position: "center",
                    icon: "error",
                    title: formData.id ? "Error al actualizar la venta" : "Error al crear la venta",
                    text: 'Verifica los datos ingresados.',
                    showConfirmButton: false,
                    timer: 2200,
                });
            },
            onFinish: () => setProcessing(false),
        });
    };

    const canSubmit = sale?.id
        ? userPermissions.includes('Actualizar Ventas')
        : userPermissions.includes('Crear Ventas');

    return (
        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cliente
                        </Label>
                        <Select
                            value={formData.client_id?.toString() || 'none'}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value === 'none' ? null : parseInt(value) }))}
                        >
                            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Seleccione cliente (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin cliente</SelectItem>
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                        {client.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.client_id && <p className="mt-1 text-sm text-red-600">{errors.client_id}</p>}
                    </div>

                    <div>
                        <Label htmlFor="sale_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fecha de Venta *
                        </Label>
                        <Input
                            type="date"
                            id="sale_date"
                            value={formData.sale_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, sale_date: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            required
                        />
                        {errors.sale_date && <p className="mt-1 text-sm text-red-600">{errors.sale_date}</p>}
                    </div>

                    <div>
                        <Label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Método de Pago *
                        </Label>
                        <Select
                            value={formData.payment_method}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                        >
                            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Seleccione método de pago" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                <SelectItem value="Nequi">Nequi</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.payment_method && <p className="mt-1 text-sm text-red-600">{errors.payment_method}</p>}
                    </div>

                    <div>
                        <Label htmlFor="discount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descuento Total
                        </Label>
                        <Input
                            type="number"
                            id="discount"
                            value={formData.discount}
                            onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                            min={0}
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                        />
                        {errors.discount && <p className="mt-1 text-sm text-red-600">{errors.discount}</p>}
                    </div>

                    <div>
                        <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notas
                        </Label>
                        <textarea
                            id="notes"
                            value={formData.notes || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            placeholder="Notas adicionales (opcional)"
                        />
                        {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Items de la Venta
                    </Label>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-400 dark:bg-gray-700">
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Descuento por Item</TableHead>
                                    <TableHead>Subtotal</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Select
                                                value={item.product_id ? item.product_id.toString() : ''}
                                                onValueChange={(value) => handleUpdateItem(index, 'product_id', parseInt(value))}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Seleccione producto" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map((product) => (
                                                        <SelectItem
                                                            key={product.id}
                                                            value={product.id.toString()}
                                                            disabled={product.stock <= 0}
                                                        >
                                                            {product.name} (Stock: {product.stock}, Precio: {product.sale_price})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                min={1}
                                                max={products.find(p => p.id === item.product_id)?.stock || 1}
                                                className="w-full"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={item.item_discount}
                                                onChange={(e) => handleUpdateItem(index, 'item_discount', parseFloat(e.target.value) || 0)}
                                                min={0}
                                                step="0.01"
                                                className="w-full"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            ${calculateItemSubtotal(item).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => handleRemoveItem(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {selectedItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">
                                            No hay items agregados. Añada uno usando el botón abajo.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <Button
                        type="button"
                        onClick={handleAddItem}
                        className="gap-1"
                        disabled={products.length === 0 || products.every(p => p.stock <= 0)}
                    >
                        <Plus className="h-4 w-4" />
                        Añadir Item
                    </Button>
                    {errors.items && <p className="mt-1 text-sm text-red-600">{errors.items}</p>}
                </div>

                <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">Subtotal:</span>
                        <span>${totalWithoutTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">Total con Tax:</span>
                        <span>${totalWithTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">Descuento:</span>
                        <span className="text-red-600">-${formData.discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total a Pagar:</span>
                        <span className="text-green-600">${totalPaid.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        type="button"
                        onClick={onCancel}
                        variant="outline"
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    {canSubmit && (
                        <Button
                            type="submit"
                            disabled={processing || selectedItems.length === 0}
                        >
                            {processing ? 'Guardando...' : (sale?.id ? 'Actualizar Venta' : 'Crear Venta')}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default SaleForm;
