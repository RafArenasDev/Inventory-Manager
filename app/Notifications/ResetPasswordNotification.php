<?php
namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $resetUrl = URL::temporarySignedRoute(
            'password.reset',
            now()->addMinutes(config('auth.passwords.users.expire')),
            [
                'email' => $notifiable->email,
                'token' => $this->token,
            ]
        );

        return (new MailMessage)
            ->subject('Restablecer contraseña')
            ->view('emails.password_reset', [
                'url'  => $resetUrl,
                'name' => $notifiable->name ?? 'Usuario',
            ]);
    }
}
