import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Minus, Trash2 } from "lucide-react";
import ClientForm from '../clients/clientForm';

interface SaleItem {
    id?: number;
    product_id: number;
    quantity: number;
    price_at_sale?: number;
    subtotal?: number;
    item_discount: number;
    product_code?: string;
    product_name?: string;
}

interface SaleFormData {
    id?: number;
    client_id?: number | null;
    client_document_number?: string;
    sale_date: string;
    sale_time: string;
    discount: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
    total_without_tax: number;
    total_with_discount: number;
    total_paid: number;
    user_id?: number;
}

interface Product {
    id: number;
    code: string;
    category_id?: number | string;
    category?: string;
    name: string;
    description: string;
    image_path?: string | null;
    price_without_tax?: number | null;
    price_with_tax?: number | null;
    iva_value?: number | null;
    sale_price?: number | null;
    supplier?: string | null;
    supplier_id?: number | null;
    stock: number;
    created_at?: string;
    updated_at?: string;
    movement_date?: string;
    movement_notes?: string;
    initial_movement_id?: number;
}

// Interface unificada para Client
interface Client {
    id: number;
    document_type: string;
    document_number: number | string;
    verification_digit?: number;
    name: string;
    department_id?: number;
    department?: string;
    city_id?: number;
    city?: string;
    phone?: string;
    cellphone?: string;
    address?: string;
    email?: string;
    is_active: boolean;
}

interface Department {
    id: number;
    name: string;
}

interface City {
    id: number;
    name: string;
    department_id: number;
}

interface SaleFormProps {
    sale?: SaleFormData;
    onCancel: () => void;
    products: Product[];
    clients: Client[];
    departments: Department[];
    cities: City[];
    userPermissions: string[];
}

