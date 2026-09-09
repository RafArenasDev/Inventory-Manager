import {
    ClipboardList,
    DollarSign,
    History,
    Key,
    LayoutGrid,
    Package,
    PackageSearch,
    Shield,
    ShoppingCart,
    Tags,
    Truck,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

// Los componentes de ícono no pueden vivir en la base de datos; este mapa
// traduce el nombre guardado en `modules.icon` al componente real. Al
// agregar un módulo con un ícono nuevo, solo hace falta una línea aquí.
export const ICONS: Record<string, LucideIcon> = {
    LayoutGrid,
    Shield,
    Key,
    Users,
    Truck,
    Tags,
    Package,
    PackageSearch,
    ClipboardList,
    ShoppingCart,
    Wallet,
    DollarSign,
    History,
};

export const ICON_KEYS = Object.keys(ICONS);

export const resolveIcon = (icon: string | null): LucideIcon => (icon && ICONS[icon]) || LayoutGrid;
