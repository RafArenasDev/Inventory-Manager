<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// App interna de un solo negocio: cualquier usuario logueado puede
// escuchar los canales de dominio — ya ve estos mismos datos por las
// páginas normales, no hace falta autorización granular por canal.
foreach (['purchase-orders', 'inventory', 'sales', 'finance', 'clients', 'admin'] as $domainChannel) {
    Broadcast::channel($domainChannel, fn ($user) => $user !== null);
}
