import AppLogoIcon from '@/components/app-logo-icon';
// import { type SharedData } from '@/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSplitLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    // const { name } = usePage<SharedData>().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Left side - Background */}
            <div className="bg-muted relative hidden h-full flex-col items-center justify-center p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-950" />
                <div className="relative z-20 flex flex-col items-center gap-6">
                    <AppLogoIcon className="w-auto h-180 fill-current text-white" /> 
                    <Link
                        href={route('home')}
                        className="text-2xl font-bold tracking-tight text-center font-sans"
                    >
                        POS Inventory System
                    </Link>
                </div>
            </div>

            {/* Right side - Form */}
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link href={route('home')} className="relative z-20 flex items-center justify-center lg:hidden">
                        <AppLogoIcon className="h-45 w-auto fill-current text-black" />
                    </Link>
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
