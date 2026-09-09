<?php

return [
    // Subir este valor (ej. a "2026.10") cuando cambie el contenido de
    // TermsContent.tsx obliga a TODOS los usuarios a volver a aceptar en su
    // próximo request, sin importar que ya hubieran aceptado una versión
    // anterior — ver EnsureTermsAccepted y TermsController.
    'terms_version' => '2026.09',
];
