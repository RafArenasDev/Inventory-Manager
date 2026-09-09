<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AuditLogController extends Controller
{
    /**
     * Solo lectura — el log de auditoría no se crea, edita ni elimina desde
     * acá, solo se consulta. Mismo patrón de paginación + filtro año/mes de
     * fecha (via date_from/date_to) que el resto de módulos.
     */
    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        $totalCount = AuditLog::count();
        $filteredCount = (clone $query)->count();
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $auditLogs = $query->paginate($perPage)->withQueryString();
        $auditLogs->getCollection()->transform(fn ($log) => $this->transform($log));

        return Inertia::render('auditLogs/index', [
            'auditLogs' => $auditLogs,
            'filters' => [...$request->only(['search', 'per_page']), 'date_from' => $this->dateFrom($request), 'date_to' => $this->dateTo($request)],
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Exporta exactamente lo que el usuario está viendo: mismo buscador y
     * mismo rango de fecha aplicado en pantalla — igual que el resto de
     * módulos, así nunca se intenta volcar años de historial de una sola vez
     * (lo que sí podría tumbar el proceso con datasets grandes).
     */
    public function export(Request $request)
    {
        $logs = $this->filteredQuery($request)->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Auditoría');

        $headers = [
            'A1' => 'Fecha',
            'B1' => 'Usuario',
            'C1' => 'Módulo',
            'D1' => 'Acción',
            'E1' => 'Registro afectado',
            'F1' => 'Motivo',
        ];
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
        ];
        $sheet->getStyle('A1:F1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($logs as $log) {
            $data = $this->transform($log);
            $sheet->setCellValue('A'.$row, $data['created_at']);
            $sheet->setCellValue('B'.$row, $data['user_name']);
            $sheet->setCellValue('C'.$row, $data['module'] ?? '-');
            $sheet->setCellValue('D'.$row, $data['action_label']);
            $sheet->setCellValue('E'.$row, $data['subject_label'] ?? '-');
            $sheet->setCellValue('F'.$row, $data['reason'] ?? '-');
            $row++;
        }

        $dataStyle = ['borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]]];
        if ($row > 2) {
            $sheet->getStyle('A1:F'.($row - 1))->applyFromArray($dataStyle);
        }
        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getRowDimension(1)->setRowHeight(25);

        $filename = 'Auditoria_'.now()->format('Y-m-d').'.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    private function filteredQuery(Request $request)
    {
        $query = AuditLog::with('user:id,name')->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereLikeUnaccent('user_name', "%{$search}%")
                    ->orWhereLikeUnaccent('action', "%{$search}%")
                    ->orWhereLikeUnaccent('reason', "%{$search}%")
                    ->orWhereLikeUnaccent('subject_label', "%{$search}%");
            });
        }

        return $query->whereDate('created_at', '>=', $this->dateFrom($request))
            ->whereDate('created_at', '<=', $this->dateTo($request));
    }

    // Sin filtro explícito, se limita al mes actual — nunca se pinta el
    // histórico completo de una sola vez.
    private function dateFrom(Request $request): string
    {
        return $request->filled('date_from') ? $request->date_from : today()->startOfMonth()->toDateString();
    }

    private function dateTo(Request $request): string
    {
        return $request->filled('date_to') ? $request->date_to : today()->endOfMonth()->toDateString();
    }

    /**
     * Traduce el identificador técnico de la acción (ej. "sale.cancelled")
     * a una frase corta y clara para quien lee el log, no para quien lo
     * programó.
     */
    private function actionLabel(string $action): string
    {
        return match ($action) {
            'sale.cancelled' => 'Anuló una venta',
            'client.anonymized' => 'Anonimizó un cliente',
            'client.deleted' => 'Eliminó un cliente',
            'inventory.manual_adjustment' => 'Ajuste manual de inventario',
            'inventory_import.committed' => 'Carga masiva de inventario',
            'auth.login_success' => 'Inició sesión',
            'auth.login_failed' => 'Intento de inicio de sesión fallido',
            'auth.login_blocked_inactive' => 'Intento de login con cuenta inactiva',
            'auth.login_blocked_locked' => 'Intento de login con cuenta bloqueada',
            'auth.logout' => 'Cerró sesión',
            'user.password_self_changed' => 'Cambió su contraseña',
            'user.password_reset_via_email' => 'Restableció su contraseña por correo',
            'user.profile_self_updated' => 'Actualizó su perfil',
            'user.self_deleted' => 'Eliminó su propia cuenta',
            'user.roles_synced' => 'Cambió los roles de un usuario',
            'role.permissions_synced' => 'Cambió los permisos de un rol',
            'user.terms_accepted' => 'Aceptó los Términos y Condiciones',
            'user.terms_declined' => 'Rechazó los Términos y Condiciones (sesión cerrada)',
            default => match (true) {
                str_ends_with($action, '.created') => 'Creó un registro',
                str_ends_with($action, '.updated') => 'Editó un registro',
                str_ends_with($action, '.deleted') => 'Eliminó un registro',
                default => $action,
            },
        };
    }

    private function transform(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'user_name' => $log->user?->name ?? $log->user_name,
            'module' => AuditLogger::moduleLabel($log->subject_type),
            'action' => $log->action,
            'action_label' => $this->actionLabel($log->action),
            'subject_type' => $log->subject_type ? class_basename($log->subject_type) : null,
            'subject_id' => $log->subject_id,
            'subject_label' => $log->subject_label,
            'reason' => $log->reason,
            'changes' => $log->changes,
            'created_at' => $log->created_at->format('d/m/Y - h:i A'),
        ];
    }
}
