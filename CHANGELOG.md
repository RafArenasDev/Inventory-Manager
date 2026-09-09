# Changelog

Formato: una sección por versión (`## vX.Y.Z - YYYY-MM-DD`), un resumen corto,
y una lista de viñetas con el detalle de qué cambió — cada viñeta puede
empezar con `**Categoría:**` (Funcionalidad, Seguridad, Auditoría,
Validación, Legal, Rendimiento, Exportación, UI/UX, Corrección) para
agruparse visualmente en el modal de "Novedades"; una viñeta sin categoría
se muestra igual, sin agrupar. Generado a mano hasta `v1.10.1`; desde
`v1.11.0` se actualiza junto con cada tag nuevo. El modal de "Novedades" del
sidebar y el badge de versión se generan de este archivo en build time —
ver `scripts/generate-changelog.mjs`.

## v1.11.0 - 2026-09-08

Auditoría total, bloqueo de clientes anonimizados, aceptación obligatoria de Términos y Condiciones, y los dos topes DIAN activados con cifras reales de 2026.

- **Auditoría:** Login (éxito, fallido, cuenta inactiva, cuenta bloqueada), logout, cambio de contraseña propio, actualización de perfil propio y reseteo de contraseña por correo quedan registrados con el detalle completo del evento. Antes eran invisibles para el trait automático porque no son cambios de atributos de un modelo — son eventos de autenticación sin modelo asociado, así que se instrumentaron a mano en cada punto exacto del flujo.
- **Auditoría:** La sincronización de roles de un usuario y de permisos de un rol ahora deja constancia con el detalle de qué se agregó y qué se quitó. Estos cambios viven en tablas pivote (`syncRoles`/`syncPermissions`), invisibles para el trait genérico porque no tocan ningún atributo propio del modelo — se agregó un registro manual específico para cada uno.
- **Auditoría:** La carga masiva de inventario (Excel) deja una sola entrada agregada por importación con el conteo de productos creados y movimientos registrados. Antes quedaba fuera de cobertura a propósito, para no duplicar el log de un ajuste manual — ahora el hueco real (importaciones sin ningún rastro) queda cerrado sin generar ruido.
- **Seguridad:** Un cliente anonimizado queda totalmente bloqueado a nivel de servidor, no solo de interfaz: no se puede editar, eliminar, reactivar ni ver su detalle, ni siquiera manipulando la URL directamente. La validación vive en el controlador, así que ningún atajo del navegador la puede saltar.
- **UI/UX:** La tabla de Clientes ya no envía ningún dato personal de un cliente anonimizado al navegador, ni siquiera el número de documento — solo el texto "Cliente Anonimizado" y guiones en cada columna, con un ícono de candado y "Sin acciones" reemplazando los botones de editar/eliminar/ver.
- **Legal:** Los Términos y Condiciones se reescribieron por completo: qué hace y qué no hace el software, tipo de licencia, tratamiento de datos personales bajo la Ley 1581 de 2012, alcance del monitoreo interno, y límite de responsabilidad del desarrollador — contenido real, no un párrafo genérico.
- **Funcionalidad:** La aceptación de los Términos pasó a ser un paso obligatorio justo después del login, con 3 checkboxes independientes que solo se habilitan después de hacer scroll hasta el final del texto — no basta con marcarlos sin leer. Rechazar cierra la sesión de inmediato y devuelve al login.
- **Legal:** La aceptación quedó versionada con `terms_version`: si el texto legal cambia de fondo en el futuro, se sube un número de versión y absolutamente todos los usuarios vuelven a ver el paso de aceptación en su siguiente ingreso, sin importar en qué navegador o dispositivo lo hayan aceptado antes.
- **Legal:** El software quedó clasificado explícitamente como licencia Freeware (uso gratuito autorizado por el desarrollador) bajo un EULA propietario — no es código abierto. Se agregó también la cláusula que cubre qué pasaría si en el futuro el desarrollador decide cobrar por su uso.
- **Funcionalidad:** El tope de venta al cliente "Consumidor Final" quedó activo con una cifra real: 5 UVT, equivalentes a $261.870 con la UVT vigente de 2026. Se calcula desde un valor de UVT configurable en vez de una cifra fija en el código, así que actualizarlo cada año es cambiar una sola variable.
- **Funcionalidad:** Se activó una alerta de tope anual de facturación electrónica obligatoria: un banner en el Dashboard que aparece a partir del 70% de 3.500 UVT en ventas acumuladas del año ($183.309.000 con la UVT de 2026), y cambia a rojo si el negocio ya lo superó.
- **Corrección:** El copyright de las plantillas de correo mostraba un año fijo desactualizado (solo 2026) en vez del rango 2025-2026 usado en el resto de la app.
- **Funcionalidad:** El historial de versiones ahora vive en `CHANGELOG.md` como única fuente de verdad, generado a `resources/js/version.ts` en cada build — de ahí salen tanto el badge de versión del pie de la barra lateral como este mismo modal de "Novedades".
- **Funcionalidad:** La app quedó instalable como PWA en Android, escritorio e iOS, con un service worker propio que mantiene la interfaz utilizable un instante sin conexión (network-first con cache de respaldo, nunca sobre acciones que escriben datos).

