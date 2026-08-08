import { useEffect, useRef, useState } from 'react';
import { Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Option {
    value: number;
    label: string;
}

const MESES: Option[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
].map((label, i) => ({ value: i + 1, label }));

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const YEARS: Option[] = Array.from({ length: 6 }, (_, i) => ({ value: currentYear - i, label: String(currentYear - i) }));

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function monthRange(year: number, month: number): { date_from: string; date_to: string } {
    return { date_from: `${year}-${pad(month)}-01`, date_to: `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}` };
}

interface PeriodFilterProps {
    onChange: (range: { date_from: string; date_to: string }) => void;
}

/**
 * Filtro de Año + Mes reutilizado en Caja, Finanzas, Ventas y Movimientos de
 * Inventario. Vive como botón con ícono + popover en la misma fila del
 * search para no ocupar una fila propia. Por defecto siempre queda en el mes
 * actual — el backend también defaultea a esto cuando no llega
 * date_from/date_to, así nunca se pintan miles de registros históricos de
 * una sola vez.
 */
export function PeriodFilter({ onChange }: PeriodFilterProps) {
    const [year, setYear] = useState<number>(currentYear);
    const [month, setMonth] = useState<number>(currentMonth);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // El mes actual ya es el default que aplicó el backend en la carga
        // inicial — no hace falta una petición extra apenas se monta.
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        onChange(monthRange(year, month));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month]);

    const isCurrentPeriod = year === currentYear && month === currentMonth;
    const monthLabel = MESES.find((o) => o.value === month)?.label.slice(0, 3) ?? '';

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 gap-2 bg-card hover:bg-card/70">
                    <Filter className="h-4 w-4" />
                    {monthLabel} {year}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Año</Label>
                        <Combobox
                            items={YEARS}
                            itemToStringLabel={(o: Option) => o.label}
                            itemToStringValue={(o: Option) => String(o.value)}
                            value={YEARS.find((o) => o.value === year) ?? null}
                            onValueChange={(o: Option | null) => o && setYear(o.value)}
                        >
                            <ComboboxInput className="w-28" />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                <ComboboxList>{(option: Option) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Mes</Label>
                        <Combobox
                            items={MESES}
                            itemToStringLabel={(o: Option) => o.label}
                            itemToStringValue={(o: Option) => String(o.value)}
                            value={MESES.find((o) => o.value === month) ?? null}
                            onValueChange={(o: Option | null) => o && setMonth(o.value)}
                        >
                            <ComboboxInput className="w-36" />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                <ComboboxList>{(option: Option) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                </div>

                {!isCurrentPeriod && (
                    <button
                        type="button"
                        onClick={() => { setYear(currentYear); setMonth(currentMonth); }}
                        className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                        Volver al mes actual
                    </button>
                )}
            </PopoverContent>
        </Popover>
    );
}
