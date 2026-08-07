<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeUserNotification extends Notification
{
    use Queueable;

    public function __construct(protected string $plainPassword) {}

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('Bienvenido a '.config('app.name'))
            ->view('emails.welcome_user', [
                'name' => $notifiable->name,
                'email' => $notifiable->email,
                'password' => $this->plainPassword,
                'loginUrl' => route('login'),
            ]);
    }
}
