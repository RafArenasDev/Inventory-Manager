import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import CashRegisterNoticeWatcher from '@/components/cash-register-notice-watcher';
import FlashErrorWatcher from '@/components/flash-error-watcher';
import ForcePasswordChangeModal from '@/components/force-password-change-modal';
import UserDeactivationWatcher from '@/components/user-deactivation-watcher';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
            <ForcePasswordChangeModal />
            <FlashErrorWatcher />
            <CashRegisterNoticeWatcher />
            <UserDeactivationWatcher />
        </AppShell>
    );
}
