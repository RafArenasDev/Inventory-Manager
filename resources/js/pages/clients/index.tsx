import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import ClientsTable from './clientsTable';
import ClientHistoryModal from './clientHistoryModal';
import ClientForm from './clientForm';
import axios from 'axios';
import Swal from 'sweetalert2';

interface SaleItem {
    id: number;
    product_id: number;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Sale {
    id: number;
    sale_date: string;
    items: SaleItem[];
    total?: number;
    year?: number;
    month?: number;
    count?: number;
}

interface Client {
    id: number;
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
    showCreateForm?: boolean;
    editingClient?: ClientForForm;
    departments?: Department[];
    cities?: City[];
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Clientes',
        href: '/clients',
    },
];

export default function ClientIndex({
    clients,
    filters,
    totalCount,
    filteredCount,
    showCreateForm,
    editingClient,
    departments = [],
    cities = [],
}: ClientIndexProps) {
    const [isCreating, setIsCreating] = useState(showCreateForm || false);
    const [editingClientState, setEditingClient] = useState<ClientForForm | null>(editingClient || null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [salesData, setSalesData] = useState<Sale[]>([]);
    const [historyFilters, setHistoryFilters] = useState<{ start_date?: string; end_date?: string; group_by?: 'month' | 'year' | null }>({});

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Cliente',
                    href: '/clients/create',
                },
            ]);
            window.history.replaceState({}, '', route('clients.create'));
        } else if (editingClientState) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Cliente: ${editingClientState.name}`,
                    href: `/clients/${editingClientState.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('clients.edit', editingClientState.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('clients.index'));
        }
    }, [isCreating, editingClientState]);

    const handleCreateClient = () => {
        const newClient: ClientForForm = {
            document_type: 'NIT',
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
        };
        setEditingClient(newClient);
        setIsCreating(true);
    };

    const handleEditClient = (client: Client) => {
        const clientForForm: ClientForForm = {
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
        };
        setEditingClient(clientForForm);
        setIsCreating(false);
    };

    const handleViewHistory = async (client: Client) => {
        try {
            const response = await axios.get(route('clients.history', client.id));
            setSalesData(response.data.sales || []);
            setHistoryFilters(response.data.filters || {});
            setSelectedClient(client);
            setIsHistoryOpen(true);
        } catch (error: unknown) {
            console.error('Error fetching client history:', error);
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Error al cargar el historial',
                text: error instanceof Error ? error.message : 'No se pudo cargar el historial de compras.',
                showConfirmButton: false,
                timer: 2200,
            });
            setSalesData([]);
            setHistoryFilters({});
            setSelectedClient(client);
            setIsHistoryOpen(true);
        }
    };

    const handleCancelForm = () => {
        setEditingClient(null);
        setIsCreating(false);
    };

    const handlePerPageChange = (value: string) => {
        router.get(
            route('clients.index'),
            {
                ...filters,
                per_page: value,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const handleSearch = (search: string) => {
        router.get(
            route('clients.index'),
            {
                ...filters,
                search,
                page: 1,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const defaultClients = { data: [], links: [], from: 0, to: 0, total: 0 };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || editingClientState ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Nuevo Cliente' : `Editar Cliente: ${editingClientState?.name}`}
                            </h2>
                            <Button onClick={handleCancelForm} className="gap-1">
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <ClientForm
                            client={editingClientState ?? undefined}
                            onCancel={handleCancelForm}
                            userPermissions={userPermissions}
                            departments={departments}
                            cities={cities}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
                            {userPermissions.includes('Crear Clientes') && (
                                <Button onClick={handleCreateClient} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Nuevo Cliente
                                </Button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <ClientsTable
                                clients={clients || defaultClients}
                                perPage={filters.per_page || '10'}
                                onPerPageChange={handlePerPageChange}
                                onEditClient={handleEditClient}
                                onViewHistory={handleViewHistory}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ''}
                                onSearch={handleSearch}
                                userPermissions={userPermissions}
                            />
                        </div>
                    </>
                )}
                <ClientHistoryModal
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    client={selectedClient}
                    sales={salesData}
                    filters={historyFilters}
                />
            </div>
        </AppLayout>
    );
}
