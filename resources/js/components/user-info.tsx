import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { usePage } from '@inertiajs/react';

type Auth = {
    user: User;
    // Objeto { nombre_técnico: label }, compartido por HandleInertiaRequests —
    // ya trae el label real de cada rol, sin mapa propio que mantener.
    roles: Record<string, string>;
    permissions: string[];
};

export function UserInfo({ user }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const { auth } = usePage().props as unknown as { auth: Auth };

    const roleLabels = auth.roles || {};
    const firstRoleName = Object.keys(roleLabels)[0];
    const userRoleLabel = firstRoleName ? roleLabels[firstRoleName] : '';

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{userRoleLabel}</span>
                {/* {showEmail && <span className="text-muted-foreground truncate text-xs">{user.email}</span>} */}
            </div>
        </>
    );
}
