import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CURRENT_VERSION_ENTRY, VERSION_HISTORY, type ChangelogEntry } from '@/version';
import { CheckCircle2, Download, Palette, Scale, ScrollText, Shield, Sparkles, Wrench, Zap, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface WhatsNewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ALL_VERSIONS: ChangelogEntry[] = [CURRENT_VERSION_ENTRY, ...VERSION_HISTORY];

// Un ícono y un color fijo por categoría — la insignia circular ("chip")
// lleva el color de la categoría, la tarjeta en sí queda neutra (borde +
// sombra, esquinas redondeadas por todos lados) para que el color acente en
// vez de pintar un borde plano de lado a lado.
const CATEGORY_META: Record<string, { icon: LucideIcon; chip: string; badge: string }> = {
    Funcionalidad: {
        icon: Sparkles,
        chip: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    },
    Seguridad: {
        icon: Shield,
        chip: 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400',
        badge: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
    },
    Auditoría: {
        icon: ScrollText,
        chip: 'bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-400',
        badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
    },
    Validación: {
        icon: CheckCircle2,
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    Legal: {
        icon: Scale,
        chip: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400',
        badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    },
    Rendimiento: {
        icon: Zap,
        chip: 'bg-teal-100 text-teal-600 dark:bg-teal-950/70 dark:text-teal-400',
        badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
    },
    Exportación: {
        icon: Download,
        chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    'UI/UX': {
        icon: Palette,
        chip: 'bg-pink-100 text-pink-600 dark:bg-pink-950/70 dark:text-pink-400',
        badge: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300',
    },
    Corrección: {
        icon: Wrench,
        chip: 'bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-400',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    },
};
const DEFAULT_CATEGORY_META = {
    icon: Sparkles,
    chip: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Muestra el detalle completo de UNA versión a la vez — por defecto la más
 * reciente — elegida en el combobox "Versión". Elegir otra versión
 * REEMPLAZA la vista, no acumula historial debajo. Cada viñeta trae una
 * categoría (ver CHANGELOG.md) que fija el color del borde izquierdo y el
 * ícono de su tarjeta, para poder escanear de un vistazo qué tipo de
 * cambio fue cada cosa. Contenido generado en build time desde
 * CHANGELOG.md — ver scripts/generate-changelog.mjs.
 */
export default function WhatsNewModal({ open, onOpenChange }: WhatsNewModalProps) {
    const [selectedVersion, setSelectedVersion] = useState<string>(CURRENT_VERSION_ENTRY.version);
    const entry = ALL_VERSIONS.find((v) => v.version === selectedVersion) ?? CURRENT_VERSION_ENTRY;
    const isLatest = entry.version === CURRENT_VERSION_ENTRY.version;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[88vh] w-full flex-col overflow-hidden sm:max-w-4xl">
                <div className="flex shrink-0 items-center justify-between gap-4 pr-10">
                    <DialogTitle>Novedades</DialogTitle>
                    <div className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span>Versión</span>
                        <Combobox
                            items={ALL_VERSIONS}
                            itemToStringLabel={(v: ChangelogEntry) => v.version}
                            itemToStringValue={(v: ChangelogEntry) => v.version}
                            value={entry}
                            onValueChange={(v: ChangelogEntry | null) => v && setSelectedVersion(v.version)}
                        >
                            <ComboboxInput className="w-28" inputClassName="text-xs" />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                                <ComboboxList>
                                    {(v: ChangelogEntry) => (
                                        <ComboboxItem key={v.version} value={v}>
                                            {v.version}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                </div>

                <div className="-mx-6 flex-1 overflow-y-auto px-6 pb-2">
                    <div className="mb-4 flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{entry.version}</h3>
                        {isLatest && (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                                Última
                            </span>
                        )}
                        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">{entry.date}</span>
                    </div>

                    <p className="mb-5 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">{entry.notes}</p>

                    {entry.highlights.length > 0 ? (
                        <ul className="space-y-3 pb-4">
                            {entry.highlights.map((item, i) => {
                                const meta = (item.category && CATEGORY_META[item.category]) || DEFAULT_CATEGORY_META;
                                const Icon = meta.icon;
                                return (
                                    <li
                                        key={i}
                                        className="flex items-start gap-3.5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60"
                                    >
                                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.chip}`}>
                                            <Icon className="size-4" />
                                        </span>
                                        <div className="space-y-1.5">
                                            {item.category && (
                                                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                                                    {item.category}
                                                </span>
                                            )}
                                            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{item.text}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="pb-4 text-sm text-gray-500 italic dark:text-gray-400">Sin detalle adicional para esta versión.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
