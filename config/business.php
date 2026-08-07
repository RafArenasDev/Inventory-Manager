<?php

return [
    // Datos ficticios de la tienda demo (portfolio) — usados en la factura
    // PDF y en el mensaje de WhatsApp. No representan el negocio real.
    'name' => env('BUSINESS_NAME', 'NovaTech Store'),
    'nit' => env('BUSINESS_NIT', '900123456-7'),
    'phone' => env('BUSINESS_PHONE', '3001234567'),
    'email' => env('BUSINESS_EMAIL', 'contacto@novatechstore.com'),
    'address' => env('BUSINESS_ADDRESS', 'Cra 45 #12-30, Bogotá, Cundinamarca'),
];
