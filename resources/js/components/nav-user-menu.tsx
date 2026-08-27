import { PasswordModal } from '@/components/password-modal';
import { ProfileModal } from '@/components/profile-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function NavUserMenu() {
    const { auth } = usePage<SharedData>().props;

    // Los modales viven aquí, un nivel por encima del DropdownMenu: Radix
    // desmonta DropdownMenuContent (y todo lo que hay dentro) al cerrarse,
    // así que si el estado "open" viviera dentro de UserMenuContent, el
    // modal se cerraría de inmediato junto con el menú que lo abrió.
    const [profileOpen, setProfileOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
                    >
                        <UserInfo user={auth.user} />
                        <ChevronDown className="text-muted-foreground size-4" />
                    </button>
                </DropdownMenuTrigger>
                {/* bg-header (no el bg-popover por defecto): este menú
                    cuelga directo del header, tiene que leerse como parte
                    de esa misma superficie, no como una card flotante de
                    otro tono. */}
                <DropdownMenuContent className="bg-header w-56 rounded-lg" align="end" side="bottom">
                    <UserMenuContent onOpenProfile={() => setProfileOpen(true)} onOpenPassword={() => setPasswordOpen(true)} />
                </DropdownMenuContent>
            </DropdownMenu>

            <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
            <PasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
        </>
    );
}