const formatCurrency = (value: number): string => {
    return `$ ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const SaleForm: React.FC<SaleFormProps> = ({ sale, onCancel, products, clients, departments, cities, userPermissions }) => {
    const { auth } = usePage().props as unknown as { auth: { user: { id: number } } };
    const now = new Date();
    const initialData: SaleFormData = {
        client_id: sale?.client_id ?? null,
        client_document_number: sale?.client_document_number ?? '',
        sale_date: now.toISOString().split('T')[0],
        sale_time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
        discount: sale?.discount || 0,
        payment_method: sale?.payment_method || 'Efectivo',
        notes: sale?.notes || '',
        items: sale?.items || [],
        total_without_tax: sale?.total_without_tax || 0,
        total_with_discount: sale?.total_with_discount || 0,
        total_paid: sale?.total_paid || 0,
        user_id: auth.user.id,
    };

    const [formData, setFormData] = useState<SaleFormData>(initialData);
    const [selectedItems, setSelectedItems] = useState<SaleItem[]>(formData.items);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [productSearch, setProductSearch] = useState('');
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [showClientModal, setShowClientModal] = useState(false);
    const [clientNotFound, setClientNotFound] = useState(false);

    useEffect(() => {
        setFormData(prev => ({ ...prev, items: selectedItems }));
    }, [selectedItems]);

    const handleClientInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, client_document_number: value }));
        if (value) {
            setFilteredClients(clients.filter(c => c.document_number?.toString().startsWith(value)));
        } else {
            setFilteredClients([]);
        }
        setClientNotFound(false);
    };

    const handleSelectClient = (client: Client) => {
        const document_number = client.document_number?.toString() || '';
        setFormData(prev => ({
            ...prev,
            client_document_number: document_number,
            client_id: client.id,
        }));
        setFilteredClients([]);
        setClientNotFound(false);
    };

    const handleClientSearch = () => {
        const document_number = formData.client_document_number || '';
        const client = clients.find(c => c.document_number?.toString() === document_number);

        if (client) {
            setFormData(prev => ({
                ...prev,
                client_id: client.id,
            }));
            setClientNotFound(false);
        } else {
            setFormData(prev => ({
                ...prev,
                client_id: null,
            }));
            setClientNotFound(true);
            Swal.fire({
                position: "center",
                icon: "info",
                title: "Cliente no registrado",
                text: "Para continuar con la venta, debe crear el cliente primero.",
                showConfirmButton: false,
                timer: 3000,
            });
            setShowClientModal(true);
        }
        setFilteredClients([]);
    };

    const handleClientCreated = (newClient: Client) => {
        setFormData(prev => ({
            ...prev,
            client_document_number: newClient.document_number?.toString() || '',
            client_id: newClient.id,
        }));
        setShowClientModal(false);
        setClientNotFound(false);

        // Actualizar la lista de clients localmente con los datos completos
        if (!clients.find(c => c.id === newClient.id)) {
            // Buscar los nombres del departamento y ciudad en las listas disponibles
            const department = departments.find(d => d.id === newClient.department_id);
            const city = cities.find(c => c.id === newClient.city_id);

            const clientWithRelations: Client = {
                ...newClient,
                department: department?.name || '',
                city: city?.name || '',
            };

            clients.push(clientWithRelations);
        }

        Swal.fire({
            position: "center",
            icon: "success",
            title: "Cliente creado exitosamente",
            text: "Ya puede continuar con el registro de la venta.",
            showConfirmButton: false,
            timer: 2000,
        });
    };

    const handleCancelClientModal = () => {
        setShowClientModal(false);
        setClientNotFound(false);
    };

    const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setProductSearch(value);
        if (value) {
            setFilteredProducts(products.filter(p => p.code.toLowerCase().startsWith(value.toLowerCase())));
        } else {
            setFilteredProducts([]);
        }
    };

    const handleSelectProduct = (product: Product) => {
        setProductSearch(product.code);
        setFilteredProducts([]);
    };

    const handleProductSearch = () => {
        const code = productSearch.trim();
        const product = products.find(p => p.code.toLowerCase() === code.toLowerCase());
        if (product && product.stock > 0) {
            setSelectedItems(prev => [...prev, {
                product_id: product.id,
                product_code: product.code,
                product_name: product.name,
                quantity: 1,
                price_at_sale: product.sale_price || 0,
                item_discount: 0,
            }]);
            setProductSearch('');
            setFilteredProducts([]);
        } else {
            Swal.fire({
                position: "center",
                icon: "error",
                title: "Producto no encontrado",
                text: product ? "Producto sin stock disponible." : "Código de producto no válido.",
                showConfirmButton: false,
                timer: 2200,
            });
        }
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
        setSelectedItems(prevItems => {
            const newItems = [...prevItems];
            const item = newItems[index];
            const newQuantity = item.quantity + delta;
            const product = products.find(p => p.id === item.product_id);

            if (newQuantity >= 1 && product && newQuantity <= product.stock) {
                newItems[index] = { ...item, quantity: newQuantity };
            }

            return newItems;
        });
    };

    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const parsedValue = value === '' ? 0 : parseFloat(value.replace(/^0+/, '')) || 0;
        setFormData(prev => ({ ...prev, discount: parsedValue }));
    };

    const calculateItemTotal = (item: SaleItem) => {
        return (item.price_at_sale || 0) * item.quantity;
    };

    const calculateTotals = () => {
        const totalWithoutTax = selectedItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
        const discountAmount = totalWithoutTax * (formData.discount / 100);
        const totalWithDiscount = totalWithoutTax - discountAmount;
        const totalPaid = totalWithDiscount;
        return { totalWithoutTax, totalWithDiscount, totalPaid, discountAmount };
    };

    const { totalWithoutTax, totalWithDiscount, totalPaid, discountAmount } = calculateTotals();

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            total_without_tax: totalWithoutTax,
            total_with_discount: totalWithDiscount,
            total_paid: totalPaid,
        }));
    }, [totalWithoutTax, totalWithDiscount, totalPaid]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        if (selectedItems.length === 0) {
            Swal.fire({
                position: "center",
                icon: "error",
                title: "Error en los items",
                text: "Debe agregar al menos un item a la venta.",
                showConfirmButton: false,
                timer: 2200,
            });
            setProcessing(false);
            return;
        }

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

        const dataToSend = {
            client_id: formData.client_id,
            user_id: formData.user_id,
            sale_date: formData.sale_date,
            sale_time: formData.sale_time,
            discount: formData.discount,
            payment_method: formData.payment_method,
            notes: formData.notes || '',
            items: selectedItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_sale: item.price_at_sale,
                subtotal: calculateItemTotal(item),
                item_discount: item.item_discount,
            })),
            total_without_tax: totalWithoutTax,
            total_with_discount: totalWithDiscount,
            total_paid: totalPaid,
        };

        console.log('Data sent:', JSON.stringify(dataToSend, null, 2));

        const url = route('sales.store');
        router.visit(url, {
            method: 'post',
            data: dataToSend,
            onSuccess: () => {
                console.log('Success');
                Swal.fire({
                    position: "center",
                    icon: "success",
                    title: "Venta creada correctamente",
                    showConfirmButton: false,
                    timer: 2200,
                });
                setFormData(initialData);
                onCancel();
            },
            onError: (err) => {
                console.log('Errors:', JSON.stringify(err, null, 2));
                setErrors(err);
                Swal.fire({
                    position: "center",
                    icon: "error",
                    title: "Error al crear la venta",
                    text: 'Verifica los datos ingresados.',
                    showConfirmButton: false,
                    timer: 2200,
                });
            },
            onFinish: () => setProcessing(false),
        });
    };

    const canSubmit = userPermissions.includes('Crear Ventas');

    const selectedClient = formData.client_id ? clients.find(c => c.id === formData.client_id) : null;

    return (
        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6 max-w-full mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Información del Cliente</h3>
                    <div className="relative max-w-md">
                        <div className="flex space-x-2">
                            <Input
                                type="text"
                                id="client_document_number"
                                value={formData.client_document_number || ''}
                                onChange={handleClientInputChange}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleClientSearch();
                                    }
                                }}
                                placeholder="Documento (CC, TI, CE, NIT)"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            />
                            <Button type="button" onClick={handleClientSearch} disabled={!formData.client_document_number}>
                                Buscar
                            </Button>
                        </div>
                        {filteredClients.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 max-h-60 overflow-auto rounded-md shadow-lg mt-1">
                                {filteredClients.map((c) => (
                                    <li
                                        key={c.id}
                                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-gray-100"
                                        onClick={() => handleSelectClient(c)}
                                    >
                                        {c.document_number} - {c.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {clientNotFound && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                    Cliente no encontrado. Se abrirá el formulario para crear uno nuevo.
                                </p>
                            </div>
                        )}
                    </div>
                    {selectedClient && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <Label htmlFor="client_document_type">Tipo de Documento</Label>
                                <Input id="client_document_type" value={selectedClient.document_type || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            <div>
                                <Label htmlFor="client_document_number_display">Número de Documento</Label>
                                <Input id="client_document_number_display" value={selectedClient.document_number || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            {selectedClient.document_type === 'NIT' && (
                                <div>
                                    <Label htmlFor="client_verification_digit">Dígito de Verificación</Label>
                                    <Input id="client_verification_digit" value={selectedClient.verification_digit || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                                </div>
                            )}
                            <div>
                                <Label htmlFor="client_name">Nombre</Label>
                                <Input id="client_name" value={selectedClient.name || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            <div>
                                <Label htmlFor="client_email">Email</Label>
                                <Input id="client_email" value={selectedClient.email || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            <div>
                                <Label htmlFor="client_phone">Teléfono</Label>
                                <Input id="client_phone" value={selectedClient.phone || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            <div>
                                <Label htmlFor="client_cellphone">Celular</Label>
                                <Input id="client_cellphone" value={selectedClient.cellphone || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            <div className="md:col-span-2">
                                <Label htmlFor="client_address">Dirección</Label>
                                <Input id="client_address" value={selectedClient.address || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            <div>
                                <Label htmlFor="client_department">Departamento</Label>
                                <Input id="client_department" value={selectedClient.department || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                            <div>
                                <Label htmlFor="client_city">Ciudad</Label>
                                <Input id="client_city" value={selectedClient.city || ''} readOnly className="bg-gray-100 dark:bg-gray-700" />
                            </div>
                        </div>
                    )}
                    {errors.client_id && <p className="mt-1 text-sm text-red-600">{errors.client_id}</p>}
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detalles de la Venta</h3>
                    <div>
                        <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Método de Pago *
                        </Label>
                        <div className="flex space-x-2">
                            <Button
                                type="button"
                                variant={formData.payment_method === 'Efectivo' ? 'default' : 'outline'}
                                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'Efectivo' }))}
                            >
                                Efectivo
                            </Button>
                            <Button
                                type="button"
                                variant={formData.payment_method === 'Nequi' ? 'default' : 'outline'}
                                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'Nequi' }))}
                            >
                                Nequi
                            </Button>
                        </div>
                        {errors.payment_method && <p className="mt-1 text-sm text-red-600">{errors.payment_method}</p>}
                    </div>

                    <div>
                        <Label htmlFor="discount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descuento Total (%)
                        </Label>
                        <input
                            type="text"
                            id="discount"
                            value={formData.discount === 0 ? '' : formData.discount}
                            onChange={handleDiscountChange}
                            onKeyPress={(e) => {
                                if (!/[0-9.]/.test(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            placeholder="0"
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

                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Items de la Venta</h3>
                    <div className="relative max-w-md">
                        <div className="flex space-x-2">
                            <Input
                                type="text"
                                value={productSearch}
                                onChange={handleProductInputChange}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleProductSearch();
                                    }
                                }}
                                placeholder="Código del producto (ej. JL161200)"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            />
                            <Button type="button" onClick={handleProductSearch} disabled={!productSearch}>
                                Añadir Item
                            </Button>
                        </div>
                        {filteredProducts.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 max-h-60 overflow-auto rounded-md shadow-lg mt-1">
                                {filteredProducts.map((p) => (
                                    <li
                                        key={p.id}
                                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-gray-100"
                                        onClick={() => handleSelectProduct(p)}
                                    >
                                        {p.code} - {p.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-400 dark:bg-gray-700">
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Precio Unitario</TableHead>
                                    <TableHead>Precio Total</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.product_code}</TableCell>
                                        <TableCell>{item.product_name}</TableCell>
                                        <TableCell>{formatCurrency(item.price_at_sale || 0)}</TableCell>
                                        <TableCell>{formatCurrency(calculateItemTotal(item))}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleUpdateQuantity(index, -1)}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="min-w-[2rem] text-center">{item.quantity}</span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleUpdateQuantity(index, 1)}
                                                    disabled={item.quantity >= (products.find(p => p.id === item.product_id)?.stock || 0)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => handleRemoveItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {selectedItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4">
                                            No hay items agregados. Ingrese un código de producto arriba.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {errors.items && <p className="mt-1 text-sm text-red-600">{errors.items}</p>}
                </div>

                <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">Subtotal:</span>
                        <span>{formatCurrency(totalWithoutTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">Descuento ({formData.discount}%):</span>
                        <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-medium">Total con Descuento:</span>
                        <span>{formatCurrency(totalWithDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total a Pagar:</span>
                        <span className="text-green-600">{formatCurrency(totalPaid)}</span>
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
                            {processing ? 'Guardando...' : 'Crear Venta'}
                        </Button>
                    )}
                </div>
            </form>

            {/* Modal para crear cliente */}
            {showClientModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Crear Nuevo Cliente</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelClientModal}
                                >
                                    Cerrar
                                </Button>
                            </div>
                            <ClientForm
                                client={{
                                    document_type: '',
                                    document_number: formData.client_document_number || '',
                                    name: '',
                                    department_id: undefined,
                                    city_id: undefined,
                                    phone: '',
                                    cellphone: '',
                                    address: '',
                                    email: '',
                                    is_active: true,
                                }}
                                onCancel={handleCancelClientModal}
                                userPermissions={userPermissions}
                                departments={departments}
                                cities={cities}
                                onSuccess={handleClientCreated}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaleForm;
