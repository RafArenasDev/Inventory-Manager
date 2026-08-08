import React, { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onCancel, onSaved, onDirtyChange, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset, isDirty } = useForm({
        name: supplier?.name || '',
        representative: supplier?.representative || '',
        nit_number: supplier?.nit_number?.toString() || '',
        nit_digit: supplier?.nit_digit?.toString() || '',
        phone: supplier?.phone || '',
        cellphone: supplier?.cellphone || '',
        address: supplier?.address || '',
        email: supplier?.email || '',
        description: supplier?.description || '',
    });

    const [nitNumberError, setNitNumberError] = useState<string>('');
    const [nitDigitError, setNitDigitError] = useState<string>('');

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const validateNitNumber = (value: string) => {
        if (!/^\d+$/.test(value)) {
            setNitNumberError('Debe ser un número válido');
            return false;
        }
        setNitNumberError('');
        return true;
    };

    const validateNitDigit = (value: string) => {
        if (!/^\d$/.test(value)) {
            setNitDigitError('Debe ser un dígito (0-9)');
            return false;
        }
        setNitDigitError('');
        return true;
    };

    const handleNitNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setData('nit_number', value);
        validateNitNumber(value);
    };

    const handleNitDigitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 1);
        setData('nit_digit', value);
        validateNitDigit(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateNitNumber(data.nit_number.toString()) || !validateNitDigit(data.nit_digit.toString())) {
            return;
        }

        if (supplier?.id) {
            put(route('suppliers.update', supplier.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Proveedor actualizado correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onSaved();
                },
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al actualizar el proveedor",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        } else {
            post(route('suppliers.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Proveedor creado correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onSaved();
                },
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al crear el proveedor",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        }
    };

    const canSubmit = supplier?.id
        ? userPermissions.includes('Actualizar Proveedores')
        : userPermissions.includes('Crear Proveedores');

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

                <div>
                    <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        NIT *
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            id="nit_number"
                            value={data.nit_number}
                            onChange={handleNitNumberChange}
                            className="flex-1"
                            aria-invalid={!!nitNumberError}
                            placeholder="Número NIT"
                            min="0"
                            required
                        />
                        <span className="text-gray-500">-</span>
                        <Input
                            type="number"
                            id="nit_digit"
                            value={data.nit_digit}
                            onChange={handleNitDigitChange}
                            className="w-12"
                            aria-invalid={!!nitDigitError}
                            placeholder="D"
                            min="0"
                            max="9"
                            required
                        />
                    </div>
                    {nitNumberError && <p className="mt-1 text-sm text-red-600">{nitNumberError}</p>}
                    {nitDigitError && <p className="mt-1 text-sm text-red-600">{nitDigitError}</p>}
                    {errors.nit_number && <p className="mt-1 text-sm text-red-600">{errors.nit_number}</p>}
                    {errors.nit_digit && <p className="mt-1 text-sm text-red-600">{errors.nit_digit}</p>}
                </div>

                <div className="md:col-span-2">
                    <Label htmlFor="representative" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Representante Legal
                    </Label>
                    <Input
                        type="text"
                        id="representative"
                        value={data.representative || ''}
                        onChange={(e) => setData('representative', e.target.value)}
                        className="w-full"
                        placeholder="Nombre del representante legal"
                    />
                    {errors.representative && <p className="mt-1 text-sm text-red-600">{errors.representative}</p>}
                </div>

                <div>
                    <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <Label htmlFor="cellphone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </Label>
                    <Input
                        type="email"
                        id="email"
                        value={data.email || ''}
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full"
                        placeholder="email@proveedor.com"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div className="md:col-span-2">
                    <Label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <Label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        disabled={processing || !!nitNumberError || !!nitDigitError}
                    >
                        {processing ? 'Guardando...' : (supplier?.id ? 'Actualizar Proveedor' : 'Crear Proveedor')}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default SupplierForm;
