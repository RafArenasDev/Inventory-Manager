import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CURRENT_VERSION_ENTRY, VERSION_HISTORY } from '@/version';
import { useMemo, useState } from 'react';

interface WhatsNewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Última versión siempre expandida (qué cambió desde la última vez que el
 * usuario entró); el resto queda colapsado por versión, con un filtro
 * "Desde [versión]" para no forzar a renderizar años de historial de una
 * sola vez. Contenido generado en build time desde CHANGELOG.md — ver
 * scripts/generate-changelog.mjs.
 */
export default function WhatsNewModal({ open, onOpenChange }: WhatsNewModalProps) {
    const [sinceVersion, setSinceVersion] = useState<string>(VERSION_HISTORY[VERSION_HISTORY.length - 1]?.version ?? CURRENT_VERSION_ENTRY.version);

    const visibleHistory = useMemo(() => {
        const cutoffIndex = VERSION_HISTORY.findIndex((entry) => entry.version === sinceVersion);
        return cutoffIndex === -1 ? VERSION_HISTORY : VERSION_HISTORY.slice(0, cutoffIndex + 1);
    }, [sinceVersion]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <DialogTitle>Novedades</DialogTitle>
                        <DialogDescription>Historial de cambios de Inventory Manager</DialogDescription>
                    </div>
                    {VERSION_HISTORY.length > 0 && (
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            Desde
                            <select
                                value={sinceVersion}
                                onChange={(e) => setSinceVersion(e.target.value)}
                                className="rounded border border-gray-300 bg-transparent px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300"
                            >
                                {VERSION_HISTORY.map((entry) => (
                                    <option key={entry.version} value={entry.version}>
                                        {entry.version}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>

                <div className="space-y-4 pt-1">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-emerald-800 dark:text-emerald-300">{CURRENT_VERSION_ENTRY.version}</span>
                            <span className="text-xs text-emerald-700/70 dark:text-emerald-400/70">{CURRENT_VERSION_ENTRY.date}</span>
                        </div>
                        <p className="text-sm text-emerald-900 dark:text-emerald-200">{CURRENT_VERSION_ENTRY.notes}</p>
                    </div>

                    {visibleHistory.map((entry) => (
                        <details key={entry.version} className="group rounded-lg border border-gray-200 dark:border-gray-700">
                            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 select-none dark:text-gray-300">
                                <span>{entry.version}</span>
                                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">{entry.date}</span>
                            </summary>
                            <p className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400">{entry.notes}</p>
                        </details>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
