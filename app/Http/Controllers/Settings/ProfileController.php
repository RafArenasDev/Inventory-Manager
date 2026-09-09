<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Services\AuditLogger;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $before = $user->only(['name', 'email']);

        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        AuditLogger::suppress($user);
        $user->save();

        $after = $user->only(['name', 'email']);
        $changes = collect($after)
            ->filter(fn ($value, $field) => $value !== $before[$field])
            ->mapWithKeys(fn ($value, $field) => [$field => [$before[$field], $value]])
            ->toArray();

        if ($changes !== []) {
            AuditLogger::log('user.profile_self_updated', $user, null, $changes);
        }

        return to_route('dashboard');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Se registra ANTES de cerrar sesión — el trait Auditable exige un
        // usuario autenticado (auth()->check()), y ya no lo habría después
        // del logout de la línea siguiente.
        AuditLogger::log('user.self_deleted', $user);

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
