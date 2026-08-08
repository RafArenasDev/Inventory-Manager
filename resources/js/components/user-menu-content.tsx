import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { Link, router } from '@inertiajs/react';
import { KeyRound, LogOut, SunMoon, UserRound } from 'lucide-react';

interface UserMenuContentProps {
    onOpenProfile: () => void;
    onOpenPassword: () => void;
}

export function UserMenuContent({ onOpenProfile, onOpenPassword }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuGroup>
                <DropdownMenuItem onClick={onOpenProfile}>
                    <UserRound />
                    Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenPassword}>
                    <KeyRound />
                    Contraseña
                </DropdownMenuItem>
                {/* preventDefault en onSelect: sin esto Radix cierra el menú
                    apenas se hace click en el switch, antes de que se alcance
                    a ver el cambio de tema aplicado. */}
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="justify-between">
                    <span className="flex items-center gap-2">
                        <SunMoon />
                        Tema
                    </span>
                    <ThemeToggle />
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full" method="post" href={route('logout')} as="button" onClick={handleLogout}>
                    <LogOut />
                    Cerrar sesión
                </Link>
            </DropdownMenuItem>
        </>
    );
}
