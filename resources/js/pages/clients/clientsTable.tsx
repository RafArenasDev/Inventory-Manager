import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Phone, Smartphone, History, Users } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import Swal from 'sweetalert2';

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
    onViewHistory: (client: Client) => void;
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
    onViewHistory,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions,
}: ClientsTableProps) {
    const handleDelete = (clientId: number, clientName: string) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Esta acción eliminará al cliente ${clientName} permanentemente`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar!',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('clients.destroy', clientId), {
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

    const showActionsColumn = userPermissions.includes('Editar Clientes') || userPermissions.includes('Eliminar Clientes') || userPermissions.includes('Ver Clientes');

    const renderPhones = (client: Client) => {
        const hasPhone = client.phone && client.phone.trim() !== '';
        const hasCellphone = client.cellphone && client.cellphone.trim() !== '';

        if (!hasPhone && !hasCellphone) {
            return <span className="text-gray-500 dark:text-gray-400">-</span>;
        }

        return (
            <div className="space-y-1">
                {hasPhone && (
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">{client.phone}</span>
                    </div>
                )}
                {hasCellphone && (
                    <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">{client.cellphone}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar clientes por Nombre o Documento..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:w-96"
                />
            </div>

            <div className="rounded-md border dark:border-gray-700 overflow-hidden">
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
                        {clients.data.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell>{client.name}</TableCell>
                                <TableCell>
                                    {client.document_type} {client.document_number} {client.verification_digit ? `-${client.verification_digit}` : ''}
                                </TableCell>
                                <TableCell>{client.email || '-'}</TableCell>
                                <TableCell>{renderPhones(client)}</TableCell>
                                <TableCell>
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold w-fit min-w-[100px] text-center shadow-sm ${
                                        client.is_active
                                            ? 'bg-green-600 text-white dark:bg-green-700'
                                            : 'bg-red-600 text-white dark:bg-red-700'
                                    }`}>
                                        {client.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Ver Clientes') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => onViewHistory(client)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    aria-label="Ver historial"
                                                >
                                                    <History className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Editar Clientes') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => onEditClient(client)}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                    aria-label="Editar cliente"
                                                >
                                                    <Pencil className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Clientes') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => handleDelete(client.id, client.name)}
                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                    aria-label="Eliminar cliente"
                                                >
                                                    <Trash2 className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
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
            />
        </div>
    );
}
