import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12 lg:grid lg:grid-cols-2 lg:items-stretch lg:justify-normal lg:gap-0 lg:p-0">
            {/* Logo: contained card on mobile/tablet, full-bleed panel on desktop */}
            <div className="relative lg:h-full">
                <Link href={route('home')} className="block w-40 sm:w-56 lg:absolute lg:inset-0 lg:h-full lg:w-full">
                    <img
                        src="/logo-full.png"
                        alt="Inventory Manager"
                        className="w-full rounded-2xl shadow-2xl shadow-black/40 lg:h-full lg:rounded-none lg:object-cover lg:shadow-none"
                    />
                </Link>
            </div>

            {/* Form */}
            <div className="flex w-full max-w-sm flex-col items-center justify-center gap-6 lg:h-full lg:max-w-none lg:p-8">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="font-sans text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground text-sm text-balance">{description}</p>
                </div>
                <div className="w-full sm:w-[350px]">{children}</div>
            </div>
        </div>
    );
}
