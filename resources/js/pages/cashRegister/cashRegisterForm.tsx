import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import React, { useEffect } from 'react';

interface CashRegisterForForm {
    id?: number;
    opening_amount: number;
    closing_amount: number;
    notes: string;
}

interface CashRegisterFormProps {
    cashRegister?: CashRegisterForForm;
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    userPermissions: string[];
}

const CashRegisterForm: React.FC<CashRegisterFormProps> = ({ cashRegister, onCancel, onSaved, onDirtyChange, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset, isDirty } = useForm({
        notes: '',
    });

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (cashRegister?.id) {
            put(route('cash-register.update', cashRegister.id), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Caja cerrada correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: (errors) => {
                    console.log('Errores al cerrar caja:', errors);
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al cerrar la caja',
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
                        position: 'center',
                        icon: 'success',
                        title: 'Caja abierta correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: (errors) => {
                    console.log('Errores al abrir caja:', errors);
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al abrir la caja',
                        text: Object.values(errors).join('\n'),
                        showConfirmButton: true,
                    });
                },
            });
        }
    };

    const isCreating = !cashRegister?.id;

    const canSubmit = isCreating ? userPermissions.includes('Crear Caja') : userPermissions.includes('Actualizar Caja');

    return (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-1">
                <div>
                    <Label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notas
                    </Label>
                    <Textarea
                        id="notes"
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        className="w-full"
                        placeholder="Notas opcionales..."
                    />
                    {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
                </div>
            </div>
            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Guardando...' : isCreating ? 'Abrir Caja' : 'Cerrar Caja'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default CashRegisterForm;
