<?php

return [
    // NIT/celular/dirección son datos ficticios de ejemplo (portfolio) —
    // usados en la factura PDF y en el mensaje de WhatsApp.
    'name' => env('BUSINESS_NAME', 'Inventory Manager'),
    'nit' => env('BUSINESS_NIT', '900123456-7'),
    'phone' => env('BUSINESS_PHONE', '3001234567'),
    'email' => env('BUSINESS_EMAIL', 'contacto@inventorymanager.com'),
    'address' => env('BUSINESS_ADDRESS', 'Cra 45 #12-30, Bogotá, Cundinamarca'),

    // Valor de la UVT (Unidad de Valor Tributario) del año gravable vigente
    // — la fija la DIAN cada diciembre para el año siguiente. Vigente para
    // 2026: $52.374 (Resolución 000238 del 15 de diciembre de 2025,
    // ajustada por IPC certificado por el DANE). Se reajusta una vez al año
    // acá — todo lo que depende de la UVT abajo se recalcula solo.
    'uvt_value' => (int) env('BUSINESS_UVT_VALUE', 52374),

    // Tope de venta al cliente DIAN "Consumidor Final" (documento
    // 222222222222) antes de exigir los datos reales del comprador: 5 UVT,
    // el mismo límite que aplica al tiquete P.O.S. tradicional (por encima
    // de eso, o se emite documento equivalente P.O.S. electrónico con datos
    // reales del comprador, o no es válido para soportar costos/deducciones
    // del cliente — Resolución 000165 de 2023 / 001092 de 2022 DIAN). Activo
    // por defecto; confirmar con el contador del negocio si su régimen
    // tributario específico exige un tope distinto.
    'consumidor_final_limit_uvt' => (float) env('BUSINESS_CONSUMIDOR_FINAL_LIMIT_UVT', 5),

    // Ingresos brutos anuales (persona natural comerciante) a partir de los
    // cuales la DIAN exige facturación electrónica obligatoria: 3.500 UVT
    // (Resolución 000165 de 2023 DIAN). Usado solo para un aviso informativo
    // en el Dashboard — nunca bloquea nada — porque no requiere ni RUT
    // habilitado ni cambio de proceso urgente, solo previsión.
    'annual_invoicing_threshold_uvt' => (float) env('BUSINESS_ANNUAL_INVOICING_THRESHOLD_UVT', 3500),
];
