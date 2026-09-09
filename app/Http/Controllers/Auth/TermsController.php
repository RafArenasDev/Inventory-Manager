<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paso obligatorio entre login y dashboard: mientras `terms_accepted_at` sea
 * null, el middleware EnsureTermsAccepted redirige acá en cada request. Solo
 * dos salidas: aceptar (marca el flag y sigue) o rechazar (cierra sesión).
 */
class TermsController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('auth/accept-terms');
    }

    public function accept(Request $request): RedirectResponse
    {
        $request->validate([
            'accepted_terms' => ['accepted'],
            'accepted_data_policy' => ['accepted'],
            'accepted_monitoring' => ['accepted'],
        ], [
            'accepted_terms.accepted' => 'Debes aceptar los Términos y Condiciones para continuar.',
            'accepted_data_policy.accepted' => 'Debes aceptar la política de datos personales para continuar.',
            'accepted_monitoring.accepted' => 'Debes aceptar el aviso de monitoreo interno para continuar.',
        ]);

        $user = $request->user();
        $previousVersion = $user->terms_version;
        $version = config('legal.terms_version');

        AuditLogger::suppress($user);
        $user->update(['terms_accepted_at' => now(), 'terms_version' => $version]);
        AuditLogger::log('user.terms_accepted', $user, null, ['version' => [$previousVersion, $version]]);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function decline(Request $request): RedirectResponse
    {
        $user = $request->user();

        AuditLogger::log('user.terms_declined', $user);

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with(
            'status',
            'Para usar Inventory Manager es necesario aceptar los Términos y Condiciones. Puedes volver a intentarlo cuando quieras.'
        );
    }
}
