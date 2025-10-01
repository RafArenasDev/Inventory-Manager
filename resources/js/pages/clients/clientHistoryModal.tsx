import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    name: string;
}

interface ClientHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    sales: Sale[];
    filters: {
        start_date?: string;
        end_date?: string;
        group_by?: 'month' | 'year' | null;
    };
}

export default function ClientHistoryModal({ isOpen, onClose, client, sales, filters }: ClientHistoryModalProps) {
    const formatCOP = (value: number | null | undefined): string => {
        if (value === null || value === undefined || isNaN(value)) {
            return '-';
        }
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (date: string | undefined): string => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatMonthYear = (year: number | undefined, month: number | undefined): string => {
        if (!year || !month) return '-';
        return new Date(year, month - 1).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
        });
    };

    if (!client) return null;

    const isGrouped = filters.group_by === 'month' || filters.group_by === 'year';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[800px] max-w-[95vw] max-h-[80vh] bg-white dark:bg-[oklch(0.100205_0_0)] rounded-2xl p-0 shadow-2xl overflow-y-auto [&>button]:absolute [&>button]:top-4 [&>button]:right-4 [&>button]:z-10 [&>button]:p-3 [&>button]:rounded-full [&>button]:bg-white/90 [&>button]:dark:bg-gray-800/90 [&>button]:hover:bg-white [&>button]:dark:hover:bg-gray-700 [&>button]:transition-colors [&>button]:shadow-md [&>button]:border-0"
            >
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Historial de Compras de: {client.name}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            Detalle de las compras realizadas por el cliente
                            {filters.start_date && ` desde ${formatDate(filters.start_date)}`}
                            {filters.end_date && ` hasta ${formatDate(filters.end_date)}`}
                            {filters.group_by && ` agrupado por ${filters.group_by === 'month' ? 'mes' : 'año'}`}.
                        </DialogDescription>
                    </div>

                    {sales.length === 0 ? (
                        <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                            No tiene compras registradas en el historial
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader className="bg-gray-400 dark:bg-gray-700">
                                    <TableRow>
                                        {isGrouped ? (
                                            <>
                                                <TableHead>
                                                    {filters.group_by === 'month' ? 'Mes' : 'Año'}
                                                </TableHead>
                                                <TableHead>
                                                    Cantidad de Compras
                                                </TableHead>
                                            </>
                                        ) : (
                                            <>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>Cantidad</TableHead>
                                                <TableHead>Precio Unitario</TableHead>
                                                <TableHead>Total</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isGrouped
                                        ? sales.map((sale, index) => (
                                              <TableRow key={index}>
                                                  <TableCell>
                                                      {formatMonthYear(sale.year, sale.month)}
                                                  </TableCell>
                                                  <TableCell>
                                                      {sale.count}
                                                  </TableCell>
                                              </TableRow>
                                          ))
                                        : sales.flatMap((sale) =>
                                              sale.items.map((item, index) => (
                                                  <TableRow key={`${sale.id}-${item.id}`}>
                                                      {index === 0 && (
                                                          <TableCell
                                                              rowSpan={sale.items.length}
                                                          >
                                                              {formatDate(sale.sale_date)}
                                                          </TableCell>
                                                      )}
                                                      <TableCell>
                                                          {item.product_name || 'Producto no especificado'}
                                                      </TableCell>
                                                      <TableCell>
                                                          {item.quantity}
                                                      </TableCell>
                                                      <TableCell>
                                                          {formatCOP(item.unit_price)}
                                                      </TableCell>
                                                      <TableCell>
                                                          {formatCOP(item.total_price)}
                                                      </TableCell>
                                                  </TableRow>
                                              ))
                                          )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
