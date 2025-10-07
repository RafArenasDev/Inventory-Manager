import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TransactionCategory {
    id: number;
    name: string;
    type: 'Ingreso' | 'Gasto';
}

interface Transaction {
    id?: number;
    type: 'Ingreso' | 'Gasto';
    transaction_category_id: number;
    amount: number;
    transaction_date: string;
    transaction_time: string;
    payment_method: string;
    description: string | null;
    notes: string | null;
    invoice_number: string | null;
}

interface TransactionFormProps {
    transaction?: Transaction;
    categories: TransactionCategory[];
    onCancel: () => void;
    userPermissions?: string[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ transaction, categories, onCancel, userPermissions = [] }) => {
    const [selectedType, setSelectedType] = useState<'Ingreso' | 'Gasto' | ''>(transaction?.type || '');
    const [filteredCategories, setFilteredCategories] = useState<TransactionCategory[]>([]);
    const [amountInput, setAmountInput] = useState(transaction?.amount ? transaction.amount.toString() : '');

    // Función para obtener fecha y hora actual de Colombia
    const getColombiaDateTime = () => {
        const now = new Date();

        // Obtener la hora local en formato Colombia (UTC-5)
        // Crear una nueva fecha con el offset de Colombia
        const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));

        return {
            date: colombiaTime.toISOString().split('T')[0],
            time: colombiaTime.toTimeString().slice(0, 5), // HH:MM formato 24h
        };
    };

    const { date: currentDate, time: currentTime } = getColombiaDateTime();

    // Función para formatear la hora correctamente para Colombia
    const formatTimeForColombia = (timeString: string | undefined, dateString: string | undefined): string => {
        if (!timeString || !dateString) return currentTime;

        try {
            // Si ya está en formato HH:MM, devolverlo directamente
            if (/^\d{2}:\d{2}$/.test(timeString)) {
                return timeString;
            }

            // Si viene de la base de datos en formato UTC, convertirlo a hora local de Colombia
            const utcDate = new Date(`${dateString}T${timeString}Z`);
            if (!isNaN(utcDate.getTime())) {
                // Convertir a hora local de Colombia
                const colombiaDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "America/Bogota" }));
                return colombiaDate.toTimeString().slice(0, 5);
            }

            return currentTime;
        } catch (e) {
            console.error('Error formatting time for Colombia:', e);
            return currentTime;
        }
    };

    let initialDate = currentDate;
    let initialTime = currentTime;

    if (transaction?.transaction_date) {
        try {
            const dateObj = new Date(transaction.transaction_date);
            if (!isNaN(dateObj.getTime())) {
                initialDate = dateObj.toISOString().split('T')[0];
            }
        } catch (e) {
            console.error('Error parsing transaction_date:', e);
        }
    }

    // Usar la función de formateo para la hora de Colombia
    if (transaction?.transaction_time && transaction?.transaction_date) {
        initialTime = formatTimeForColombia(transaction.transaction_time, transaction.transaction_date);
    }

    const { data, setData, post, put, processing, errors, reset } = useForm({
        type: transaction?.type || '',
        transaction_category_id: transaction?.transaction_category_id || '',
        amount: transaction?.amount || '',
        transaction_date: initialDate,
        transaction_time: initialTime, // Usar la hora formateada correctamente para Colombia
        payment_method: transaction?.payment_method || '',
        description: transaction?.description || '',
        notes: transaction?.notes || '',
        invoice_number: transaction?.invoice_number || '',
    });

    // Asegurarse de que la hora se establezca correctamente después de la inicialización
    useEffect(() => {
        if (transaction?.transaction_time && transaction?.transaction_date && data.transaction_time === currentTime) {
            const formattedTime = formatTimeForColombia(transaction.transaction_time, transaction.transaction_date);
            if (formattedTime !== data.transaction_time) {
                setData('transaction_time', formattedTime);
            }
        }
    }, [transaction?.transaction_time, transaction?.transaction_date, data.transaction_time, currentTime]);

    useEffect(() => {
        if (selectedType) {
            const filtered = categories.filter(cat => cat.type === selectedType);
            setFilteredCategories(filtered);
        } else {
            setFilteredCategories([]);
        }
    }, [selectedType, categories]);

    const handleTypeChange = (value: string) => {
        setSelectedType(value as 'Ingreso' | 'Gasto');
        setData('type', value);
        setData('transaction_category_id', '');
    };

    const formatAmountDisplay = (value: string) => {
        if (!value) return '';
        const numberValue = parseInt(value.replace(/\D/g, ''));
        if (isNaN(numberValue)) return '';
        return new Intl.NumberFormat('es-CO').format(numberValue);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');

        if (!rawValue || rawValue === '0') {
            setAmountInput('');
            setData('amount', '');
            return;
        }

        const cleanValue = rawValue.replace(/^0+/, '');

        setAmountInput(cleanValue);
        setData('amount', cleanValue ? parseInt(cleanValue) : '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (transaction?.id) {
            put(route('transactions.update', transaction.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Transacción actualizada correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onCancel();
                },
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al actualizar la transacción",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        } else {
            post(route('transactions.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Transacción creada correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onCancel();
                },
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al crear la transacción",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        }
    };

    const paymentMethods = [
        'Efectivo',
        'Nequi'
    ];

    const canSubmit = transaction?.id
        ? userPermissions.includes('Editar Finanzas')
        : userPermissions.includes('Crear Finanzas');

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo */}
                <div>
                    <Label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo *
                    </Label>
                    <Select
                        value={data.type}
                        onValueChange={handleTypeChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Ingreso">Ingreso</SelectItem>
                            <SelectItem value="Gasto">Gasto</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                </div>

                {/* Categoría */}
                <div>
                    <Label htmlFor="transaction_category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Categoría *
                    </Label>
                    <Select
                        value={data.transaction_category_id.toString()}
                        onValueChange={(value) => setData('transaction_category_id', value)}
                        disabled={!selectedType}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={selectedType ? "Seleccione la categoría" : "Seleccione primero el tipo"} />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.transaction_category_id && <p className="mt-1 text-sm text-red-600">{errors.transaction_category_id}</p>}
                </div>

                {/* Monto */}
                <div>
                    <Label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Monto *
                    </Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            $
                        </span>
                        <Input
                            id="amount"
                            type="text"
                            value={amountInput ? formatAmountDisplay(amountInput) : ''}
                            onChange={handleAmountChange}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            placeholder="0"
                        />
                    </div>
                    {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                </div>

                {/* Medio de Pago */}
                <div>
                    <Label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Medio de Pago *
                    </Label>
                    <Select
                        value={data.payment_method}
                        onValueChange={(value) => setData('payment_method', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione el medio de pago" />
                        </SelectTrigger>
                        <SelectContent>
                            {paymentMethods.map((method) => (
                                <SelectItem key={method} value={method}>
                                    {method}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.payment_method && <p className="mt-1 text-sm text-red-600">{errors.payment_method}</p>}
                </div>

                {/* Fecha */}
                <div>
                    <Label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha *
                    </Label>
                    <Input
                        id="transaction_date"
                        type="date"
                        value={data.transaction_date}
                        onChange={(e) => setData('transaction_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                    />
                    {errors.transaction_date && <p className="mt-1 text-sm text-red-600">{errors.transaction_date}</p>}
                </div>

                {/* Hora */}
                <div>
                    <Label htmlFor="transaction_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hora *
                    </Label>
                    <Input
                        id="transaction_time"
                        type="time"
                        value={data.transaction_time}
                        onChange={(e) => setData('transaction_time', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                        readOnly
                    />
                    {errors.transaction_time && <p className="mt-1 text-sm text-red-600">{errors.transaction_time}</p>}
                </div>
            </div>

            {/* Número de Referencia */}
            <div>
                <Label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Número de Factura
                </Label>
                <Input
                    id="invoice_number"
                    value={data.invoice_number}
                    onChange={(e) => setData('invoice_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                    placeholder="Número de factura (opcional)"
                />
                {errors.invoice_number && <p className="mt-1 text-sm text-red-600">{errors.invoice_number}</p>}
            </div>

            {/* Descripción */}
            <div>
                <Label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descripción
                </Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                    placeholder="Descripción de la transacción (opcional)"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Notas */}
            <div>
                <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notas
                </Label>
                <Textarea
                    id="notes"
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                    placeholder="Notas adicionales (opcional)"
                />
                {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
            </div>

            {/* Botones */}
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
                        disabled={processing}
                    >
                        {processing ? 'Guardando...' : (transaction?.id ? 'Actualizar Transacción' : 'Crear Transacción')}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default TransactionForm;
