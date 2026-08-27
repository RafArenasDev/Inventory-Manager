<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestMail extends Command
{
    protected $signature = 'mail:test {email}';

    protected $description = 'Test mail configuration';

    public function handle()
    {
        $email = $this->argument('email');

        $this->info('Testing email to: '.$email);

        try {
            Mail::raw('¡Hola! Este es un email de prueba desde tu aplicación Laravel.', function ($message) use ($email) {
                $message->to($email)
                    ->subject('Prueba de Email - POS Inventory System');
            });

            $this->info('✅ Email enviado exitosamente a '.$email);
            $this->info('Revisa tu bandeja de entrada o spam.');
        } catch (\Exception $e) {
            $this->error('❌ Error al enviar email: '.$e->getMessage());
        }
    }
}
