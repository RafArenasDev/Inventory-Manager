<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// La desactivación por inactividad (app:deactivate-inactive-entities) NO se
// programa aquí con Schedule: este PC no es un servidor 24/7 (se prende y
// apaga a diario), así que un cron de Windows no sirve. Se dispara sola una
// vez por día desde el primer login (ver EnsureDailyMaintenanceRuns).
