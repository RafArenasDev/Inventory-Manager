# Changelog

Formato: una sección por versión (`## vX.Y.Z - YYYY-MM-DD`), un resumen corto,
y una lista de viñetas con el detalle de qué cambió — cada viñeta puede
empezar con `**Categoría:**` (Nueva función, Seguridad, Auditoría,
Validación, Legal, Velocidad, Exportación, Diseño, Corrección) para
agruparse visualmente en el modal de "Novedades"; una viñeta sin categoría
se muestra igual, sin agrupar. Este historial está escrito para quien usa el
software día a día, no para desarrolladores — sin jerga técnica, explicando
qué cambia para el usuario. El detalle técnico de cada versión vive en el
historial de Git. Generado a mano hasta `v1.10.1`; desde `v1.11.0` se
actualiza junto con cada tag nuevo. El modal de "Novedades" del sidebar y el
badge de versión se generan de este archivo en build time — ver
`scripts/generate-changelog.mjs`.

## v1.12.0 - 2026-09-09

Arranca la fase de pruebas del proyecto (ver [`QA.md`](./QA.md)): se revisó a fondo la seguridad del sistema y se corrigieron dos fallas reales antes de que llegaran a afectar a nadie.

- **Seguridad:** Se corrigió una falla que habría permitido que el nombre de un cliente, producto, proveedor, categoría, rol o usuario, si contenía código malicioso, se ejecutara en el navegador de quien viera el mensaje de confirmación al eliminarlo o desactivarlo.
- **Seguridad:** Se cerró un acceso interno del módulo de Ventas que no tenía el mismo control de permisos que el resto del sistema.
- **Corrección:** Se solucionó una inconsistencia técnica en dos datos precargados del sistema (cliente genérico DIAN, marcado de clientes eliminados) que solo afectaba al entorno interno de pruebas, sin ningún impacto para el uso real del negocio.

## v1.11.1 - 2026-09-08

La app ya se puede instalar como una aplicación, quedó con su licencia definida por escrito, la documentación del proyecto se puso al día, y la pantalla de Novedades se ve mucho más clara.

- **Nueva función:** El sistema ya se puede instalar como una aplicación en el celular o el computador (Android, Windows, Mac, iPhone), con ícono propio, e incluso sigue mostrando la pantalla un instante si se corta el internet.
- **Legal:** Se dejó por escrito el tipo de licencia del software (uso gratuito autorizado por el desarrollador) y qué pasaría si en algún momento se decide cobrar por su uso. Al haber cambiado el texto legal, todos los usuarios deberán volver a aceptar los Términos y Condiciones la próxima vez que ingresen.
- **Diseño:** Se actualizó toda la documentación del proyecto con la información real y correcta del software (antes tenía datos de una plantilla genérica que ya no aplicaban).
- **Diseño:** La pantalla de "Novedades" se rediseñó para mostrar el detalle completo de una versión a la vez, elegible desde un menú desplegable, con tarjetas más claras y ordenadas por tipo de cambio.
- **Nueva función:** Se completó el historial de todas las versiones desde la primera, para que quede un registro claro de todo lo que se ha construido desde el inicio del proyecto.
- **Corrección:** La tarjeta de "Ventas" del resumen del Dashboard mostraba un conteo de ventas en vez del período seleccionado (Diario, Semanal, etc.), como sí lo hacen las demás tarjetas.
- **Corrección:** La página de Caja aparecía titulada en plural ("Cajas") cuando debía decir "Caja".
- **Corrección:** Una venta anulada todavía dejaba ver e imprimir su factura — ahora, igual que un cliente eliminado, no muestra ninguna acción disponible.
- **Corrección:** La ficha de un producto mostraba la palabra "Saludable" para indicar stock óptimo, en vez de "Óptimo" como en el resto del sistema.

## v1.11.0 - 2026-09-08

El sistema ahora registra todo lo que pasa en la cuenta de cada usuario, un cliente eliminado queda completamente protegido, aceptar los Términos y Condiciones es obligatorio al entrar, y los dos límites de la DIAN quedaron activos con las cifras vigentes de 2026.

