/**
 * Texto legal único, compartido entre el modal informativo del login (solo
 * lectura, enlazado desde el pie de página) y la página de aceptación
 * obligatoria post-login (accept-terms.tsx) — un solo lugar para editar el
 * contenido, evita que ambas vistas se desincronicen con el tiempo.
 *
 * IMPORTANTE: cualquier cambio de fondo acá (no una corrección de tipeo)
 * debe ir acompañado de subir `terms_version` en config/legal.php — de lo
 * contrario los usuarios que ya habían aceptado la versión anterior nunca
 * vuelven a ver el paso de aceptación. Ver EnsureTermsAccepted.
 */
export default function TermsContent() {
    return (
        <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300">
            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">1. Naturaleza y alcance del software</h3>
                <p>
                    Inventory Manager es un software de uso <strong>interno</strong> para la gestión de inventario, ventas y caja de un negocio de
                    venta de repuestos. No es una plataforma pública, no permite el registro de usuarios externos, no funciona como una tienda en
                    línea ni facilita la venta directa a consumidores por internet. Su uso está restringido a los empleados del negocio
                    (administrador, vendedores, cajero, bodega), quienes acceden mediante usuario y contraseña individuales.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">2. Qué SÍ hace el software</h3>
                <p>
                    Gestión de catálogo de productos e inventario (entradas, salidas y ajustes manuales de stock); registro de ventas en mostrador con
                    generación de un recibo/comprobante interno de venta en PDF; gestión de clientes (datos de contacto para garantías y facturación,
                    con opción de anonimizar o eliminar sus datos); apertura y cierre de caja diaria con cálculo automático de totales; registro de
                    ingresos y gastos; pedidos a proveedores; roles y permisos diferenciados por tipo de empleado; un historial de auditoría interno;
                    y notificación de comprobantes de venta al cliente por WhatsApp.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">3. Qué NO hace el software</h3>
                <p>
                    No es un sistema de facturación electrónica certificado ante la DIAN — el documento que genera es un{' '}
                    <strong>comprobante interno de venta</strong>, no una factura electrónica con validación previa. No presta servicios de pago ni
                    procesa tarjetas o transferencias (el medio de pago se registra solo como dato informativo). No es una tienda en línea. No ofrece
                    asesoría contable o tributaria ni soporte de declaración de impuestos. No almacena ni procesa datos de tarjetas de crédito.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">4. Datos personales (Ley 1581 de 2012 — Habeas Data)</h3>
                <p>
                    Los datos de clientes (nombre, documento, dirección, teléfono, correo) se recolectan únicamente para gestión de ventas, garantías
                    y facturación, y no se venden ni comparten con terceros. Todo cliente puede solicitar la anonimización o eliminación de sus datos,
                    disponible desde el módulo de Clientes. Los datos de los empleados (nombre, correo, contraseña cifrada) se usan exclusivamente
                    para el control de acceso interno.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">5. Monitoreo y auditoría interna</h3>
                <p>
                    Todas las acciones realizadas dentro del sistema — inicios y cierres de sesión, cambios de contraseña o de datos de perfil,
                    ventas, movimientos de inventario, pedidos, cambios de caja, y cualquier otra operación crítica — quedan registradas en un
                    historial de auditoría interno con el usuario responsable, la fecha y hora, y el detalle del cambio. Este historial es revisado
                    por la administración del negocio como medida de control interno, no de vigilancia personal.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">6. Tipo de licencia</h3>
                <p>
                    El software se distribuye bajo una <strong>licencia Freeware</strong> (uso gratuito autorizado explícitamente por el
                    desarrollador) de tipo <strong>propietaria, de uso limitado, no exclusiva e intransferible (EULA)</strong>. No es software
                    libre/open source (no se entrega ni se autoriza el código fuente) ni un modelo SaaS multiusuario — es una instancia única para un
                    solo negocio. El desarrollador conserva la propiedad exclusiva del código fuente; el negocio licenciatario recibe únicamente el
                    derecho de operarlo, sin costo, para su propia actividad comercial interna, sin poder revenderlo, sublicenciarlo, redistribuirlo
                    ni modificar el código fuente.
                </p>
                <p className="mt-2">
                    Si en el futuro el desarrollador decide cobrar por el uso del software, ese cambio se notificará expresamente al negocio
                    licenciatario antes de aplicarse: el software dejaría de clasificarse como Freeware y pasaría a una{' '}
                    <strong>licencia comercial propietaria</strong>, bajo los mismos términos de propiedad intelectual aquí descritos.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">7. Uso correcto de la plataforma</h3>
                <p>
                    El usuario se compromete a no intentar vulnerar, alterar sin autorización, ni realizar ingeniería inversa sobre el software, y a
                    usarlo únicamente para los fines propios de la operación del establecimiento.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">8. Límite de responsabilidad</h3>
                <p>
                    El desarrollador responde por el correcto funcionamiento técnico del software, pero no es responsable por descuadres de caja o
                    pérdidas de inventario que resulten de error humano, fraude o mal uso por parte de un empleado; decisiones comerciales, contables
                    o tributarias del negocio; ni sanciones de la DIAN u otra autoridad si el negocio no declara o factura conforme a la ley vigente.
                </p>
            </section>

            <p className="text-xs text-gray-500 dark:text-gray-400">Última actualización: septiembre de 2026.</p>
        </div>
    );
}
