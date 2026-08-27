import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';
import { useEffect } from 'react';
import Swal from '@/lib/swal';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword = true }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
            onError: (errors) => {
                // El detalle específico (credenciales inválidas, cuenta
                // inactiva, etc.) ya lo muestra InputError debajo de cada
                // campo — este aviso es solo la notificación genérica de
                // "algo falló", sin repetir el texto, y se cierra solo.
                if (errors.email || errors.password) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        timer: 2200,
                        showConfirmButton: false,
                    });
                }
            }
        });
    };

    // Mostrar alerta diferenciada según el tipo de mensaje
    useEffect(() => {
        if (status) {
            if (status.includes('Enlace de recuperación')) {
                // MENSAJE DEL FORGOT-PASSWORD
                Swal.fire({
                    title: "¡Enlace enviado!",
                    icon: "success",
                    text: status,
                    draggable: true,
                    confirmButtonText: 'OK'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // console.log('Enlace enviado - listo para login');
                    }
                });
            } else if (status.includes('Se cerró la caja')) {
                // MENSAJE DE AUTOCIERRE DE CAJA AL CERRAR SESIÓN
                Swal.fire({
                    title: "Caja cerrada automáticamente",
                    icon: "info",
                    text: status,
                    draggable: true,
                    confirmButtonText: 'Entendido'
                });
            } else if (status.includes('inconveniente con tu sesión')) {
                // MENSAJE DE DESACTIVACIÓN DE CUENTA CON SESIÓN YA ABIERTA —
                // deliberadamente genérico y con tono de incidente técnico,
                // no de sanción: el usuario no debe sentir que lo echaron.
                Swal.fire({
                    title: "Lo sentimos",
                    icon: "info",
                    text: status,
                    draggable: true,
                    confirmButtonText: 'Entendido'
                });
            } else if (status.includes('Contraseña restablecida')) {
                // MENSAJE DEL RESET-PASSWORD
                Swal.fire({
                    title: "¡Contraseña restablecida!",
                    icon: "success",
                    text: status,
                    draggable: true,
                    confirmButtonText: 'Continuar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // console.log('Contraseña restablecida - listo para login');
                        // Enfocar el campo de email
                        const emailInput = document.getElementById('email') as HTMLInputElement;
                        if (emailInput) {
                            emailInput.focus();
                        }
                    }
                });
            } else {
                // Mensaje genérico
                Swal.fire({
                    title: "¡Link enviado exitosamente!",
                    icon: "success",
                    text: status,
                    draggable: true,
                    confirmButtonText: 'OK'
                });
            }
        }
    }, [status]);

    return (
        <AuthSplitLayout
            title="Inicia sesión en tu cuenta"
            description="Ingresa tu correo electrónico y contraseña para iniciar sesión"
        >
            <Head title="Iniciar sesión" />

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus={!status} // Solo autofocus si no hay status
                            tabIndex={status ? 2 : 1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className={errors.email ? 'ring-1 ring-red-500' : ''}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={status ? 3 : 2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Contraseña"
                            className={errors.password ? 'ring-1 ring-red-500' : ''}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="remember"
                                name="remember"
                                checked={data.remember}
                                onClick={() => setData('remember', !data.remember)}
                                tabIndex={status ? 4 : 3}
                            />
                            <Label htmlFor="remember" className="text-sm">
                                Recordar sesión
                            </Label>
                        </div>
                        {canResetPassword && (
                            <TextLink
                                href={route('password.request')}
                                className="text-sm text-primary hover:text-primary/80"
                                tabIndex={status ? 5 : 5}
                            >
                                ¿Olvidaste tu contraseña?
                            </TextLink>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        tabIndex={status ? 6 : 4}
                        disabled={processing}
                    >
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Iniciar sesión
                    </Button>
                </div>
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
                © 2025–2026 RafArenasDev
            </p>
        </AuthSplitLayout>
    );
}
