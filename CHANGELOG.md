# Changelog

Formato: una sección por versión (`## vX.Y.Z - YYYY-MM-DD`), un resumen corto,
y una lista de viñetas con el detalle de qué cambió. Generado a mano hasta
`v1.10.1`; desde `v1.11.0` se actualiza junto con cada tag nuevo. El modal de
"Novedades" del sidebar y el badge de versión se generan de este archivo en
build time — ver `scripts/generate-changelog.mjs`.

## v1.11.0 - 2026-09-08

Auditoría total, bloqueo de clientes anonimizados, aceptación obligatoria de Términos y Condiciones, y los dos topes DIAN activados con cifras reales de 2026.

- Auditoría cubre ahora login (éxito, fallido, cuenta inactiva/bloqueada), logout, cambio de contraseña propio, actualización de perfil propio, reseteo de contraseña por correo, y sincronización de roles/permisos (antes invisibles por ser cambios de tabla pivote, no de atributos del modelo).
- Carga masiva de inventario deja una entrada de auditoría agregada (antes quedaba fuera de cobertura).
- Cliente anonimizado queda totalmente bloqueado: sin editar, eliminar, reactivar ni ver ningún dato — la tabla solo muestra "Cliente Anonimizado" y guiones, sin enviar el documento real al navegador.
- Términos y Condiciones reescritos con contenido legal completo (qué hace/no hace el software, licencia, Habeas Data, monitoreo) y aceptación obligatoria con 3 checkboxes justo después del login, habilitados solo tras leer hasta el final; rechazar cierra la sesión.
- La aceptación queda versionada: si el texto legal cambia de fondo, se sube `terms_version` y todos vuelven a ver el paso, sin importar navegador o dispositivo.
- Tope de venta a "Consumidor Final" activado: 5 UVT ($261.870 con la UVT 2026).
- Alerta de tope anual de facturación electrónica obligatoria activada: banner en el Dashboard a partir del 70% de 3.500 UVT ($183.309.000 con la UVT 2026).
- Corregido el copyright desactualizado (año fijo) en las plantillas de correo.
- Historial de versiones: `CHANGELOG.md` como única fuente, generado a `resources/js/version.ts` en cada build; badge de versión y modal de "Novedades" en el sidebar.

## v1.10.1 - 2026-09-08

Extensión del trait de auditoría a 12 modelos y cierre de una condición de carrera real en el número de factura.

- Trait `Auditable` (mismo patrón que `BroadcastsModelChanges`) aplicado a Sale, Client, Product, Category, Supplier, PurchaseOrder, User, Role, CashRegister, Transaction, TransactionCategory e InventoryMovement.
- Corregida una condición de carrera real: el número de factura se generaba fuera de la transacción y sin bloqueo — ahora usa `lockForUpdate()` dentro de la misma transacción.
- Manejo de violación de unicidad (choque de dos usuarios creando el mismo dato a la vez) en Client, Product, Supplier, Category y User.
- Umbral DIAN "Consumidor Final" construido como config parametrizable (quedó inactivo hasta v1.11.0).

## v1.10.0 - 2026-09-08

Primer paquete de avisos legales para Colombia y el módulo de Auditoría.

- Banner de cookies técnicas, aviso de monitoreo laboral en el login, y modal de Términos y Condiciones.
- Disclaimer de Habeas Data (Ley 1581 de 2012) al crear un cliente.
- Botón para anonimizar los datos de un cliente sin borrar la fila (conserva referencia contable de ventas históricas).
- Nuevo módulo de Auditoría con paginación y filtro de año/mes, cubriendo anulación de venta, anonimizar/eliminar cliente, y ajuste manual de inventario.

## v1.9.3 - 2026-09-08

Alineación de columnas de dinero en toda la app.

- "$" fijo a la izquierda y dígitos alineados a la derecha en tablas, modales de detalle, la factura PDF y las exportaciones a Excel.

## v1.9.2 - 2026-09-08

Corrección de identidad de negocio en la factura.

- Título del modal de factura ya no muestra un "#" suelto.
- Reemplazada la identidad de negocio de ejemplo ("NovaTech Store") por "Inventory Manager" en `.env`, `.env.example` y `config/business.php`.

## v1.9.1 - 2026-09-08

Auditoría del Dashboard y los exports, con dos bugs reales corregidos.

- Corregido un bug real: el descuento por porcentaje mostraba el monto en pesos calculado en vez del porcentaje ingresado.
- Agregado el botón de exportar Excel que faltaba en Productos.
- Eliminado código muerto en el Dashboard (`calculateFinancialTotals` nunca se usaba).

## v1.9.0 - 2026-09-08

Cierre del módulo de Finanzas — 13/13 módulos completan el hardening pass.

- Validación real de formulario, guarda contra ediciones que romperían la auditoría, y limpieza de código muerto.

## v1.8.0 - 2026-09-08

Cierre del módulo de Caja.

- Corregida una condición de carrera que podía tumbar el login, totales que quedaban en cero de forma obsoleta, y una condición de carrera de doble cierre de caja.

## v1.7.1 - 2026-09-08

Consistencia visual de modales y validación de proveedor.

- Corregida una inconsistencia entre `bg-card`/`bg-background` en modales.
- La dirección del proveedor pasó a ser un campo de texto obligatorio.

## v1.7.0 - 2026-09-08

Cierre del módulo de Clientes.

- Datos de contacto completos como obligatorios, cliente DIAN por defecto (Consumidor Final), y corregido un error en la creación rápida de cliente.

## v1.6.0 - 2026-09-08

Cierre del módulo de Ventas.

- Precio y stock pasaron a calcularse de forma autoritativa en el servidor (no confiar en el precio que envía el navegador).
- Cliente pasó a ser obligatorio en toda venta.
- Corregido un error de visualización del precio por ítem.

## v1.5.1 - 2026-09-08

Corrección de validación y layout.

- Corregido un salto de layout durante la validación, y validados los modales de contraseña/perfil y la alineación del formulario de productos.

## v1.5.0 - 2026-09-08

Hardening del módulo de Proveedores y fixes de validación transversales.

## v1.4.0 - 2026-09-07

Hardening de Productos, Movimientos y Pedidos.

- Cantidades que nunca quedan en negativo, validación del lado del servidor, envío explícito de WhatsApp/correo, y corregidos los estilos del anillo de foco.

## v1.3.3 - 2026-09-07

Corrección de errores de carga de imagen de producto.

## v1.3.2 - 2026-09-07

Rediseño de la carga masiva: modo de solo creación de productos, interfaz de arrastrar-y-soltar, y tabla guía de campos.

## v1.3.1 - 2026-09-07

Ocultadas las notas de movimiento en el modal de vista de Productos; agregada una guía de carga masiva.

## v1.3.0 - 2026-09-07

Cierre del módulo de Categorías.

- Validación reducida a solo el nombre, chequeo redundante eliminado, mensaje de eliminación más claro.

## v1.2.0 - 2026-09-07

Cierre del módulo de Roles.

- Validación, y protección contra editar el rol Administrador o quitarse el único rol propio.

## v1.1.1 - 2026-09-07

Corrección de hardening en el módulo de Usuarios.

## v1.1.0 - 2026-09-07

Cierre del módulo de Usuarios.

## v1.0.0 - 2026-09-07

Línea base del MVP.
