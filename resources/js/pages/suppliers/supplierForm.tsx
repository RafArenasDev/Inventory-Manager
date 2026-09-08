import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { csrfHeader } from '@/lib/csrf';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import { Info } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// Algoritmo oficial de la DIAN (módulo 11 con tabla de pesos fija) para el
// Dígito de Verificación (DV) del NIT — se calcula siempre a partir del
// número de NIT, nunca se pide al usuario que lo adivine o lo busque en su
// RUT. El backend recalcula este mismo valor de forma independiente y
// jamás confía en el que viaja en el request.
const NIT_CHECK_DIGIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

const calculateNitCheckDigit = (nitNumber: string): string => {
    if (!nitNumber) {
        return '';
    }

    const digits = nitNumber.split('').reverse();
    const sum = digits.reduce((acc, digit, index) => acc + Number(digit) * (NIT_CHECK_DIGIT_WEIGHTS[index] ?? 0), 0);
    const remainder = sum % 11;

    return (remainder < 2 ? remainder : 11 - remainder).toString();
};

interface SupplierForForm {
    id?: number;
    name: string;
    representative?: string | null;
    nit_number?: number | string;
    nit_digit?: number | string;
    phone?: string | null;
    cellphone?: string | null;
    address?: string | null;
    email?: string | null;
    description?: string | null;
}

interface SupplierFormProps {
    supplier?: SupplierForForm;
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    userPermissions: string[];
    /** Crea por fetch/JSON en vez de un visit de Inertia — evita navegar fuera de donde se abrió el form (p.ej. desde el combobox "crear proveedor" del modal de alertas de stock). Solo aplica al crear, no al editar. */
    submitViaFetch?: boolean;
    onCreated?: (supplier: SupplierForForm & { id: number }) => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({
    supplier,
    onCancel,
    onSaved,
    onDirtyChange,
    userPermissions,
    submitViaFetch = false,
    onCreated,
}) => {
    const { data, setData, post, put, processing, errors, setError, reset, isDirty } = useForm({
        name: supplier?.name || '',
        representative: supplier?.representative || '',
        nit_number: supplier?.nit_number?.toString() || '',
        nit_digit: supplier?.nit_digit?.toString() || calculateNitCheckDigit(supplier?.nit_number?.toString() || ''),
        phone: supplier?.phone || '',
        cellphone: supplier?.cellphone || '',
        address: supplier?.address || '',
        email: supplier?.email || '',
        description: supplier?.description || '',
    });

    const [nitNumberError, setNitNumberError] = useState<string>('');

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const validateNitNumber = (value: string) => {
        if (!/^\d{1,15}$/.test(value)) {
            setNitNumberError(value.length > 15 ? 'NIT demasiado largo' : 'Solo números');
            return false;
        }
        setNitNumberError('');
        return true;
    };

    const handleNitNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 15);
        setData((current) => ({ ...current, nit_number: value, nit_digit: calculateNitCheckDigit(value) }));
        validateNitNumber(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateNitNumber(data.nit_number.toString())) {
            return;
        }

