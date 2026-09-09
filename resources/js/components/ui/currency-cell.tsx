import { cn } from '@/lib/utils';

interface CurrencyCellProps {
    value: number;
    // Antepone +/- al valor cuando es positivo/negativo (ej. "Resultado del
    // Día" en Caja). Sin esto, un valor negativo igual muestra su "-" propio.
    showSign?: boolean;
    className?: string;
}

/**
 * Celda de dinero con el "$" siempre fijo al inicio y el valor alineado al
 * final — así unidades/decenas/centenas/miles quedan alineadas entre filas
 * de una misma columna, sin importar cuántos dígitos tenga cada monto.
 */
export function CurrencyCell({ value, showSign = false, className }: CurrencyCellProps) {
    const rounded = Math.round(value);
    const isNegative = rounded < 0;
    const sign = isNegative ? '-' : showSign && rounded > 0 ? '+' : '';
    const formatted = Math.abs(rounded).toLocaleString('es-CO');

    return (
        <div className={cn('flex w-full items-baseline justify-between gap-1 tabular-nums', className)}>
            <span>$</span>
            <span>
                {sign}
                {formatted}
            </span>
        </div>
    );
}
