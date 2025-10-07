// import { Head } from '@inertiajs/react';
// import AppLayout from '@/layouts/app-layout';
// import { type BreadcrumbItem } from '@/types';
// import { format } from 'date-fns';
// import { es } from 'date-fns/locale';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { Button } from '@/components/ui/button';
// import { Plus } from 'lucide-react';

// interface User {
//     id: number;
//     name: string;
// }

// interface Transaction {
//     id: number;
//     category: { name: string };
//     user: User;
//     type: string;
//     amount: number;
//     transaction_date: string;
//     transaction_time: string;
//     payment_method: string;
// }

// interface Sale {
//     id: number;
//     client: { name: string } | null;
//     user: User;
//     total_paid: number;
//     sale_date: string;
//     sale_time: string;
//     payment_method: string;
// }

// interface CashRegister {
//     id: number;
//     register_date: string;
//     opening_balance: number;
//     total_sales: number;
//     total_income: number;
//     total_expenses: number;
//     expected_balance: number;
//     actual_balance: number | null;
//     difference: number | null;
//     openedBy: User;
//     closedBy: User | null;
//     opened_at: string;
//     closed_at: string | null;
//     is_closed: boolean;
//     opening_notes: string | null;
//     closing_notes: string | null;
// }

// interface CashRegisterTodayProps {
//     cashRegister: CashRegister | null;
//     transactions: Transaction[];
//     sales: Sale[];
//     canOpen: boolean;
// }

// const breadcrumbs: BreadcrumbItem[] = [
//     {
//         title: 'Cajas',
//         href: '/cash-register',
//     },
//     {
//         title: 'Caja de Hoy',
//         href: '/cash-register/today',
//     },
// ];

// export default function CashRegisterToday({ cashRegister, transactions, sales, canOpen }: CashRegisterTodayProps) {
//     return (
//         <AppLayout breadcrumbs={breadcrumbs}>
//             <Head title="Caja de Hoy" />
//             <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
//                 {cashRegister ? (
//                     <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
//                         <h2 className="text-2xl font-bold tracking-tight mb-6">Caja de Hoy</h2>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             <div>
//                                 <p><strong>Fecha:</strong> {cashRegister.register_date}</p>
//                                 <p><strong>Estado:</strong> {cashRegister.is_closed ? 'Cerrada' : 'Abierta'}</p>
//                                 <p><strong>Apertura:</strong> {format(new Date(cashRegister.opened_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
//                                 <p><strong>Abierto por:</strong> {cashRegister.openedBy.name}</p>
//                                 {cashRegister.is_closed && (
//                                     <>
//                                         <p><strong>Cierre:</strong> {format(new Date(cashRegister.closed_at!), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
//                                         <p><strong>Cerrado por:</strong> {cashRegister.closedBy?.name}</p>
//                                     </>
//                                 )}
//                             </div>
//                             <div>
//                                 <p><strong>Saldo inicial:</strong> ${cashRegister.opening_balance.toLocaleString()}</p>
//                                 <p><strong>Ventas:</strong> ${cashRegister.total_sales.toLocaleString()}</p>
//                                 <p><strong>Ingresos:</strong> ${cashRegister.total_income.toLocaleString()}</p>
//                                 <p><strong>Egresos:</strong> ${cashRegister.total_expenses.toLocaleString()}</p>
//                                 {cashRegister.is_closed && (
//                                     <>
//                                         <p><strong>Saldo esperado:</strong> ${cashRegister.expected_balance.toLocaleString()}</p>
//                                         <p><strong>Saldo real:</strong> ${cashRegister.actual_balance?.toLocaleString()}</p>
//                                         <p><strong>Diferencia:</strong> ${cashRegister.difference?.toLocaleString()}</p>
//                                     </>
//                                 )}
//                             </div>
//                         </div>
//                         {cashRegister.opening_notes && <p className="mt-4"><strong>Notas de apertura:</strong> {cashRegister.opening_notes}</p>}
//                         {cashRegister.closing_notes && <p className="mt-2"><strong>Notas de cierre:</strong> {cashRegister.closing_notes}</p>}
//                     </div>
//                 ) : (
//                     <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
//                         <h2 className="text-2xl font-bold tracking-tight mb-6">Caja de Hoy</h2>
//                         <p>No hay caja abierta para hoy.</p>
//                         {canOpen && (
//                             <Button className="mt-4 gap-1" onClick={() => router.visit(route('cash-register.open'))}>
//                                 <Plus className="h-4 w-4" />
//                                 Abrir Caja
//                             </Button>
//                         )}
//                     </div>
//                 )}

//                 {cashRegister && (
//                     <>
//                         <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
//                             <h2 className="text-2xl font-bold tracking-tight mb-6">Transacciones</h2>
//                             <Table>
//                                 <TableHeader>
//                                     <TableRow>
//                                         <TableHead>Categoría</TableHead>
//                                         <TableHead>Tipo</TableHead>
//                                         <TableHead>Monto</TableHead>
//                                         <TableHead>Hora</TableHead>
//                                         <TableHead>Método</TableHead>
//                                         <TableHead>Usuario</TableHead>
//                                     </TableRow>
//                                 </TableHeader>
//                                 <TableBody>
//                                     {transactions.map((transaction) => (
//                                         <TableRow key={transaction.id}>
//                                             <TableCell>{transaction.category.name}</TableCell>
//                                             <TableCell>{transaction.type}</TableCell>
//                                             <TableCell>${transaction.amount.toLocaleString()}</TableCell>
//                                             <TableCell>{transaction.transaction_time}</TableCell>
//                                             <TableCell>{transaction.payment_method}</TableCell>
//                                             <TableCell>{transaction.user.name}</TableCell>
//                                         </TableRow>
//                                     ))}
//                                 </TableBody>
//                             </Table>
//                         </div>

//                         <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
//                             <h2 className="text-2xl font-bold tracking-tight mb-6">Ventas</h2>
//                             <Table>
//                                 <TableHeader>
//                                     <TableRow>
//                                         <TableHead>Cliente</TableHead>
//                                         <TableHead>Total</TableHead>
//                                         <TableHead>Hora</TableHead>
//                                         <TableHead>Método</TableHead>
//                                         <TableHead>Usuario</TableHead>
//                                     </TableRow>
//                                 </TableHeader>
//                                 <TableBody>
//                                     {sales.map((sale) => (
//                                         <TableRow key={sale.id}>
//                                             <TableCell>{sale.client?.name || 'Sin cliente'}</TableCell>
//                                             <TableCell>${sale.total_paid.toLocaleString()}</TableCell>
//                                             <TableCell>{sale.sale_time}</TableCell>
//                                             <TableCell>{sale.payment_method}</TableCell>
//                                             <TableCell>{sale.user.name}</TableCell>
//                                         </TableRow>
//                                     ))}
//                                 </TableBody>
//                             </Table>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </AppLayout>
//     );
// }
