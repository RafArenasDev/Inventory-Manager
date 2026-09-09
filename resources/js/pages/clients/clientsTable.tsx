import { IconActionButton } from '@/components/icon-action-button';
import { StatusToggle } from '@/components/status-toggle';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Swal from '@/lib/swal';
import { router } from '@inertiajs/react';
import { Eye, Lock, Pencil, Phone, ShieldOff, Smartphone, Trash2, Users } from 'lucide-react';

interface Client {
    id: number;
    document_type: string | null;
    document_number: number | string | null;
    verification_digit?: number | null;
    name: string;
    department_id?: number | null;
    department?: string | null;
    city_id?: number | null;
    city?: string | null;
    phone?: string | null;
    cellphone?: string | null;
    address?: string | null;
    email?: string | null;
    is_active: boolean;
    created_at?: string;
    anonymized_at?: string | null;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface ClientsTableProps {
    clients: {
        data: Client[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    perPage: string;
    onPerPageChange: (value: string) => void;
    onEditClient: (client: Client) => void;
    onViewClient: (client: Client) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    userPermissions: string[];
}

export default function ClientsTable({
    clients,
    perPage,
    onPerPageChange,
    onEditClient,
    onViewClient,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions,
}: ClientsTableProps) {
    const handleDelete = (clientId: number, clientName: string) => {
        Swal.fire({
            title: '¿Estás seguro?',
            html: `Esta acción eliminará al cliente <b>${clientName}</b> permanentemente. Queda registrada en el historial de auditoría con tu usuario, fecha y hora.`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'Motivo de la eliminación',
            inputPlaceholder: 'Ej. Cliente duplicado, registro erróneo...',
            inputValidator: (value) => (!value ? 'Debes indicar un motivo.' : undefined),
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar!',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('clients.destroy', clientId), {
                    data: { reason: result.value },
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Eliminado!',
                            text: 'El cliente ha sido eliminado.',
                            icon: 'success',
                            timer: 2200,
                            showConfirmButton: false,
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'No se pudo eliminar el cliente.',
                            icon: 'error',
                        });
                    },
                });
            }
        });
    };

    const handleAnonymize = (clientId: number, clientName: string) => {
        Swal.fire({
            title: '¿Anonimizar cliente?',
            html: `Se eliminarán el nombre, teléfono, celular, correo y dirección de <b>${clientName}</b>. Las ventas ya registradas no se modifican. Esta acción no se puede deshacer y queda registrada en el historial de auditoría.`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'Motivo de la anonimización',
            inputPlaceholder: 'Ej. Solicitud del cliente (derecho de supresión, Ley 1581 de 2012)...',
            inputValidator: (value) => (!value ? 'Debes indicar un motivo.' : undefined),
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, anonimizar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                router.patch(
                    route('clients.anonymize', clientId),
                    { reason: result.value },
                    {
                        onSuccess: () => {
                            Swal.fire({
                                title: 'Anonimizado',
                                text: 'Los datos del cliente fueron anonimizados.',
                                icon: 'success',
                                timer: 2200,
                                showConfirmButton: false,
                            });
                        },
                        onError: () => {
                            Swal.fire({
                                title: 'Error!',
                                text: 'No se pudo anonimizar el cliente.',
                                icon: 'error',
                            });
                        },
                    },
                );
            }
        });
    };

    const showActionsColumn =
        userPermissions.includes('Editar Clientes') || userPermissions.includes('Eliminar Clientes') || userPermissions.includes('Ver Clientes');

    const renderPhones = (client: Client) => {
        const hasPhone = client.phone && client.phone.trim() !== '';
        const hasCellphone = client.cellphone && client.cellphone.trim() !== '';

        if (!hasPhone && !hasCellphone) {
            return <span className="text-gray-500 dark:text-gray-400">-</span>;
        }

        return (
            <div className="space-y-0.5 text-xs">
                {hasPhone && (
                    <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">{client.phone}</span>
                    </div>
                )}
                {hasCellphone && (
                    <div className="flex items-center gap-1.5">
                        <Smartphone className="size-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">{client.cellphone}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    placeholder="Buscar clientes por nombre o documento..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:max-w-lg"
                />
            </div>

            <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Estado</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients.data.map((client) => {
                            const isAnonymized = !!client.anonymized_at;

                            return (
                                <TableRow key={client.id}>
                                    <TableCell>{client.name}</TableCell>
                                    <TableCell>
                                        {isAnonymized || !client.document_type
                                            ? '-'
                                            : `${client.document_type} ${client.document_number}${client.verification_digit ? `-${client.verification_digit}` : ''}`}
                                    </TableCell>
                                    <TableCell>{isAnonymized ? '-' : client.email || '-'}</TableCell>
                                    <TableCell>{isAnonymized ? '-' : renderPhones(client)}</TableCell>
                                    <TableCell>
                                        <StatusToggle
                                            id={client.id}
                                            isActive={client.is_active}
                                            toggleRouteName="clients.toggle-active"
                                            entityLabel="cliente"
                                            entityName={client.name}
                                            disabled={isAnonymized}
                                            disabledReason="Cliente anonimizado: no puede reactivarse."
                                        />
                                    </TableCell>
                                    {showActionsColumn && (
                                        <TableCell className="text-right">
                                            {isAnonymized ? (
                                                <span
                                                    className="inline-flex items-center justify-end gap-1 text-xs text-gray-500 dark:text-gray-400"
                                                    title="Anonimizado: sin acciones disponibles"
                                                >
                                                    <Lock className="size-3.5" />
                                                    Sin acciones
                                                </span>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    {userPermissions.includes('Ver Clientes') && (
                                                        <IconActionButton
                                                            variant="ghost"
                                                            onClick={() => onViewClient(client)}
                                                            className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                                                            label="Ver cliente"
                                                        >
                                                            <Eye className="size-3.5" />
                                                        </IconActionButton>
                                                    )}
                                                    {userPermissions.includes('Editar Clientes') && (
                                                        <IconActionButton
                                                            variant="ghost"
                                                            onClick={() => onEditClient(client)}
                                                            className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                            label="Editar cliente"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </IconActionButton>
                                                    )}
                                                    {userPermissions.includes('Eliminar Clientes') &&
                                                        String(client.document_number) !== '222222222222' && (
                                                            <IconActionButton
                                                                variant="ghost"
                                                                onClick={() => handleAnonymize(client.id, client.name)}
                                                                className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 dark:text-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
                                                                label="Anonimizar datos del cliente"
                                                            >
                                                                <ShieldOff className="size-3.5" />
                                                            </IconActionButton>
                                                        )}
                                                    {userPermissions.includes('Eliminar Clientes') && (
                                                        <IconActionButton
                                                            variant="ghost"
                                                            onClick={() => handleDelete(client.id, client.name)}
                                                            className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                            label="Eliminar cliente"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </IconActionButton>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                        {clients.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 6 : 5} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron clientes</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={clients}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="clients.search"
            />
        </div>
    );
}
