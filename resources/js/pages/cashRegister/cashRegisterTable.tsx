import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Lock } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from 'sweetalert2'
import SearchInput from "@/components/ui/search-input"

interface CashRegister {
    id: number
    register_date: string
    opening_balance: number
    total_sales: number
    total_income: number
    total_expenses: number
    expected_balance: number
    actual_balance: number | null
    difference: number | null
    opened_by: number
    closed_by: number | null
    opened_at: string
    closed_at: string | null
    is_closed: boolean
    opening_notes: string | null
    closing_notes: string | null
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface CashRegisterTableProps {
    cashRegisters: {
        data: CashRegister[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    perPage: string
    onPerPageChange: () => void
    onCloseCashRegister: (cashRegister: CashRegister) => void
    totalCount: number
    filteredCount: number
    search: string
    onSearch: (search: string) => void
    userPermissions: string[]
}

export default function CashRegisterTable({
    cashRegisters,
    perPage,
    onPerPageChange,
    onCloseCashRegister,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions
}: CashRegisterTableProps) {

    const handleDelete = (cashRegisterId: number, registerDate: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción eliminará la caja del ${registerDate} permanentemente`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar!",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('cash-register.destroy', cashRegisterId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: "Eliminado!",
                            text: "La caja ha sido eliminada.",
                            icon: "success",
                            timer: 2200,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo eliminar la caja.",
                            icon: "error"
                        });
                    }
                });
            }
        });
    };

    // Check if the user has any permissions to show the "Acciones" column
    const showActionsColumn = userPermissions.includes('Cerrar Cajas') || userPermissions.includes('Eliminar Cajas');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por Fecha..."
                    searchValue={search}
                    onSearch={onSearch}
                />
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Saldo Inicial</TableHead>
                            <TableHead>Ventas</TableHead>
                            <TableHead>Ingresos</TableHead>
                            <TableHead>Egresos</TableHead>
                            <TableHead>Saldo Esperado</TableHead>
                            <TableHead>Estado</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cashRegisters.data.map((cashRegister) => (
                            <TableRow key={cashRegister.id}>
                                <TableCell>{cashRegister.register_date}</TableCell>
                                <TableCell>${cashRegister.opening_balance.toLocaleString()}</TableCell>
                                <TableCell>${cashRegister.total_sales.toLocaleString()}</TableCell>
                                <TableCell>${cashRegister.total_income.toLocaleString()}</TableCell>
                                <TableCell>${cashRegister.total_expenses.toLocaleString()}</TableCell>
                                <TableCell>${cashRegister.expected_balance.toLocaleString()}</TableCell>
                                <TableCell>
                                    {cashRegister.is_closed ? 'Cerrada' : 'Abierta'}
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {!cashRegister.is_closed && userPermissions.includes('Cerrar Cajas') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => onCloseCashRegister(cashRegister)}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                    aria-label="Cerrar caja"
                                                >
                                                    <Lock className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Cajas') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => handleDelete(cashRegister.id, cashRegister.register_date)}
                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                    aria-label="Eliminar caja"
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
                data={cashRegisters}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
            />
        </div>
    )
}
