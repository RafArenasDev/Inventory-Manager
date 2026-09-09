import TermsContent from '@/components/terms-content';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface TermsAndConditionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Vista de solo lectura de los Términos y Condiciones, enlazada desde el pie
 * del login para consulta libre — no exige checks ni bloquea nada. El paso
 * de aceptación obligatoria (con checks y bloqueo de acceso) vive en
 * pages/auth/accept-terms.tsx, después de autenticarse.
 */
export default function TermsAndConditionsModal({ open, onOpenChange }: TermsAndConditionsModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>Términos y Condiciones de Uso</DialogTitle>
                <DialogDescription>Inventory Manager — condiciones de uso del software</DialogDescription>

                <TermsContent />
            </DialogContent>
        </Dialog>
    );
}
