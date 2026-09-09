<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $this->runDailyMaintenanceOnce();

        $cashRegisterController = app(CashRegisterController::class);
        $cashRegisterController->closeStaleRegisters(auth()->id());

        $openedRegister = $cashRegisterController->autoOpenIfNeeded(auth()->id());
        if ($openedRegister) {
            $amount = '$'.number_format($openedRegister->opening_amount, 0, ',', '.');
            $request->session()->flash('cash_register_notice', "Se abrió la caja de hoy automáticamente con un saldo de apertura de {$amount}.");
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Este PC no es un servidor 24/7 (se prende y apaga a diario), así que no
     * sirve programar tareas de mantenimiento (desactivación por inactividad,
     * backfill de facturas) con el scheduler de Laravel/cron de Windows. En
     * su lugar, se ejecutan una vez por día aprovechando el primer login del
     * día — la fecha del último run queda en la tabla `cache`
     * (CACHE_STORE=database), así que sobrevive a reinicios del PC sin
     * necesitar una tabla nueva.
     *
     * La marca de "ya corrió hoy" se guarda DESPUÉS de que ambos comandos
     * terminan, no antes: un backlog grande de facturas por generar puede
     * agotar el límite de tiempo de ejecución de PHP a mitad del comando
     * (visto real: se cortó justo en la venta #22 de 182 pendientes) — si
     * la marca ya quedó guardada, el resto se queda sin generar hasta el
     * día siguiente. Guardándola al final, un corte a mitad de camino hace
     * que el próximo login reintente desde donde quedó (los ya generados
     * se saltan solos, ver sales:backfill-invoices).
     */
    private function runDailyMaintenanceOnce(): void
    {
        $today = now()->toDateString();

        if (Cache::get('daily_maintenance_last_run') === $today) {
            return;
        }

        Artisan::call('app:deactivate-inactive-entities');
        Artisan::call('sales:backfill-invoices');
        Cache::forever('daily_maintenance_last_run', $today);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // Se calcula ANTES de cerrar sesión — auth()->id() ya no existe
        // después del logout.
        $closedRegister = app(CashRegisterController::class)->autoCloseIfNeeded(auth()->id());

        AuditLogger::log('auth.logout', auth()->user());

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($closedRegister) {
            $amount = '$'.number_format($closedRegister->closing_amount, 0, ',', '.');

            return redirect('/')->with('status', "Se cerró la caja de hoy automáticamente. Monto de cierre: {$amount}.");
        }

        return redirect('/');
    }
}
