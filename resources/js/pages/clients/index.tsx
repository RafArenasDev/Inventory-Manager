import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import ClientDetailModal from './clientDetailModal';
import ClientForm from './clientForm';
import ClientsTable from './clientsTable';

interface Client {
    id: number;
    document_type: string;
    document_number: number | string;
    verification_digit?: number;
    name: string;
    department_id?: number;
    department?: string | null;
    city_id?: number;
    city?: string | null;
    phone?: string;
    cellphone?: string;
    address?: string;
    email?: string;
    is_active: boolean;
    created_at?: string;
}

interface ClientForForm {
    id?: number;
    document_type: string;
    document_number: number | string;
    verification_digit?: number;
    name: string;
    department_id?: number;
    city_id?: number;
    phone?: string;
    cellphone?: string;
    address?: string;
    email?: string;
    is_active: boolean;
}

interface Department {
    id: number;
    name: string;
}

interface City {
    id: number;
    name: string;
}

interface ClientIndexProps {
    clients: {
        data: Client[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    } | null;
    filters: {
        search?: string;
        per_page?: string;
    };
    totalCount: number;
    filteredCount: number;
    departments?: Department[];
    cities?: City[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Clientes',
        href: '/clients',
    },
];

export default function ClientIndex({ clients, filters, totalCount, filteredCount, departments = [], cities = [] }: ClientIndexProps) {
    useLiveRefresh(['clients'], () => router.reload());

    const [isCreating, setIsCreating] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [viewingClient, setViewingClient] = useState<Client | null>(null);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingClient;

    const handleCreateClient = () => {
        setEditingClient({
            document_type: '',
            document_number: '',
            verification_digit: undefined,
            name: '',
            department_id: undefined,
            city_id: undefined,
            phone: '',
            cellphone: '',
            address: '',
            email: '',
            is_active: true,
        });
        setIsCreating(true);
    };

    const handleEditClient = (client: Client) => {
        setEditingClient({
            id: client.id,
            document_type: client.document_type,
            document_number: client.document_number,
            verification_digit: client.verification_digit,
            name: client.name,
            department_id: client.department_id,
            city_id: client.city_id,
            phone: client.phone,
            cellphone: client.cellphone,
            address: client.address,
            email: client.email,
            is_active: client.is_active,
        });
        setIsCreating(false);
    };

    const handleViewClient = (client: Client) => {
        setViewingClient(client);
    };

    const closeForm = () => {
        setEditingClient(null);
        setIsCreating(false);
        setIsFormDirty(false);
    };

    const attemptCloseForm = () => {
        if (!isFormDirty) {
            closeForm();
            return;
        }

        setShowDiscardConfirm(true);
    };

    // El cambio de per_page ya lo maneja Pagination internamente (POST a
    // clients.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handleSearch = (search: string) => {
        router.post(
            route('clients.search'),
            {
                ...filters,
                search,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const defaultClients = { data: [], links: [], from: 0, to: 0, total: 0 };
    const hasMultiplePages = totalCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={Users} title="Clientes" description="Administra la información de tus clientes.">
                    {userPermissions.includes('Crear Clientes') && (
                        <Button onClick={handleCreateClient} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Cliente
                        </Button>
                    )}
                </PageHeader>
                <div
                    className={`bg-card relative overflow-hidden rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60 ${hasMultiplePages ? 'flex-1' : ''}`}
                >
                    <div className="h-full px-6 py-4">
                        <ClientsTable
                            clients={clients || defaultClients}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={handlePerPageChange}
                            onEditClient={handleEditClient}
                            onViewClient={handleViewClient}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ''}
                            onSearch={handleSearch}
                            userPermissions={userPermissions}
                        />
                    </div>
                </div>
                <ClientDetailModal isOpen={!!viewingClient} onClose={() => setViewingClient(null)} client={viewingClient} />
            </div>

            <Dialog
                open={isModalOpen}
                onOpenChange={(open) => {
                    if (!open) attemptCloseForm();
                }}
            >
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{isCreating ? 'Nuevo Cliente' : `Editar Cliente: ${editingClient?.name}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating ? 'Completa los datos para registrar un nuevo cliente.' : 'Actualiza los datos del cliente.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingClient && (
                        <ClientForm
                            client={editingClient}
                            onCancel={attemptCloseForm}
                            onSaved={closeForm}
                            onDirtyChange={setIsFormDirty}
                            userPermissions={userPermissions}
                            departments={departments}
                            cities={cities}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                title="¿Descartar cambios?"
                description="Tienes cambios sin guardar que se perderán."
                confirmText="Sí, descartar"
                cancelText="Seguir editando"
                onConfirm={closeForm}
            />
        </AppLayout>
    );
}
