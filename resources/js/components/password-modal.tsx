import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef } from 'react';

import InputError from '@/components/input-error';
import { PasswordRequirements } from '@/components/password-requirements';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { generateSecurePassword } from '@/lib/generate-password';
import { passwordMeetsPolicy } from '@/lib/password-policy';
import { Wand2 } from 'lucide-react';

interface PasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PasswordModal({ open, onOpenChange }: PasswordModalProps) {
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const passwordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, clearErrors, processing } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (open) {
            reset();
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleGeneratePassword = () => {
        const generated = generateSecurePassword();
        setData((current) => ({
            ...current,
            password: generated,
            password_confirmation: generated,
        }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            // Sin onSuccess propio: el backend cierra la sesión y redirige a
            // /login, que ya muestra su propio aviso de éxito — un Swal acá
            // solo alcanzaría a parpadear mientras la página cambia.
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (formErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    const passwordPolicyOk = passwordMeetsPolicy(data.password);
    const passwordsMatch = data.password.length > 0 && data.password === data.password_confirmation;
    const isFormValid = data.current_password.trim() !== '' && passwordPolicyOk && passwordsMatch;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Contraseña</DialogTitle>
                    <DialogDescription>Usa una contraseña larga y aleatoria para mantener tu cuenta segura.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} noValidate className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="current_password">Contraseña actual *</Label>
                        <PasswordInput
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            aria-invalid={!!errors.current_password}
                            className="w-full"
                            autoComplete="current-password"
                            placeholder="Contraseña actual"
                        />
                        <InputError message={errors.current_password} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Nueva contraseña *</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleGeneratePassword}
                                className="h-auto gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                            >
                                <Wand2 className="h-3 w-3" />
                                Generar contraseña
                            </Button>
                        </div>
                        <PasswordInput
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            aria-invalid={!!errors.password}
                            className="w-full"
                            autoComplete="new-password"
                            placeholder="Nueva contraseña"
                        />
                        <PasswordRequirements value={data.password} />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirmar contraseña *</Label>
                        <PasswordInput
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            aria-invalid={!!errors.password_confirmation || (data.password_confirmation.length > 0 && !passwordsMatch)}
                            className="w-full"
                            autoComplete="new-password"
                            placeholder="Confirmar contraseña"
                        />
                        <InputError
                            message={
                                errors.password_confirmation ||
                                (data.password_confirmation.length > 0 && !passwordsMatch ? 'Las contraseñas no coinciden.' : undefined)
                            }
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing || !isFormValid}>
                            {processing ? 'Guardando...' : 'Guardar contraseña'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
