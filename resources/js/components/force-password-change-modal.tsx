import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { generateSecurePassword } from '@/lib/generate-password';
import { useForm, usePage } from '@inertiajs/react';
import { Wand2 } from 'lucide-react';
import React, { useRef } from 'react';

export default function ForcePasswordChangeModal() {
    const { auth } = usePage().props as unknown as { auth: { user: { must_change_password?: boolean } | null } };
    const mustChange = !!auth.user?.must_change_password && !route().current('password.edit');
    const passwordInput = useRef<HTMLInputElement>(null);

    const { data, setData, put, errors, reset, processing } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleGeneratePassword = () => {
        const generated = generateSecurePassword();
        setData((current) => ({
            ...current,
            password: generated,
            password_confirmation: generated,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            // Sin onSuccess: el backend cierra la sesión y redirige a
            // /login con su propio aviso.
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
                className="bg-card max-w-[95vw] rounded-2xl p-0 shadow-2xl sm:max-w-[450px] dark:border-gray-800 [&>button]:hidden"
            >
                <div className="space-y-4 p-6">
                    <div>
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Cambia tu contraseña</DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Por seguridad, debes establecer una nueva contraseña antes de continuar.
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fpc-current-password">Contraseña actual</Label>
                            <PasswordInput
                                id="fpc-current-password"
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                autoComplete="current-password"
                                autoFocus
                            />
                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="fpc-password">Nueva contraseña</Label>
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
                                id="fpc-password"
                                ref={passwordInput}
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
                            <PasswordInput
                                id="fpc-password-confirmation"
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