## v1.10.1 - 2026-09-08

Extensión del trait de auditoría a 12 modelos y cierre de una condición de carrera real en el número de factura.

- **Auditoría:** El trait `Auditable` (mismo patrón que `BroadcastsModelChanges`, ya usado para tiempo real) se aplicó a Sale, Client, Product, Category, Supplier, PurchaseOrder, User, Role, CashRegister, Transaction, TransactionCategory e InventoryMovement — cualquier creación, edición o eliminación en esos 12 modelos queda registrada automáticamente, sin instrumentar cada controlador a mano.
- **Corrección:** Se encontró y corrigió una condición de carrera real en Ventas: el número de factura se generaba fuera de la transacción y sin ningún bloqueo, así que dos ventas registradas casi al mismo instante podían calcular el mismo siguiente número. Ahora se genera con `lockForUpdate()` dentro de la misma transacción que crea la venta.
- **Seguridad:** Se agregó manejo de violación de unicidad (dos usuarios creando el mismo dato al mismo tiempo) en Client, Product, Supplier, Category y User — antes ese choque se veía como un error 500 crudo en vez de un mensaje claro de "ya existe un registro con ese dato".
- **Funcionalidad:** El umbral DIAN de "Consumidor Final" se construyó como una configuración parametrizable, aunque quedó inactivo hasta v1.11.0 mientras se confirmaba la cifra vigente.

## v1.10.0 - 2026-09-08

Primer paquete de avisos legales para Colombia y el módulo de Auditoría.

- **Legal:** Se agregaron un banner de cookies técnicas, un aviso de monitoreo laboral en el login, y un modal de Términos y Condiciones enlazado desde el pie del login.
- **Legal:** Se agregó un disclaimer de Habeas Data (Ley 1581 de 2012) visible al crear un cliente, antes del primer campo del formulario.
- **Funcionalidad:** Se agregó un botón para anonimizar los datos de un cliente sin borrar la fila — las ventas históricas mantienen su referencia contable intacta.
- **Auditoría:** Se construyó el nuevo módulo de Auditoría, con paginación y filtro de año/mes igual que el resto de módulos, cubriendo inicialmente anulación de venta, anonimizar/eliminar cliente, y ajuste manual de inventario.

## v1.9.3 - 2026-09-08

Alineación de columnas de dinero en toda la app.

- **UI/UX:** "$" fijo a la izquierda y dígitos alineados a la derecha en tablas, modales de detalle, la factura PDF y las exportaciones a Excel.

## v1.9.2 - 2026-09-08

Corrección de identidad de negocio en la factura.

- **Corrección:** Título del modal de factura ya no muestra un "#" suelto.
- **Corrección:** Reemplazada la identidad de negocio de ejemplo ("NovaTech Store") por "Inventory Manager" en `.env`, `.env.example` y `config/business.php`.

## v1.9.1 - 2026-09-08

Auditoría del Dashboard y los exports, con dos bugs reales corregidos.

- **Corrección:** El descuento por porcentaje mostraba el monto en pesos calculado en vez del porcentaje ingresado.
- **Exportación:** Agregado el botón de exportar Excel que faltaba en Productos.
- **Rendimiento:** Eliminado código muerto en el Dashboard (`calculateFinancialTotals` nunca se usaba).

## v1.9.0 - 2026-09-08

Cierre del módulo de Finanzas — 13/13 módulos completan el hardening pass.

- **Validación:** Validación real de formulario, guarda contra ediciones que romperían la auditoría, y limpieza de código muerto.

## v1.8.0 - 2026-09-08

Cierre del módulo de Caja.

- **Corrección:** Condición de carrera que podía tumbar el login, totales que quedaban en cero de forma obsoleta, y una condición de carrera de doble cierre de caja.

## v1.7.1 - 2026-09-08

Consistencia visual de modales y validación de proveedor.

- **UI/UX:** Corregida una inconsistencia entre `bg-card`/`bg-background` en modales.
- **Validación:** La dirección del proveedor pasó a ser un campo de texto obligatorio.

## v1.7.0 - 2026-09-08

Cierre del módulo de Clientes.

- **Validación:** Datos de contacto completos como obligatorios.
- **Funcionalidad:** Cliente DIAN por defecto ("Consumidor Final").
- **Corrección:** Error en la creación rápida de cliente.

## v1.6.0 - 2026-09-08

Cierre del módulo de Ventas.

- **Seguridad:** Precio y stock pasaron a calcularse de forma autoritativa en el servidor (no confiar en el precio que envía el navegador).
- **Validación:** Cliente pasó a ser obligatorio en toda venta.
- **Corrección:** Error de visualización del precio por ítem.

## v1.5.1 - 2026-09-08

Corrección de validación y layout.

