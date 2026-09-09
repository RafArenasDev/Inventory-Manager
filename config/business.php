<?php

return [
    // NIT/celular/dirección son datos ficticios de ejemplo (portfolio) —
    // usados en la factura PDF y en el mensaje de WhatsApp.
    'name' => env('BUSINESS_NAME', 'Inventory Manager'),
    'nit' => env('BUSINESS_NIT', '900123456-7'),
    'phone' => env('BUSINESS_PHONE', '3001234567'),
    'email' => env('BUSINESS_EMAIL', 'contacto@inventorymanager.com'),
    'address' => env('BUSINESS_ADDRESS', 'Cra 45 #12-30, Bogotá, Cundinamarca'),

    // Tope de venta al cliente DIAN "Consumidor Final" (documento
    // 222222222222) antes de exigir los datos reales del comprador. `null`
    // = sin límite activo (por defecto: mientras el negocio no facture IVA,
    // esta validación no aplica). El valor de la UVT cambia cada año y la
    // regla exacta depende del régimen tributario del negocio — no se
    // codifica una cifra fija sin confirmarla antes con un contador. Para
    // activarlo, definir BUSINESS_CONSUMIDOR_FINAL_LIMIT en .env con el
    // monto en pesos vigente (ej. 5 UVT del año en curso).
    'consumidor_final_limit' => env('BUSINESS_CONSUMIDOR_FINAL_LIMIT', null),
];
