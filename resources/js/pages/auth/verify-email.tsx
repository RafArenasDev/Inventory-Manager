import Swal from '@/lib/swal';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'), {
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: '¡Enlace reenviado!',
                    text: 'Un nuevo enlace de verificación ha sido enviado a tu correo electrónico.',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end',
                });
            },
            onError: () => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reenviar el enlace. Inténtalo de nuevo.',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end',
                });
            },
        });
    };

    // Mostrar alerta de éxito
    useEffect(() => {
        if (status === 'verification-link-sent') {
            Swal.fire({
                icon: 'success',
                title: '¡Enlace enviado!',
                text: 'Un nuevo enlace de verificación ha sido enviado a tu correo electrónico.',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                toast: true,
                position: 'top-end',
            });
        }
    }, [status]);

    return (
        <AuthLayout
            title="Verificar correo electrónico"
            description="Por favor verifica tu dirección de correo electrónico haciendo clic en el enlace que te enviamos."
        >
            <Head title="Verificar correo electrónico" />

            <form onSubmit={submit} className="space-y-6 text-center">
                <Button disabled={processing} variant="secondary">
                    {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Reenviar enlace de verificación
                </Button>

                <TextLink href={route('logout')} method="post" className="mx-auto block text-sm">
                    Cerrar sesión
                </TextLink>
            </form>
        </AuthLayout>
    );
}