- **Auditoría:** Ahora quedan registrados el inicio y cierre de sesión (exitoso o fallido), los cambios de contraseña, las actualizaciones del perfil propio, y el restablecimiento de contraseña por correo — con el detalle completo de cada evento.
- **Auditoría:** Cuando se cambian los roles de un usuario o los permisos de un rol, también queda registrado exactamente qué se agregó y qué se quitó.
- **Auditoría:** Cuando se cargan productos o movimientos en bloque desde Excel, ahora queda un registro de esa carga con el total de productos creados y movimientos ingresados.
- **Seguridad:** Un cliente cuyos datos fueron eliminados queda completamente protegido: no se puede editar, eliminar, reactivar, ni consultar su información nunca más, sin ninguna excepción.
- **Diseño:** La tabla de Clientes ya no muestra ningún dato de un cliente eliminado, ni siquiera su documento — solo aparece "Cliente Anonimizado" y guiones, sin ningún botón de acción disponible sobre esa fila.
- **Legal:** Los Términos y Condiciones se reescribieron por completo, explicando con claridad qué hace y qué no hace el software, cómo se manejan los datos personales, y los límites de responsabilidad.
- **Nueva función:** Aceptar los Términos y Condiciones pasó a ser obligatorio justo después de iniciar sesión, con tres casillas de confirmación que solo se pueden marcar después de leer el texto completo. Si alguien los rechaza, la sesión se cierra automáticamente.
- **Legal:** Si en el futuro se actualiza el contenido legal, todos los usuarios deberán volver a aceptarlo en su siguiente ingreso, sin importar desde qué dispositivo entren.
- **Legal:** Se definió por escrito que el software es de uso gratuito autorizado por el desarrollador, y qué pasaría si en algún momento se decide cobrar por su uso.
- **Nueva función:** Se activó el límite de venta al cliente "Consumidor Final" con la cifra vigente de la DIAN para 2026: $261.870. Este valor se actualiza automáticamente cada año sin necesidad de modificar el sistema.
- **Nueva función:** Se activó un aviso en el Dashboard que alerta cuando las ventas del año se acercan o superan el monto que obliga a facturar electrónicamente ante la DIAN ($183.309.000 con la cifra vigente de 2026).
- **Corrección:** El año que aparecía en los correos del sistema estaba desactualizado.
- **Nueva función:** Se organizó el historial de versiones del software para que sea fácil consultar qué cambió en cada actualización, tanto desde el pie de la barra lateral como desde la pantalla de "Novedades".
- **Nueva función:** El sistema ya se puede instalar como una aplicación en el celular o el computador, y sigue funcionando un instante aunque se pierda la conexión a internet.

## v1.10.1 - 2026-09-08

Se amplió el registro de auditoría a más partes del sistema y se corrigió una falla real que podía duplicar el número de una factura.

- **Auditoría:** Ahora prácticamente cualquier creación, edición o eliminación en Ventas, Clientes, Productos, Categorías, Proveedores, Pedidos, Usuarios, Roles, Caja, Finanzas y Movimientos de Inventario queda registrada automáticamente.
- **Corrección:** Se encontró y corrigió una falla real: si dos ventas se registraban casi al mismo instante, podían terminar con el mismo número de factura. Ahora eso no puede volver a pasar.
- **Seguridad:** Si dos personas intentan crear el mismo cliente, producto, proveedor, categoría o usuario al mismo tiempo, el sistema ahora avisa con un mensaje claro en vez de mostrar un error confuso.
- **Nueva función:** Se dejó preparado (pero sin activar todavía) el límite de venta al cliente "Consumidor Final" exigido por la DIAN.

## v1.10.0 - 2026-09-08

Primer paquete de avisos legales para Colombia, y llega el nuevo módulo de Auditoría.

- **Legal:** Se agregaron un aviso de cookies, un aviso de monitoreo laboral en el inicio de sesión, y una ventana de Términos y Condiciones.
- **Legal:** Se agregó un aviso sobre el tratamiento de datos personales, visible al crear un cliente nuevo.
- **Nueva función:** Se agregó un botón para eliminar los datos personales de un cliente sin borrar su historial de compras.
- **Auditoría:** Se construyó el nuevo módulo de Auditoría, con el mismo tipo de filtros y paginación que el resto del sistema, cubriendo inicialmente anulación de venta, eliminación de datos de un cliente, y ajustes manuales de inventario.

## v1.9.3 - 2026-09-08

Alineación de las columnas de dinero en toda la app.

- **Diseño:** El símbolo "$" quedó fijo a la izquierda y las cifras alineadas a la derecha en todas las tablas, fichas de detalle, la factura, y las exportaciones a Excel.

## v1.9.2 - 2026-09-08

Corrección de la identidad del negocio en la factura.

- **Corrección:** El título de la ventana de factura ya no muestra un símbolo suelto.
- **Corrección:** Se reemplazó el nombre de negocio de ejemplo por el nombre real del sistema en toda la app.

## v1.9.1 - 2026-09-08

Revisión del Dashboard y las exportaciones, con dos fallas reales corregidas.

- **Corrección:** El descuento por porcentaje mostraba el valor en pesos calculado en vez del porcentaje que se había ingresado.
- **Exportación:** Se agregó el botón de exportar a Excel que faltaba en Productos.
- **Velocidad:** Se limpió código que ya no se usaba en el Dashboard.

## v1.9.0 - 2026-09-08

Cierre del módulo de Finanzas.

- **Validación:** Se reforzó la validación del formulario de Finanzas y se protegió contra ediciones que podían afectar el registro de auditoría.

## v1.8.0 - 2026-09-08

Cierre del módulo de Caja.

- **Corrección:** Se corrigieron fallas reales que podían afectar el inicio de sesión y mostrar totales incorrectos si dos personas intentaban cerrar la caja al mismo tiempo.

## v1.7.1 - 2026-09-08

