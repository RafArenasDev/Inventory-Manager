import React, { useRef } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import InputError from '@/components/input-error';

export default function ForcePasswordChangeModal() {
    const { auth } = usePage().props as unknown as { auth: { user: { must_change_password?: boolean } | null } };
    const mustChange = !!auth.user?.must_change_password && !route().current('password.edit');
    const passwordInput = useRef<HTMLInputElement>(null);

    const { data, setData, put, errors, reset, processing } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
            },
        });
    };

    if (!mustChange) return null;

    return (
        <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className="sm:max-w-[450px] max-w-[95vw] bg-card dark:border-gray-800 rounded-2xl p-0 shadow-2xl [&>button]:hidden"
            >
                <div className="p-6 space-y-4">
                    <div>
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Cambia tu contraseña
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Por seguridad, debes establecer una nueva contraseña antes de continuar.
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fpc-current-password">Contraseña actual</Label>
                            <Input
                                id="fpc-current-password"
                                type="password"
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                autoComplete="current-password"
                                autoFocus
                            />
                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="fpc-password">Nueva contraseña</Label>
                            <Input
                                id="fpc-password"
                                ref={passwordInput}
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                autoComplete="new-password"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Mínimo 12 caracteres, con mayúsculas, minúsculas, números y símbolos.
                            </p>
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="fpc-password-confirmation">Confirmar contraseña</Label>
                            <Input
                                id="fpc-password-confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                autoComplete="new-password"
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        <Button type="submit" disabled={processing} className="w-full">
                            {processing ? 'Guardando...' : 'Guardar y continuar'}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
