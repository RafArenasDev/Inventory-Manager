import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PasswordModal } from '@/components/password-modal';
import { ProfileModal } from '@/components/profile-modal';
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
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
                    >
                        <UserInfo user={auth.user} />
                        <ChevronDown className="size-4 text-muted-foreground" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-lg" align="end" side="bottom">
                    <UserMenuContent onOpenProfile={() => setProfileOpen(true)} onOpenPassword={() => setPasswordOpen(true)} />
                </DropdownMenuContent>
            </DropdownMenu>

            <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
            <PasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
        </>
    );
}