Consistencia visual y validación de proveedores.

- **Diseño:** Se corrigió una inconsistencia de color entre ventanas emergentes.
- **Validación:** La dirección del proveedor pasó a ser obligatoria.

## v1.7.0 - 2026-09-08

Cierre del módulo de Clientes.

- **Validación:** Los datos de contacto completos pasaron a ser obligatorios.
- **Nueva función:** Se agregó un cliente por defecto ("Consumidor Final") para ventas sin datos del comprador.
- **Corrección:** Se corrigió una falla en la creación rápida de un cliente.

## v1.6.0 - 2026-09-08

Cierre del módulo de Ventas.

- **Seguridad:** El precio y el stock de una venta ahora se calculan siempre desde el sistema, no desde lo que envía el navegador de quien vende.
- **Validación:** El cliente pasó a ser obligatorio en toda venta.
- **Corrección:** Se corrigió cómo se mostraba el precio de cada producto dentro de una venta.

## v1.5.1 - 2026-09-08

Corrección de validación y de la apariencia de los formularios.

- **Corrección:** Se corrigió un salto visual que ocurría al validar un formulario.
- **Validación:** Se revisaron las ventanas de contraseña, perfil, y el formulario de productos.

## v1.5.0 - 2026-09-08

Revisión del módulo de Proveedores.

- **Validación:** Se reforzó el formulario de Proveedores, y el dígito de verificación del NIT ahora se calcula solo (evita errores al digitarlo a mano).

## v1.4.0 - 2026-09-07

Revisión de Productos, Movimientos de Inventario y Pedidos.

- **Validación:** Las cantidades ya nunca pueden quedar en negativo, y se reforzaron las validaciones en los tres módulos.
- **Nueva función:** El envío de WhatsApp y de correo ahora pide confirmación en vez de enviarse solo.
- **Corrección:** Se corrigieron detalles visuales menores en los formularios de estos módulos.

## v1.3.3 - 2026-09-07

Corrección de errores al subir la imagen de un producto.

- **Corrección:** El mensaje de error al subir una imagen ahora es más claro.

## v1.3.2 - 2026-09-07

Rediseño de la carga masiva de Productos.

- **Nueva función:** La carga masiva de Productos ahora solo crea productos nuevos (separada de Movimientos de Inventario), con una interfaz de arrastrar y soltar el archivo, y una guía de qué va en cada columna.

## v1.3.1 - 2026-09-07

Mejoras menores al módulo de Productos.

- **Diseño:** Se simplificó la ficha de un producto y se agregó una guía para la carga masiva.

## v1.3.0 - 2026-09-07

Cierre del módulo de Categorías.

- **Validación:** Se simplificó la validación al crear o editar una categoría, y el mensaje al eliminarla es más claro.

## v1.2.0 - 2026-09-07

Cierre del módulo de Roles.

- **Validación:** Se protegió el rol de Administrador para que no se pueda editar mal ni dejar a un usuario sin ningún rol asignado.
- **Diseño:** El nombre del registro aparece resaltado en los mensajes de confirmación antes de eliminar algo, en toda la app.

## v1.1.1 - 2026-09-07

Corrección en el módulo de Usuarios.

- **Corrección:** Se corrigió una falla al eliminar un usuario que, en ciertos casos, podía dejarlo en un estado inconsistente.

## v1.1.0 - 2026-09-07

Cierre del módulo de Usuarios.

- **Validación:** Se completó la validación del formulario de Usuarios.
- **Seguridad:** Un usuario ya no puede desactivar ni eliminar su propia cuenta.

## v1.0.0 - 2026-09-07

Primera versión completa del sistema — resultado de más de un año de trabajo (el desarrollo empezó el 1 de junio de 2025). Con esta versión, el negocio ya puede vender, cobrar, controlar el inventario y reabastecerse sin salir de la aplicación.

- **Nueva función:** Quedaron listos los 11 módulos principales: Usuarios, Roles y Permisos, Categorías, Productos, Proveedores, Clientes, Ventas, Movimientos de Inventario, Pedidos a proveedores, Caja, y el Dashboard.
- **Nueva función:** Se agregó la carga masiva de productos y movimientos de inventario desde un archivo de Excel, con una vista previa antes de confirmar.
- **Nueva función:** El Dashboard incluye gráficas de ventas y categorías, accesos rápidos a cada módulo, y exportación a PDF y Excel.
- **Nueva función:** Se agregó actualización en tiempo real: si otra persona hace un cambio en el sistema, se refleja solo en la pantalla, sin necesidad de recargar.
- **Seguridad:** Se agregó bloqueo progresivo de la cuenta tras varios intentos fallidos de inicio de sesión, exigencia de contraseñas seguras, cambio obligatorio de contraseña en el primer ingreso, correo de bienvenida, y recuperación de contraseña por correo.
- **Diseño:** Se estandarizaron colores, íconos y estilos en todas las tablas del sistema, con un tema claro y oscuro consistente en toda la app.
