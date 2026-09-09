import TermsContent from '@/components/terms-content';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Swal from '@/lib/swal';
import { Head, router } from '@inertiajs/react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Paso obligatorio entre login y dashboard (ver middleware
 * EnsureTermsAccepted): sin las tres casillas marcadas y sin haber
 * scrolleado hasta el final del texto, "Aceptar y continuar" queda
 * deshabilitado. Rechazar cierra la sesión y vuelve al login.
 */
export default function AcceptTerms() {
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedDataPolicy, setAcceptedDataPolicy] = useState(false);
    const [acceptedMonitoring, setAcceptedMonitoring] = useState(false);
    const [processing, setProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        // 8px de margen: en pantallas con zoom/escala el redondeo de
        // scrollHeight puede dejar 1-2px de diferencia aunque el usuario ya
        // haya llegado visualmente al final.
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
            setScrolledToEnd(true);
        }
    };

    const canAccept = scrolledToEnd && acceptedTerms && acceptedDataPolicy && acceptedMonitoring;

    const handleAccept = () => {
        setProcessing(true);
        router.post(
            route('terms.accept'),
            {
                accepted_terms: acceptedTerms,
                accepted_data_policy: acceptedDataPolicy,
                accepted_monitoring: acceptedMonitoring,
            },
            {
                onError: () => {
                    setProcessing(false);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar tu aceptación. Intenta de nuevo.' });
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleDecline = () => {
        Swal.fire({
            title: '¿Rechazar los Términos y Condiciones?',
            text: 'Se cerrará tu sesión. Para usar Inventory Manager es necesario aceptarlos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, rechazar y salir',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('terms.decline'));
            }
        });
    };

    return (
        <div className="bg-muted/40 flex min-h-dvh items-center justify-center px-4 py-10">
            <Head title="Términos y Condiciones" />

            <div className="bg-card w-full max-w-2xl rounded-xl border shadow-xl">
                <div className="flex items-center gap-3 border-b px-6 py-5">
                    <ShieldCheck className="text-primary size-6 shrink-0" />
                    <div>
                        <h1 className="text-lg font-semibold">Términos y Condiciones de Uso</h1>
                        <p className="text-muted-foreground text-sm">Debes leer y aceptar esto para continuar en Inventory Manager.</p>
                    </div>
                </div>

                <div ref={scrollRef} onScroll={handleScroll} className="max-h-[45vh] overflow-y-auto border-b px-6 py-5">
                    <TermsContent />
                    {!scrolledToEnd && (
                        <p className="text-muted-foreground mt-4 text-center text-xs italic">Sigue bajando para llegar al final del documento…</p>
                    )}
                </div>

                <div className="space-y-3 px-6 py-5">
                    <label className="flex items-start gap-3">
                        <Checkbox checked={acceptedTerms} onClick={() => setAcceptedTerms((v) => !v)} disabled={!scrolledToEnd} className="mt-0.5" />
                        <span className="text-sm">
                            He leído y acepto los <strong>Términos y Condiciones</strong> y el Acuerdo de Licencia de Uso del Software (EULA).
                        </span>
                    </label>
                    <label className="flex items-start gap-3">
                        <Checkbox
                            checked={acceptedDataPolicy}
                            onClick={() => setAcceptedDataPolicy((v) => !v)}
                            disabled={!scrolledToEnd}
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            Acepto el tratamiento de mis datos personales y los de los clientes que registre, conforme a la{' '}
                            <strong>Ley 1581 de 2012 de Colombia</strong> (Habeas Data).
                        </span>
                    </label>
                    <label className="flex items-start gap-3">
                        <Checkbox
                            checked={acceptedMonitoring}
                            onClick={() => setAcceptedMonitoring((v) => !v)}
                            disabled={!scrolledToEnd}
                            className="mt-0.5"
                        />
                        <span className="text-sm">
                            Entiendo que mi actividad en el sistema (inicios de sesión, ventas, movimientos y demás acciones) queda registrada y puede
                            ser <strong>auditada internamente</strong> por la administración del negocio.
                        </span>
                    </label>

                    <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" onClick={handleDecline} disabled={processing}>
                            Rechazar y salir
                        </Button>
                        <Button type="button" onClick={handleAccept} disabled={!canAccept || processing}>
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Aceptar y continuar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