        if (supplier?.id) {
            put(route('suppliers.update', supplier.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Proveedor actualizado correctamente',
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
                        title: 'Error al actualizar el proveedor',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        } else if (submitViaFetch) {
            fetch(route('suppliers.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeader(),
                },
                body: JSON.stringify(data),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const body = await res.json().catch(() => null);
                        if (res.status === 422 && body?.errors) {
                            Object.entries(body.errors as Record<string, string[]>).forEach(([field, messages]) => {
                                setError(field as keyof typeof data, messages[0]);
                            });
                            return;
                        }
                        throw new Error('request failed');
                    }
                    const body = await res.json();
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Proveedor creado correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onCreated?.(body.supplier);
                    onSaved();
                })
                .catch(() => {
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al crear el proveedor',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                });
        } else {
            post(route('suppliers.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Proveedor creado correctamente',
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
                        title: 'Error al crear el proveedor',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        }
    };

    const isFormValid =
        data.name.trim() !== '' &&
        data.nit_number.toString().trim() !== '' &&
        data.nit_digit.toString().trim() !== '' &&
        data.representative.trim() !== '' &&
        data.email.trim() !== '' &&
        !nitNumberError;

    const canSubmit = supplier?.id ? userPermissions.includes('Actualizar Proveedores') : userPermissions.includes('Crear Proveedores');

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto p-1">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 md:col-span-2">
                        <div className="sm:col-span-3">
                            <Label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Nombre del Proveedor *
                            </Label>
                            <Input
                                type="text"
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full"
                                placeholder="Ingrese el nombre del proveedor"
                                required
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <Label htmlFor="nit_number" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                NIT *
                            </Label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                id="nit_number"
                                value={data.nit_number}
                                onChange={handleNitNumberChange}
                                className="w-full"
                                aria-invalid={!!nitNumberError}
                                placeholder="Número NIT"
                                required
                            />
                            {nitNumberError && <p className="mt-1 text-sm text-red-600">{nitNumberError}</p>}
                            {errors.nit_number && <p className="mt-1 text-sm text-red-600">{errors.nit_number}</p>}
                        </div>

                        <div className="sm:col-span-1">
                            <div className="mb-1 flex items-center gap-1">
                                <Label htmlFor="nit_digit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    DV
                                </Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                            <Info className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Dígito de Verificación: lo calcula automáticamente el sistema con el algoritmo oficial de la DIAN a partir del
                                        NIT.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <Input
                                type="text"
                                id="nit_digit"
                                value={data.nit_digit}
                                readOnly
                                className="w-full cursor-not-allowed text-center opacity-80"
                            />
                            {errors.nit_digit && <p className="mt-1 text-sm text-red-600">{errors.nit_digit}</p>}
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Label htmlFor="representative" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Representante Legal *
                        </Label>
                        <Input
                            type="text"
                            id="representative"
                            value={data.representative || ''}
                            onChange={(e) => setData('representative', e.target.value)}
                            className="w-full"
                            placeholder="Nombre del representante legal"
                            required
                        />
                        {errors.representative && <p className="mt-1 text-sm text-red-600">{errors.representative}</p>}
                    </div>

                    <div>
                        <Label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Teléfono Fijo
                        </Label>
                        <Input
                            type="tel"
                            id="phone"
                            value={data.phone || ''}
                            onChange={(e) => setData('phone', e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full"
                            placeholder="Teléfono fijo"
                        />
                        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                    </div>

                    <div>
                        <Label htmlFor="cellphone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Celular
                        </Label>
                        <Input
                            type="tel"
                            id="cellphone"
                            value={data.cellphone || ''}
                            onChange={(e) => setData('cellphone', e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full"
                            placeholder="Número de celular"
                        />
                        {errors.cellphone && <p className="mt-1 text-sm text-red-600">{errors.cellphone}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <Label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email *
                        </Label>
                        <Input
                            type="email"
                            id="email"
                            value={data.email || ''}
                            onChange={(e) => setData('email', e.target.value)}
                            className="w-full"
                            placeholder="email@proveedor.com"
                            required
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <Label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Dirección
                        </Label>
                        <Textarea
                            id="address"
                            value={data.address || ''}
                            onChange={(e) => setData('address', e.target.value)}
                            rows={2}
                            className="w-full"
                            placeholder="Dirección completa del proveedor"
                        />
                        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <Label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Descripción
                        </Label>
                        <Textarea
                            id="description"
                            value={data.description || ''}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                            className="w-full"
                            placeholder="Descripción del proveedor (opcional)"
                        />
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing || !isFormValid}>
                        {processing ? 'Guardando...' : supplier?.id ? 'Actualizar Proveedor' : 'Crear Proveedor'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default SupplierForm;
