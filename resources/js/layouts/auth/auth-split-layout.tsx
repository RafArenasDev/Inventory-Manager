import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative flex min-h-dvh flex-col lg:grid lg:grid-cols-2">
            {/* Image panel: above the form on mobile/tablet, full-bleed left column on desktop */}
            <div className="relative h-48 w-full shrink-0 sm:h-64 lg:h-full">
                <Link href={route('home')} className="absolute inset-0 block">
                    <img src="/logo-full.png" alt="Inventory Manager" className="h-full w-full object-cover" />
                </Link>
            </div>

            {/* Form side */}
            <div className="flex w-full flex-1 items-center justify-center p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight font-sans">{title}</h1>
                        <p className="text-muted-foreground text-sm text-balance">{description}</p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
