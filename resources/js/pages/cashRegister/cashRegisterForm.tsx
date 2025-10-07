import React from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CashRegister {
    id?: number;
    register_date: string;
    opening_balance: number;
    actual_balance?: number;
    opening_notes?: string;
    closing_notes?: string;
}

interface CashRegisterFormProps {
    cashRegister?: CashRegister;
    onCancel: () => void;
    isOpening: boolean;
    userPermissions: string[];
}

const CashRegisterForm: React.FC<CashRegisterFormProps> = ({ cashRegister, onCancel, isOpening, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        register_date: cashRegister?.register_date || new Date().toISOString().split('T')[0],
        opening_balance: cashRegister?.opening_balance || 0,
        actual_balance: cashRegister?.actual_balance || 0,
        opening_notes: cashRegister?.opening_notes || '',
        closing_notes: cashRegister?.closing_notes || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isOpening) {
            post(route('cash-register.open'), {
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
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al abrir la caja",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        } else if (cashRegister?.id) {
            put(route('cash-register.close', cashRegister.id), {
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
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al cerrar la caja",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        }
    };

    const canSubmit = isOpening
        ? userPermissions.includes('Abrir Cajas')
        : userPermissions.includes('Cerrar Cajas');

    return (
        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="register_date">Fecha *</Label>
                        <Input
                            type="date"
                            id="register_date"
                            value={data.register_date}
                            onChange={(e) => setData('register_date', e.target.value)}
                            disabled={!isOpening}
                            required
                        />
                        {errors.register_date && <p className="mt-1 text-sm text-red-600">{errors.register_date}</p>}
                    </div>

                    {isOpening && (
                        <div>
                            <Label htmlFor="opening_balance">Saldo Inicial *</Label>
                            <Input
                                type="number"
                                id="opening_balance"
                                value={data.opening_balance}
                                onChange={(e) => setData('opening_balance', parseInt(e.target.value))}
                                required
                            />
                            {errors.opening_balance && <p className="mt-1 text-sm text-red-600">{errors.opening_balance}</p>}
                        </div>
                    )}

                    {!isOpening && (
                        <div>
                            <Label htmlFor="actual_balance">Saldo Real *</Label>
                            <Input
                                type="number"
                                id="actual_balance"
                                value={data.actual_balance}
                                onChange={(e) => setData('actual_balance', parseInt(e.target.value))}
                                required
                            />
                            {errors.actual_balance && <p className="mt-1 text-sm text-red-600">{errors.actual_balance}</p>}
                        </div>
                    )}

                    <div>
                        <Label htmlFor={isOpening ? "opening_notes" : "closing_notes"}>Notas</Label>
                        <Textarea
                            id={isOpening ? "opening_notes" : "closing_notes"}
                            value={isOpening ? data.opening_notes : data.closing_notes}
                            onChange={(e) => setData(isOpening ? 'opening_notes' : 'closing_notes', e.target.value)}
                        />
                        {errors[isOpening ? 'opening_notes' : 'closing_notes'] && <p className="mt-1 text-sm text-red-600">{errors[isOpening ? 'opening_notes' : 'closing_notes']}</p>}
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
                            disabled={processing}
                        >
                            {processing ? 'Guardando...' : (isOpening ? 'Abrir Caja' : 'Cerrar Caja')}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CashRegisterForm;
