import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { CurrencyCell } from '@/components/ui/currency-cell';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import Swal from '@/lib/swal';
import { router, usePage } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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
    discount_type: 'percentage' | 'fixed';
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
    onSaved?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    products: Product[];
    clients: Client[];
    departments: Department[];
    cities: City[];
    userPermissions: string[];
}

const formatCurrency = (value: number): string => {
    return `$ ${Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const InfoField: React.FC<{ label: string; value?: string | number | null; className?: string }> = ({ label, value, className }) => (
    <div className={`min-w-0 ${className || ''}`}>
        <p className="text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">{label}</p>
        <p
            className="truncate text-sm text-gray-900 dark:text-gray-100"
            title={value !== undefined && value !== null && value !== '' ? String(value) : undefined}
        >
            {value !== undefined && value !== null && value !== '' ? value : '-'}
        </p>
    </div>
);

const SaleForm: React.FC<SaleFormProps> = ({ sale, onCancel, onSaved, onDirtyChange, products, clients, departments, cities, userPermissions }) => {
    const { auth } = usePage().props as unknown as { auth: { user: { id: number } } };
    // Usar hora de Bogotá explícitamente: `toISOString()` da la fecha en UTC,
    // lo que desalinea sale_date respecto a sale_time (que sí usaba hora local)
    // cerca de la medianoche UTC (7pm-12am hora Bogotá), registrando ventas
    // con la fecha del día siguiente.
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const initialData: SaleFormData = {
        client_id: sale?.client_id ?? null,
        client_document_number: sale?.client_document_number ?? '',
        sale_date: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`,
        sale_time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
        discount: sale?.discount || 0,
        discount_type: sale?.discount_type || 'fixed',
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
        setFormData((prev) => ({ ...prev, items: selectedItems }));
    }, [selectedItems]);

    useEffect(() => {
        onDirtyChange?.(selectedItems.length > 0 || formData.client_id !== null);
    }, [selectedItems, formData.client_id, onDirtyChange]);

    const handleClientInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Si ya había un cliente resuelto (client_id) y el usuario vuelve a
        // tocar el documento, ese client_id queda obsoleto de inmediato —
        // si no se limpia acá, una venta podría terminar asociada al
        // cliente viejo aunque el texto en pantalla ya sea otro.
        setFormData((prev) => ({ ...prev, client_document_number: value, client_id: null }));
        if (value) {
            setFilteredClients(clients.filter((c) => c.document_number?.toString().startsWith(value)));
        } else {
            setFilteredClients([]);
        }
        setClientNotFound(false);
    };

    const handleSelectClient = (client: Client) => {
        const document_number = client.document_number?.toString() || '';
        setFormData((prev) => ({
            ...prev,
            client_document_number: document_number,
            client_id: client.id,
        }));
        setFilteredClients([]);
        setClientNotFound(false);
    };

    const handleClientSearch = () => {
        const document_number = (formData.client_document_number || '').trim();
        const client = clients.find((c) => c.document_number?.toString() === document_number);

        if (client) {
            setFormData((prev) => ({
                ...prev,
                client_id: client.id,
            }));
            setClientNotFound(false);
        } else {
            setFormData((prev) => ({
                ...prev,
                client_id: null,
            }));
            setClientNotFound(true);
            Swal.fire({
                position: 'center',
                icon: 'info',
                title: 'Cliente no registrado',
                text: 'Para continuar con la venta, debe crear el cliente primero.',
                showConfirmButton: false,
                timer: 3000,
            });
            setShowClientModal(true);
        }
        setFilteredClients([]);
    };

    const handleClientCreated = (newClient: Client) => {
        setFormData((prev) => ({
            ...prev,
            client_document_number: newClient.document_number?.toString() || '',
            client_id: newClient.id,
        }));
        setShowClientModal(false);
        setClientNotFound(false);

        // Actualizar la lista de clients localmente con los datos completos
        if (!clients.find((c) => c.id === newClient.id)) {
            // Buscar los nombres del departamento y ciudad en las listas disponibles
            const department = departments.find((d) => d.id === newClient.department_id);
            const city = cities.find((c) => c.id === newClient.city_id);

            const clientWithRelations: Client = {
                ...newClient,
                department: department?.name || '',
                city: city?.name || '',
            };

            clients.push(clientWithRelations);
        }

        Swal.fire({
            position: 'center',
            icon: 'success',
            title: 'Cliente creado exitosamente',
            text: 'Ya puede continuar con el registro de la venta.',
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
            setFilteredProducts(products.filter((p) => p.code.toLowerCase().startsWith(value.toLowerCase())));
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
        const product = products.find((p) => p.code.toLowerCase() === code.toLowerCase());
        if (product && product.stock > 0) {
            setSelectedItems((prev) => [
                ...prev,
                {
                    product_id: product.id,
                    product_code: product.code,
                    product_name: product.name,
                    quantity: 1,
                    price_at_sale: product.sale_price || 0,
                    item_discount: 0,
                },
            ]);
            setProductSearch('');
            setFilteredProducts([]);
        } else {
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Producto no encontrado',
                text: product ? 'Producto sin stock disponible.' : 'Código de producto no válido.',
                showConfirmButton: false,
                timer: 2200,
            });
        }
    };

    const handleRemoveItem = (index: number) => {
        setSelectedItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
        setSelectedItems((prevItems) => {
            const newItems = [...prevItems];
            const item = newItems[index];
            const newQuantity = item.quantity + delta;
            const product = products.find((p) => p.id === item.product_id);

            if (newQuantity >= 1 && product && newQuantity <= product.stock) {
                newItems[index] = { ...item, quantity: newQuantity };
            }

            return newItems;
        });
    };

    const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let parsedValue = value === '' ? 0 : parseFloat(value.replace(/^0+/, '')) || 0;
        if (formData.discount_type === 'percentage') {
            parsedValue = Math.min(parsedValue, 100);
        }
        setFormData((prev) => ({ ...prev, discount: parsedValue }));
    };

    const handleDiscountTypeChange = (isPercentage: boolean) => {
        setFormData((prev) => ({ ...prev, discount_type: isPercentage ? 'percentage' : 'fixed', discount: 0 }));
    };

    const calculateItemTotal = (item: SaleItem) => {
        return (item.price_at_sale || 0) * item.quantity;
    };

    const calculateTotals = () => {
        const totalWithoutTax = selectedItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
        const discountAmount =
            formData.discount_type === 'percentage' ? totalWithoutTax * (formData.discount / 100) : Math.min(formData.discount, totalWithoutTax);
        const totalWithDiscount = totalWithoutTax - discountAmount;
        const totalPaid = totalWithDiscount;
        return { totalWithoutTax, totalWithDiscount, totalPaid, discountAmount };
    };

    const { totalWithoutTax, totalWithDiscount, totalPaid, discountAmount } = calculateTotals();

    useEffect(() => {
        setFormData((prev) => ({
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

        if (!formData.client_id) {
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Falta el cliente',
                text: 'Busque el documento del cliente y selecciónelo antes de continuar.',
                showConfirmButton: false,
                timer: 2200,
            });
            setProcessing(false);
            return;
        }

        if (selectedItems.length === 0) {
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Error en los items',
                text: 'Debe agregar al menos un item a la venta.',
                showConfirmButton: false,
                timer: 2200,
            });
            setProcessing(false);
            return;
        }

        const invalidItems = selectedItems.some((item) => item.product_id === 0 || !products.some((p) => p.id === item.product_id));
        if (invalidItems) {
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Error en los items',
                text: 'Todos los items deben tener un producto válido seleccionado.',
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
            discount_type: formData.discount_type,
            payment_method: formData.payment_method,
            notes: (formData.notes || '').trim(),
            items: selectedItems.map((item) => ({
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

        const url = route('sales.store');
        router.visit(url, {
            method: 'post',
            data: dataToSend,
            onSuccess: () => {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: 'Venta registrada correctamente',
                    showConfirmButton: false,
                    timer: 2200,
                });
                setFormData(initialData);
                if (onSaved) {
                    onSaved();
                } else {
                    onCancel();
                }
            },
            onError: (err) => {
                setErrors(err);
                Swal.fire({
                    position: 'center',
                    icon: 'error',
                    title: 'Error al registrar la venta',
                    text: 'Verifica los datos ingresados.',
                    showConfirmButton: false,
                    timer: 2200,
                });
            },
            onFinish: () => setProcessing(false),
        });
    };

    const canSubmit = userPermissions.includes('Crear Ventas');

    const selectedClient = formData.client_id ? clients.find((c) => c.id === formData.client_id) : null;
    const isNequi = formData.payment_method === 'Nequi';
    const isPercentage = formData.discount_type === 'percentage';

    // Cliente y forma de pago pasan a obligatorios de verdad — antes el
    // botón solo miraba que hubiera items. client_id debe ser un cliente
    // real ya resuelto (no basta con haber escrito un documento).
    const isFormValid = formData.client_id !== null && formData.client_id !== undefined && !!formData.payment_method && selectedItems.length > 0;

    return (
        <>
            <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
                {/* Único contenedor con scroll: header y botones de acción quedan siempre visibles */}
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-1">
                    {/* Información del Cliente */}
                    <div className="shrink-0 space-y-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Información del Cliente</h3>
                        <div className="relative max-w-md">
                            <Label htmlFor="client_document_number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Documento del cliente *
                            </Label>
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
                                    aria-invalid={!!errors.client_id}
                                    placeholder="Documento (CC, TI, CE, NIT)"
                                    className="w-full"
                                />
                                <Button type="button" onClick={handleClientSearch} disabled={!formData.client_document_number}>
                                    Buscar
                                </Button>
                            </div>
                            {filteredClients.length > 0 && (
                                <ul className="bg-background text-foreground border-input absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg">
                                    {filteredClients.map((c) => (
                                        <li
                                            key={c.id}
                                            className="hover:bg-accent hover:text-accent-foreground cursor-pointer px-3 py-2"
                                            onClick={() => handleSelectClient(c)}
                                        >
                                            {c.document_number} - {c.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {clientNotFound && (
                                <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950/40">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        Cliente no encontrado. Se abrirá el formulario para crear uno nuevo.
                                    </p>
                                </div>
                            )}
                        </div>
                        {selectedClient && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-gray-200 p-2.5 sm:grid-cols-3 lg:grid-cols-5 dark:border-gray-800">
                                <InfoField label="Tipo Doc." value={selectedClient.document_type} />
                                <InfoField label="N° Documento" value={selectedClient.document_number} />
                                <InfoField label="Nombre" value={selectedClient.name} />
                                <InfoField label="Email" value={selectedClient.email} />
                                <InfoField label="Teléfono" value={selectedClient.phone} />
                                <InfoField label="Celular" value={selectedClient.cellphone} />
                                <InfoField label="Dirección" value={selectedClient.address} />
                                <InfoField label="Ciudad / Depto." value={`${selectedClient.city || '-'}, ${selectedClient.department || '-'}`} />
                                {selectedClient.document_type === 'NIT' && (
                                    <InfoField label="Dígito Verif." value={selectedClient.verification_digit} />
                                )}
                            </div>
                        )}
                        <InputError message={errors.client_id} />
                    </div>

                    {/* Detalles de la Venta */}
                    <div className="shrink-0 space-y-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Detalles de la Venta</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pago *</Label>
                                <div className="flex h-[34px] items-center gap-2.5">
                                    <span
                                        className={`text-sm ${!isNequi ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                                    >
                                        Efectivo
                                    </span>
                                    <Switch
                                        id="payment_method"
                                        checked={isNequi}
                                        onCheckedChange={(checked) =>
                                            setFormData((prev) => ({ ...prev, payment_method: checked ? 'Nequi' : 'Efectivo' }))
                                        }
                                    />
                                    <span
                                        className={`text-sm ${isNequi ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                                    >
                                        Nequi
                                    </span>
                                </div>
                                <InputError message={errors.payment_method} />
                            </div>

                            <div>
                                <Label htmlFor="discount" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Descuento Total
                                </Label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-28">
                                        {!isPercentage && (
                                            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                                                $
                                            </span>
                                        )}
                                        <Input
                                            type="text"
                                            id="discount"
                                            value={formData.discount === 0 ? '' : formData.discount}
                                            onChange={handleDiscountChange}
                                            onKeyPress={(e) => {
                                                if (!/[0-9.]/.test(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className={isPercentage ? 'pr-6' : 'pl-6'}
                                            placeholder="0"
                                        />
                                        {isPercentage && (
                                            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                                                %
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex h-[34px] items-center gap-2">
                                        <span
                                            className={`text-sm ${!isPercentage ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                                        >
                                            Valor
                                        </span>
                                        <Switch id="discount_type" checked={isPercentage} onCheckedChange={handleDiscountTypeChange} />
                                        <span
                                            className={`text-sm ${isPercentage ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                                        >
                                            Porcentaje
                                        </span>
                                    </div>
                                </div>
                                <InputError message={errors.discount} />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Notas
                            </Label>
                            <Textarea
                                id="notes"
                                value={formData.notes || ''}
                                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                                rows={1}
                                className="min-h-0 w-full"
                                placeholder="Notas adicionales (opcional)"
                            />
                            <InputError message={errors.notes} />
                        </div>
                    </div>

                    {/* Items de la Venta */}
                    <div className="flex flex-col gap-2">
                        <div className="shrink-0 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Items de la Venta</h3>
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
                                        className="w-full"
                                    />
                                    <Button type="button" onClick={handleProductSearch} disabled={!productSearch}>
                                        Añadir Item
                                    </Button>
                                </div>
                                {filteredProducts.length > 0 && (
                                    <ul className="bg-background text-foreground border-input absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg">
                                        {filteredProducts.map((p) => (
                                            <li
                                                key={p.id}
                                                className="hover:bg-accent hover:text-accent-foreground cursor-pointer px-3 py-2"
                                                onClick={() => handleSelectProduct(p)}
                                            >
                                                {p.code} - {p.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="rounded-md border border-gray-200 dark:border-gray-800">
                            <div className="max-h-[280px] overflow-y-auto p-1.5">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-gray-100 dark:bg-white/[0.04]">
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
                                                <TableCell>
                                                    <CurrencyCell value={item.price_at_sale || 0} />
                                                </TableCell>
                                                <TableCell>
                                                    <CurrencyCell value={calculateItemTotal(item)} />
                                                </TableCell>
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
                                                            disabled={item.quantity >= (products.find((p) => p.id === item.product_id)?.stock || 0)}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveItem(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {selectedItems.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">
                                                    No hay items agregados. Ingrese un código de producto arriba.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <InputError message={errors.items} />
                    </div>

                    {/* Totales */}
                    <div className="shrink-0 space-y-0.5 rounded-lg bg-gray-50 p-2.5 dark:bg-white/[0.03]">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Subtotal:</span>
                            <CurrencyCell value={totalWithoutTax} className="w-28" />
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">
                                Descuento ({isPercentage ? `${formData.discount}%` : formatCurrency(formData.discount)}):
                            </span>
                            <CurrencyCell value={-discountAmount} className="w-28 text-red-600" />
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-1.5 text-lg font-bold dark:border-gray-800">
                            <span>Total a Pagar:</span>
                            <CurrencyCell value={totalPaid} className="w-28 text-green-600 dark:text-green-500" />
                        </div>
                    </div>
                </div>

                {/* Botones de acción — fuera del área de scroll, siempre visibles */}
                <div className="flex shrink-0 justify-end space-x-3 pt-1">
                    <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                        Cancelar
                    </Button>
                    {canSubmit && (
                        <Button type="submit" disabled={processing || !isFormValid}>
                            {processing ? 'Guardando...' : 'Crear Venta'}
                        </Button>
                    )}
                </div>
            </form>

            {/* Modal para crear cliente */}
            <Dialog
                open={showClientModal}
                onOpenChange={(open) => {
                    if (!open) handleCancelClientModal();
                }}
            >
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Nuevo Cliente</DialogTitle>
                        <DialogDescription>Completa los datos para registrar el cliente y continuar con la venta.</DialogDescription>
                    </DialogHeader>
                    {showClientModal && (
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
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SaleForm;
