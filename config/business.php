<?php

return [
    // NIT/celular/dirección son datos ficticios de ejemplo (portfolio) —
    // usados en la factura PDF y en el mensaje de WhatsApp.
    'name' => env('BUSINESS_NAME', 'Inventory Manager'),
    'nit' => env('BUSINESS_NIT', '900123456-7'),
    'phone' => env('BUSINESS_PHONE', '3001234567'),
    'email' => env('BUSINESS_EMAIL', 'contacto@inventorymanager.com'),
    'address' => env('BUSINESS_ADDRESS', 'Cra 45 #12-30, Bogotá, Cundinamarca'),
];
