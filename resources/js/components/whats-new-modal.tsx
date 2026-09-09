import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CURRENT_VERSION_ENTRY, VERSION_HISTORY } from '@/version';
import { useMemo, useState } from 'react';

interface SinceOption {
    value: string;
    label: string;
}

const SINCE_OPTIONS: SinceOption[] = [
    { value: '', label: 'Solo lo último' },
    ...VERSION_HISTORY.map((entry) => ({ value: entry.version, label: entry.version })),
];

interface WhatsNewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function VersionCard({ version, date, notes, highlights, featured = false }: (typeof VERSION_HISTORY)[number] & { featured?: boolean }) {
    return (
        <div
            className={
                featured
                    ? 'rounded-lg border-l-4 border-emerald-600 bg-emerald-50 p-4 dark:border-emerald-500 dark:bg-emerald-950/40'
                    : 'rounded-lg border border-gray-200 p-4 dark:border-gray-700'
            }
        >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span
                    className={featured ? 'font-semibold text-emerald-900 dark:text-emerald-200' : 'font-semibold text-gray-800 dark:text-gray-200'}
                >
                    {version}
                </span>
                <span
                    className={
                        featured ? 'text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80' : 'text-xs text-gray-500 dark:text-gray-400'
                    }
                >
                    {date}
                </span>
            </div>
            <p className={featured ? 'mb-2 text-sm text-emerald-950 dark:text-emerald-100' : 'mb-2 text-sm text-gray-700 dark:text-gray-300'}>
                {notes}
            </p>
            {highlights.length > 0 && (
                <ul
                    className={
                        featured
                            ? 'list-disc space-y-1 pl-4 text-sm text-emerald-900 dark:text-emerald-200'
                            : 'list-disc space-y-1 pl-4 text-sm text-gray-600 dark:text-gray-400'
                    }
                >
                    {highlights.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Última versión siempre visible y destacada; el resto del historial queda
 * completamente oculto hasta que el usuario elige un valor en "Desde" —
 * evita renderizar años de historial de una sola vez y mantiene el modal
 * corto por defecto. Solo el cuerpo de versiones tiene scroll propio: el
 * título, la descripción y el selector quedan siempre fijos arriba.
 * Contenido generado en build time desde CHANGELOG.md — ver
 * scripts/generate-changelog.mjs.
 */
export default function WhatsNewModal({ open, onOpenChange }: WhatsNewModalProps) {
    const [sinceVersion, setSinceVersion] = useState<string>('');

    const visibleHistory = useMemo(() => {
        if (!sinceVersion) return [];
        const cutoffIndex = VERSION_HISTORY.findIndex((entry) => entry.version === sinceVersion);
        return cutoffIndex === -1 ? VERSION_HISTORY : VERSION_HISTORY.slice(0, cutoffIndex + 1);
    }, [sinceVersion]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-xl">
                <div className="flex shrink-0 items-start justify-between gap-3 pr-10">
                    <div>
                        <DialogTitle>Novedades</DialogTitle>
                        <DialogDescription>Historial de cambios de Inventory Manager</DialogDescription>
                    </div>
                    {VERSION_HISTORY.length > 0 && (
                        <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>Desde</span>
                            <Combobox
                                items={SINCE_OPTIONS}
                                itemToStringLabel={(o: SinceOption) => o.label}
                                itemToStringValue={(o: SinceOption) => o.value}
                                value={SINCE_OPTIONS.find((o) => o.value === sinceVersion) ?? SINCE_OPTIONS[0]}
                                onValueChange={(o: SinceOption | null) => setSinceVersion(o?.value ?? '')}
                            >
                                <ComboboxInput className="w-36" inputClassName="text-xs" />
                                <ComboboxContent className="bg-card">
                                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(option: SinceOption) => (
                                            <ComboboxItem key={option.value} value={option}>
                                                {option.label}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </div>
                    )}
                </div>

                <div className="-mx-1 space-y-3 overflow-y-auto px-1 py-1">
                    <VersionCard {...CURRENT_VERSION_ENTRY} featured />
                    {visibleHistory.map((entry) => (
                        <VersionCard key={entry.version} {...entry} />
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
