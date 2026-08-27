import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, ArrowLeft } from 'lucide-react';
import { FormEventHandler } from 'react';
import Swal from '@/lib/swal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

export default function ForgotPassword() {
    const { data, setData, post, processing, errors } = useForm<Required<{ email: string }>>({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'), {
            onSuccess: () => {
                // No mostrar alerta aquí - el controller redirige al login
                setData('email', '');
            },
            onError: (errors) => {
                // El detalle específico (correo no registrado) ya lo muestra
                // InputError debajo del campo — este aviso es solo el
                // genérico, sin repetir texto, y se cierra solo.
                if (errors.email) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al enviar el enlace',
                        timer: 2200,
                        showConfirmButton: false,
                    });
                }
            },
            preserveScroll: true
        });
    };

    return (
        <AuthSplitLayout
            title="Recuperar contraseña"
            description="Ingresa tu correo electrónico para recibir un enlace de recuperación"
        >
            <Head title="Recuperar contraseña" />

            <div className="space-y-6">
                {/* noValidate: una sola vía de validación (borde rojo +
                    InputError debajo), nunca la burbuja nativa del navegador. */}
                <form onSubmit={submit} noValidate>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={data.email}
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className={errors.email ? 'ring-1 ring-red-500' : ''}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="my-6 flex items-center justify-start">
                        <Button
                            className="w-full"
                            disabled={processing}
                            type="submit"
                        >
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar enlace de recuperación
                        </Button>
                    </div>
                </form>

                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => {
                            window.location.href = route('login');
                        }}
                        className="inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al inicio de sesión
                    </Button>
                </div>
            </div>
        </AuthSplitLayout>
    );
}
