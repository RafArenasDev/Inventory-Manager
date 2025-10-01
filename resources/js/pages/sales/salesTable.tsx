import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from 'sweetalert2'
import SearchInput from "@/components/ui/search-input"

interface SaleItem {
    id: number;
    product_id: number;
    quantity: number;
    price_at_sale: number;
    subtotal: number;
    item_discount: number;
}

interface Sale {
    id: number;
    client?: { id: number; name: string };
    user: { id: number; name: string };
    sale_date: string;
    total_without_tax: number;
    total_with_tax: number;
    discount: number;
    total_paid: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface SalesTableProps {
    sales: {
        data: Sale[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    perPage: string;
    onPerPageChange: () => void;
    onEditSale: (sale: Sale) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    userPermissions: string[];
}

export default function SalesTable({
    sales,
    perPage,
    onPerPageChange,
    onEditSale,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions,
}: SalesTableProps) {
    const handleDelete = (saleId: number, saleDate: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción eliminará la venta del ${saleDate} permanentemente`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar!",
            cancelButtonText: "Cancelar",
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('sales.destroy', saleId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: "Eliminada!",
                            text: "La venta ha sido eliminada.",
                            icon: "success",
                            timer: 2200,
                            showConfirmButton: false,
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo eliminar la venta.",
                            icon: "error",
                        });
                    },
                });
            }
        });
    };

    const showActionsColumn = userPermissions.includes('Editar Ventas') || userPermissions.includes('Eliminar Ventas');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por Cliente o Fecha..."
                    searchValue={search}
                    onSearch={onSearch}
                />
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Método de Pago</TableHead>
                            <TableHead>Total Pagado</TableHead>
                            <TableHead>Items</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.data.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell>{sale.sale_date}</TableCell>
                                <TableCell>{sale.client?.name || 'Sin cliente'}</TableCell>
                                <TableCell>{sale.payment_method}</TableCell>
                                <TableCell>{sale.total_paid.toFixed(2)}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-2">
                                        {sale.items.map((item) => (
                                            <span
                                                key={item.id}
                                                className="text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-800 font-medium border border-gray-300 shadow-sm dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500"
                                            >
                                                Item {item.product_id}: {item.quantity} x {item.price_at_sale.toFixed(2)} - Desc: {item.item_discount.toFixed(2)}
                                            </span>
                                        ))}
                                    </div>
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Editar Ventas') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => onEditSale(sale)}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                    aria-label="Editar venta"
                                                >
                                                    <Pencil className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Ventas') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => handleDelete(sale.id, sale.sale_date)}
                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                    aria-label="Eliminar venta"
                                                >
                                                    <Trash2 className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={sales}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
            />
        </div>
    );
}
