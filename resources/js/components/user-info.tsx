import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { usePage } from '@inertiajs/react';


type Auth = {
    user: User;
    roles: string[];
    permissions: string[];
}

export function UserInfo({ user }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const { auth } = (usePage().props as unknown as { auth: Auth });

    // Obtener el label del rol asignado al usuario
    const roleNames = auth.roles || [];
    const getRoleLabel = (roleName: string) => {
        const roleLabels: Record<string, string> = {
            'admin': 'Administrador',
            'seller': 'Vendedor'
        };
        return roleLabels[roleName] || roleName;
    };

    const userRoleLabel = roleNames.length > 0 ? getRoleLabel(roleNames[0]) : '';

    // Debug: Log user data
    console.log('Auth roles:', auth.roles);
    console.log('User role label:', userRoleLabel);

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
