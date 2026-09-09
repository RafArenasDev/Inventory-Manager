<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    /**
     * Solo lectura — el log de auditoría no se crea, edita ni elimina desde
     * acá, solo se consulta. Mismo patrón de paginación + filtro año/mes de
     * fecha (via date_from/date_to) que el resto de módulos.
     */
    public function index(Request $request)
    {
        $query = AuditLog::with('user:id,name')->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereLikeUnaccent('user_name', "%{$search}%")
                    ->orWhereLikeUnaccent('action', "%{$search}%")
                    ->orWhereLikeUnaccent('reason', "%{$search}%");
            });
        }

        // Sin filtro explícito, se limita al mes actual — nunca se pinta el
        // histórico completo de una sola vez.
        $dateFrom = $request->filled('date_from') ? $request->date_from : today()->startOfMonth()->toDateString();
        $dateTo = $request->filled('date_to') ? $request->date_to : today()->endOfMonth()->toDateString();
        $query->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo);

        $totalCount = AuditLog::count();
        $filteredCount = (clone $query)->count();
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $auditLogs = $query->paginate($perPage)->withQueryString();
        $auditLogs->getCollection()->transform(function ($log) {
            return [
                'id' => $log->id,
                'user_name' => $log->user?->name ?? $log->user_name,
                'action' => $log->action,
                'subject_type' => $log->subject_type ? class_basename($log->subject_type) : null,
                'subject_id' => $log->subject_id,
                'reason' => $log->reason,
                'created_at' => $log->created_at->format('d/m/Y - h:i A'),
            ];
        });

        return Inertia::render('auditLogs/index', [
            'auditLogs' => $auditLogs,
            'filters' => [...$request->only(['search', 'per_page']), 'date_from' => $dateFrom, 'date_to' => $dateTo],
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }
}
