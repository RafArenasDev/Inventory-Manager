import React from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CashRegisterForForm {
    id?: number;
    opening_amount: number;
    closing_amount: number;
    notes: string;
}

interface CashRegisterFormProps {
    cashRegister?: CashRegisterForForm;
    onCancel: () => void;
    userPermissions: string[];
}

const CashRegisterForm: React.FC<CashRegisterFormProps> = ({
    cashRegister,
    onCancel,
    userPermissions,
}) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        opening_amount: cashRegister?.opening_amount || 0,
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // console.log('Datos enviados al servidor:', {
        //     notes: data.notes,
        //     action: cashRegister?.id ? 'update' : 'create',
        //     cashRegisterId: cashRegister?.id,
        // });

        if (cashRegister?.id) {
            put(route('cash-register.update', cashRegister.id), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Caja cerrada correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onCancel();
                },
                onError: (errors) => {
                    console.log('Errores al cerrar caja:', errors);
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al cerrar la caja",
                        text: Object.values(errors).join('\n'),
                        showConfirmButton: true,
                    });
                },
            });
        } else {
            post(route('cash-register.store'), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Caja abierta correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onCancel();
                },
                onError: (errors) => {
                    console.log('Errores al abrir caja:', errors);
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al abrir la caja",
                        text: Object.values(errors).join('\n'),
                        showConfirmButton: true,
                    });
                },
            });
        }
    };

    const isCreating = !cashRegister?.id;

    const canSubmit = isCreating
        ? userPermissions.includes('Crear Caja')
        : userPermissions.includes('Actualizar Caja');

    return (
        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {isCreating && (
                        <div>
                            <Label htmlFor="opening_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Monto de Apertura *
                            </Label>
                            <input
                                type="text"
                                id="opening_amount"
                                value={data.opening_amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    const numericValue = value ? parseInt(value) : 0;
                                    setData('opening_amount', numericValue);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                                placeholder="0"
                                required
                            />
                            {errors.opening_amount && <p className="mt-1 text-sm text-red-600">{errors.opening_amount}</p>}
                        </div>
                    )}
                    <div>
                        <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notas
                        </Label>
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            placeholder="Notas opcionales..."
                        />
                        {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                        Cancelar
                    </Button>
                    {canSubmit && (
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : (isCreating ? 'Abrir Caja' : 'Cerrar Caja')}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CashRegisterForm;
