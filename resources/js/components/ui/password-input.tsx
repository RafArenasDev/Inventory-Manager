import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Input de contraseña con el ícono de ojo para mostrar/ocultar el valor —
 * mismo patrón en todos los formularios de la app en vez de repetir el
 * toggle en cada uno.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, 'type'>>(
    ({ className, ...props }, ref) => {
        const [visible, setVisible] = React.useState(false);

        return (
            <div className="relative">
                <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-9', className)} {...props} />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setVisible((v) => !v)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        );
    },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
