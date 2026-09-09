import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface TermsAndConditionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Términos de uso del software (no del negocio) — protegen al desarrollador
 * frente al dueño del establecimiento: propiedad intelectual, límite de
 * responsabilidad y uso correcto de la plataforma.
 */
export default function TermsAndConditionsModal({ open, onOpenChange }: TermsAndConditionsModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>Términos y Condiciones de Uso</DialogTitle>
                <DialogDescription>Inventory Manager — condiciones de uso del software</DialogDescription>

                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <section>
                        <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Propiedad intelectual</h3>
                        <p>
                            El código fuente, diseño y arquitectura de este software son propiedad exclusiva del desarrollador. El establecimiento
                            recibe una licencia de uso no exclusiva e intransferible para operar el software en el curso ordinario de su negocio, sin
                            derechos de reventa, sublicenciamiento ni modificación del código fuente.
                        </p>
                    </section>

                    <section>
                        <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Límite de responsabilidad</h3>
                        <p>
                            El desarrollador responde por el correcto funcionamiento técnico del software. No es responsable por descuadres de caja,
                            pérdidas de inventario por robo o fraude interno, decisiones comerciales o tributarias del establecimiento, ni por
                            sanciones o multas de la DIAN derivadas de que el negocio no declare o facture conforme a la normativa vigente. Este
                            software es una herramienta de apoyo a la gestión, no un sistema de cumplimiento tributario certificado.
                        </p>
                    </section>

                    <section>
                        <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Uso correcto de la plataforma</h3>
                        <p>
                            El usuario se compromete a no intentar vulnerar, alterar sin autorización, ni realizar ingeniería inversa sobre el
                            software, y a usarlo únicamente para los fines propios de la operación del establecimiento.
                        </p>
                    </section>

                    <section>
                        <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Documento de venta</h3>
                        <p>
                            El recibo de venta generado por el sistema es un comprobante interno de venta y no constituye factura electrónica con
                            validación previa de la DIAN.
                        </p>
                    </section>

                    <p className="text-xs text-gray-500 dark:text-gray-400">Última actualización: septiembre de 2026.</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