- **Corrección:** Salto de layout durante la validación.
- **Validación:** Modales de contraseña/perfil y alineación del formulario de productos.

## v1.5.0 - 2026-09-08

Hardening del módulo de Proveedores y fixes de validación transversales.

- **Validación:** Formulario de Proveedores endurecido, con auto-cálculo del dígito de verificación del NIT (evita capturarlo mal a mano).

## v1.4.0 - 2026-09-07

Hardening de Productos, Movimientos y Pedidos.

- **Validación:** Cantidades que nunca quedan en negativo y validación reforzada del lado del servidor en los tres módulos.
- **Funcionalidad:** Envío explícito (con confirmación) de WhatsApp y correo, en vez de dispararse automáticamente.
- **Corrección:** Restaurado el anillo de foco visual en el último campo de cada formulario modal, y el botón de Pedidos ajustado al estilo/gating estándar del resto de la app.

## v1.3.3 - 2026-09-07

Corrección de errores de carga de imagen de producto.

- **Corrección:** El nombre del archivo se resalta en negrita (vía HTML del SweetAlert) y ya no aparece entre comillas en el mensaje de error de carga de imagen.

## v1.3.2 - 2026-09-07

Rediseño de la carga masiva de Productos.

- **Funcionalidad:** Modo de solo creación de productos (separado de Movimientos de Inventario), interfaz de arrastrar-y-soltar, y una tabla guía de campos esperados por columna.

## v1.3.1 - 2026-09-07

Mejoras menores al módulo de Productos.

- **UI/UX:** Ocultadas las notas de movimiento en el modal de vista de Productos (no aportaban nada ahí) y agregada una tarjeta guía para la carga masiva.

## v1.3.0 - 2026-09-07

Cierre del módulo de Categorías.

- **Validación:** Validación reducida a solo el nombre, chequeo redundante eliminado, mensaje de eliminación más claro.

## v1.2.0 - 2026-09-07

Cierre del módulo de Roles.

- **Validación:** Protección contra editar el rol Administrador o quitarse el único rol propio (evita quedar sin acceso al sistema).
- **UI/UX:** Nombre de la entidad en negrita dentro de los diálogos de confirmación de eliminación, en toda la app.

## v1.1.1 - 2026-09-07

Corrección de hardening en el módulo de Usuarios.

- **Corrección:** El borrado de un usuario no era atómico y podía romperse (y dejar al usuario sin roles pero sin eliminar) si chocaba contra historial referenciado por clave foránea — ahora corre dentro de una transacción.

## v1.1.0 - 2026-09-07

Cierre del módulo de Usuarios.

- **Validación:** Validación completa del formulario de Usuarios.
- **Seguridad:** Bloqueos de auto-acción — un usuario no puede desactivarse ni eliminarse a sí mismo.

## v1.0.0 - 2026-09-07

Línea base del MVP — más de un año de desarrollo (primer commit: 1 de junio de 2025) que llega a este punto como la primera versión "completa": el negocio ya puede vender, cobrar, inventariar y reabastecer desde la propia app. El sistema de tags con changelog formal empezó junto con esta versión, así que todo ese trabajo previo queda resumido acá en vez de repartido en 120+ tags retroactivos.

- **Funcionalidad:** Los 11 módulos operativos del MVP quedaron con CRUD completo: Usuarios, Roles y Permisos, Categorías, Productos, Proveedores, Clientes, Ventas, Movimientos de Inventario, Pedidos (con recepción automática desde entradas de stock), Caja (apertura/cierre automático por horario laboral) y Dashboard.
- **Funcionalidad:** Carga masiva de productos y movimientos de stock vía Excel/CSV, con vista previa fila por fila antes de confirmar.
- **Funcionalidad:** Dashboard con gráficas de ventas y categorías, accesos directos por módulo, y exportación a PDF/Excel respetando el filtro activo.
- **Funcionalidad:** Tiempo real en toda la app (Laravel Reverb): cualquier cambio de otra sesión se refleja solo, sin recargar, en prácticamente todos los módulos de negocio.
- **Seguridad:** Bloqueo progresivo de cuenta tras intentos fallidos de login, contraseñas seguras obligatorias, cambio forzado en el primer ingreso, correo de bienvenida con credenciales, y flujo completo de restablecimiento de contraseña por correo.
- **UI/UX:** Migración completa de formularios de página completa a modales, de `<select>` nativo a un Combobox propio buscable, y estandarización de colores, badges, íconos y alturas de fila en todas las tablas del sistema, con tema claro/oscuro consistente.
- **Rendimiento:** Portabilidad de búsquedas y agregaciones por fecha entre MySQL, PostgreSQL y SQLite (sensibilidad a mayúsculas/tildes, funciones de fecha) — el mismo código corre en desarrollo local (MySQL) y en producción (PostgreSQL en Render) sin ramas de código distintas.
- **Funcionalidad:** Despliegue containerizado (Docker) en Render, con la base de datos gestionada por Aiven.
