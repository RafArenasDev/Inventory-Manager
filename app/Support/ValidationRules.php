<?php

namespace App\Support;

class ValidationRules
{
    /**
     * Reglas de correo con dominio completo (rechaza "correo@correo" sin
     * TLD). El validador `email` de Laravel por sí solo usa RFCValidation,
     * que es permisiva a propósito (acepta "user@localhost") y deja pasar
     * direcciones sin punto en el dominio — real en producción, encontrado
     * durante pruebas: se podían crear clientes/usuarios/proveedores con un
     * correo inválido que nunca va a recibir nada.
     *
     * @return array<int, string>
     */
    public static function email(): array
    {
        return ['email:rfc', 'regex:/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/'];
    }
}
