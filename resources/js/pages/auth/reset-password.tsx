import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';
import Swal from '@/lib/swal';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

interface ResetPasswordProps {
    token: string;
    email: string;
}

type ResetPasswordForm = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<ResetPasswordForm>>({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            // MANTENER alerta de éxito ORIGINAL
            onSuccess: () => {
                // Alerta interactiva de CONTRASEÑA RESTABLECIDA (ORIGINAL)
                Swal.fire({
                    title: "¡Contraseña restablecida!",
                    icon: "success",
                    text: "Tu contraseña ha sido actualizada exitosamente. Puedes iniciar sesión con tu nueva contraseña.",
                    draggable: true,
                    confirmButtonText: 'Continuar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Redirigir al login cuando haga clic en "Iniciar sesión"
                        window.location.href = route('login');
                    }
                });
                reset('password', 'password_confirmation');
            },
            // VALIDACIONES DE CAMPOS como en Login
            onFinish: () => reset('password', 'password_confirmation'),
            onError: (errors) => {
                if (errors.email || errors.password || errors.password_confirmation) {
                    Swal.fire({
                        title: "Error en los datos",
                        icon: "error",
                        text: 'Por favor, verifica que todos los campos estén completos y correctos.',
                        draggable: true,
                        confirmButtonText: 'OK'
                    });
                }
                if (errors.token) {
                    Swal.fire({
                        title: "Enlace inválido",
                        icon: "error",
                        text: "El enlace de recuperación ha expirado o es inválido. Solicita un nuevo enlace.",
                        draggable: true,
                        confirmButtonText: 'OK'
                    });
                }
            }
        });
    };

    return (
        <AuthSplitLayout
            title="Restablecer contraseña"
            description="Ingresa tu nueva contraseña"
        >
            <Head title="Restablecer contraseña" />

            <form className="flex flex-col gap-6" onSubmit={submit}>
                {/* Token hidden */}
                <input type="hidden" name="token" value={data.token} />

                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={data.email}
                            readOnly
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className={errors.email ? 'ring-1 ring-red-500' : ''}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Nueva contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={data.password}
                            autoFocus
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Nueva contraseña"
                            className={errors.password ? 'ring-1 ring-red-500' : ''}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            required
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="Confirmar contraseña"
                            className={errors.password_confirmation ? 'ring-1 ring-red-500' : ''}
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            'Restablecer contraseña'
                        )}
                    </Button>
                </div>
            </form>
        </AuthSplitLayout>
    );
}
