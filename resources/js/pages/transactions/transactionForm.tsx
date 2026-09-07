import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';

const TRANSACTION_TYPES = [
    { value: 'Ingreso', label: 'Ingreso' },
    { value: 'Gasto', label: 'Gasto' },
] as const;

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
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    userPermissions?: string[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ transaction, categories, onCancel, onSaved, onDirtyChange, userPermissions = [] }) => {
    const [selectedType, setSelectedType] = useState<'Ingreso' | 'Gasto' | ''>(transaction?.type || '');
    const [filteredCategories, setFilteredCategories] = useState<TransactionCategory[]>([]);
    const [amountInput, setAmountInput] = useState(transaction?.amount ? transaction.amount.toString() : '');

    // Función para obtener fecha y hora actual de Colombia
    const getColombiaDateTime = () => {
        const now = new Date();

        // Obtener la hora local en formato Colombia (UTC-5)
        // Crear una nueva fecha con el offset de Colombia
        const colombiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));

        return {
            // Getters locales, no toISOString(): ese convertiría usando el
            // offset del sistema operativo, no el de Bogotá, reintroduciendo
            // el desfase de un día cerca de la medianoche UTC.
            date: `${colombiaTime.getFullYear()}-${(colombiaTime.getMonth() + 1).toString().padStart(2, '0')}-${colombiaTime.getDate().toString().padStart(2, '0')}`,
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
                const colombiaDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
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

    const { data, setData, post, put, processing, errors, reset, isDirty } = useForm({
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

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

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
            const filtered = categories.filter((cat) => cat.type === selectedType);
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
                        position: 'center',
                        icon: 'success',
                        title: 'Transacción actualizada correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al actualizar la transacción',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        } else {
            post(route('transactions.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Transacción registrada correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al registrar la transacción',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        }
    };

    const paymentMethods = ['Efectivo', 'Nequi'];

    const canSubmit = transaction?.id ? userPermissions.includes('Editar Finanzas') : userPermissions.includes('Crear Finanzas');

    return (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Tipo */}
                    <div>
                        <Label htmlFor="type" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Tipo *
                        </Label>
                        <Combobox
                            items={TRANSACTION_TYPES}
                            value={TRANSACTION_TYPES.find((t) => t.value === data.type) ?? null}
                            onValueChange={(t: { value: string; label: string } | null) => handleTypeChange(t?.value ?? '')}
                        >
                            <ComboboxInput placeholder="Seleccione el tipo" />
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

                    {/* Categoría */}
                    <div>
                        <Label htmlFor="transaction_category_id" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Categoría *
                        </Label>
                        <Combobox
                            items={filteredCategories}
                            itemToStringLabel={(c: TransactionCategory) => c.name}
                            itemToStringValue={(c: TransactionCategory) => c.id.toString()}
                            value={filteredCategories.find((c) => c.id.toString() === data.transaction_category_id.toString()) ?? null}
                            onValueChange={(c: TransactionCategory | null) => setData('transaction_category_id', c ? c.id.toString() : '')}
                            disabled={!selectedType}
                        >
                            <ComboboxInput placeholder={selectedType ? 'Seleccione la categoría' : 'Seleccione primero el tipo'} />
                            <ComboboxContent>
                                <ComboboxEmpty>No hay categorías disponibles.</ComboboxEmpty>
                                <ComboboxList>
                                    {(category: TransactionCategory) => (
                                        <ComboboxItem key={category.id} value={category}>
                                            {category.name}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                        {errors.transaction_category_id && <p className="mt-1 text-sm text-red-600">{errors.transaction_category_id}</p>}
                    </div>

                    {/* Monto */}
                    <div>
                        <Label htmlFor="amount" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Monto *
                        </Label>
                        <div className="relative">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-500">$</span>
                            <Input
                                id="amount"
                                type="text"
                                value={amountInput ? formatAmountDisplay(amountInput) : ''}
                                onChange={handleAmountChange}
                                className="w-full pl-8"
                                placeholder="0"
                            />
                        </div>
                        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                    </div>

                    {/* Medio de Pago */}
                    <div>
                        <Label htmlFor="payment_method" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Medio de Pago *
                        </Label>
                        <Combobox
                            items={paymentMethods}
                            value={data.payment_method || null}
                            onValueChange={(value: string | null) => setData('payment_method', value ?? '')}
                        >
                            <ComboboxInput placeholder="Seleccione el medio de pago" />
                            <ComboboxContent>
                                <ComboboxEmpty>No se encontraron resultados.</ComboboxEmpty>
                                <ComboboxList>
                                    {(method: string) => (
                                        <ComboboxItem key={method} value={method}>
                                            {method}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                        {errors.payment_method && <p className="mt-1 text-sm text-red-600">{errors.payment_method}</p>}
                    </div>

                    {/* Fecha */}
                    <div>
                        <Label htmlFor="transaction_date" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Fecha *
                        </Label>
                        <Input
                            id="transaction_date"
                            type="date"
                            value={data.transaction_date}
                            onChange={(e) => setData('transaction_date', e.target.value)}
                            className="w-full"
                        />
                        {errors.transaction_date && <p className="mt-1 text-sm text-red-600">{errors.transaction_date}</p>}
                    </div>

                    {/* Hora */}
                    <div>
                        <Label htmlFor="transaction_time" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Hora *
                        </Label>
                        <Input
                            id="transaction_time"
                            type="time"
                            value={data.transaction_time}
                            onChange={(e) => setData('transaction_time', e.target.value)}
                            className="w-full cursor-not-allowed"
                            readOnly
                        />
                        {errors.transaction_time && <p className="mt-1 text-sm text-red-600">{errors.transaction_time}</p>}
                    </div>
                </div>

                {/* Número de Referencia */}
                <div>
                    <Label htmlFor="invoice_number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Número de Factura
                    </Label>
                    <Input
                        id="invoice_number"
                        value={data.invoice_number}
                        onChange={(e) => setData('invoice_number', e.target.value)}
                        className="w-full"
                        placeholder="Número de factura (opcional)"
                    />
                    {errors.invoice_number && <p className="mt-1 text-sm text-red-600">{errors.invoice_number}</p>}
                </div>

                {/* Descripción */}
                <div>
                    <Label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Descripción
                    </Label>
                    <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        rows={3}
                        className="w-full"
                        placeholder="Descripción de la transacción (opcional)"
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
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
                        rows={3}
                        className="w-full"
                        placeholder="Notas adicionales (opcional)"
                    />
                    {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
                </div>
            </div>

            {/* Botones */}
            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Guardando...' : transaction?.id ? 'Actualizar Transacción' : 'Crear Transacción'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default TransactionForm;
