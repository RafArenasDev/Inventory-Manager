<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use App\Notifications\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, BroadcastsModelChanges, HasFactory, HasRoles, Notifiable;

    protected $broadcastChannelName = 'admin';

    public function auditLabel(): string
    {
        return 'Usuario '.$this->name.' ('.$this->email.')';
    }

    /**
     * Los contadores de intentos fallidos/bloqueo de seguridad los mueve el
     * propio sistema durante el login (sin nadie autenticado todavía, así
     * que el guard `auth()->check()` del trait ya los filtra en el caso
     * normal) — este chequeo extra cubre el único caso donde sí podría
     * colarse ruido: que sean los ÚNICOS campos que cambiaron.
     */
    public function shouldAudit(string $event): bool
    {
        if ($event !== 'updated') {
            return true;
        }

        $changed = array_diff(array_keys($this->getChanges()), ['updated_at']);

        return array_diff($changed, ['failed_login_attempts', 'security_locked_at']) !== [];
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'must_change_password',
        'is_active',
        'failed_login_attempts',
        'security_locked_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'is_active' => 'boolean',
            'failed_login_attempts' => 'integer',
            'security_locked_at' => 'datetime',
        ];
    }

    /**
     * Send a password reset notification to the user.
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
