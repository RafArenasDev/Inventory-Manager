# QA y Pruebas

Evidencia de las rondas de pruebas del proyecto, en el mismo espíritu que `CHANGELOG.md`: una sección por
ronda, con fecha, qué se probó, qué se encontró y qué se corrigió. Este archivo se actualiza cada vez que se
corre una ronda de pruebas nueva — no es un reporte de una sola vez.

El plan completo de QA (seguridad → funcional → carga → manuales → contrato) sigue el roadmap acordado el
2026-09-08. El estado general:

- [x] **Desarrollo** — 13 módulos, auditoría, PWA, cumplimiento legal (cerrado en `v1.11.1`, ver `CHANGELOG.md`)
- [ ] **Pruebas y QA** — en curso
  - [x] Seguridad — Ronda 1 (2026-09-09): XSS, control de acceso, SQL crudo
  - [x] Seguridad — Ronda 2 (2026-09-09): CSRF, fuerza bruta, sesión, carga de archivos, exposición de info, DoS
  - [x] Funcional — Ronda 3 (2026-09-09): caja blanca completa
  - [x] Carga y estrés — Ronda 3 (2026-09-09): revisado a fondo el código; concurrencia real queda pendiente de un motor con locking de verdad (MySQL/Postgres, no SQLite) — ver abajo
  - [x] Caja negra — Ronda 4 (2026-09-09): 4 roles recorridos en el navegador real, 1 bug de integridad de datos encontrado y corregido
- [ ] **Manuales** (usuario + técnico)
- [ ] **Contrato**

## Cómo correr las pruebas

```bash
php artisan test              # toda la suite
php artisan test --filter=X   # un test o clase puntual
```

Corren contra SQLite en memoria (`phpunit.xml`), no contra la base de datos real — no hace falta nada instalado
aparte de PHP. Motor real del proyecto: PostgreSQL (`DB_CONNECTION` en `.env`).

---

## Ronda 1 — Seguridad (2026-09-09)

Primera pasada de la sección "Plan de pruebas de seguridad" del roadmap. Cada hallazgo se confirmó con una
petición HTTP real o una revisión de código línea por línea — no son afirmaciones sin verificar.

| Métrica | Antes | Después |
|---|---|---|
| Pruebas automatizadas corriendo | 0 / 31 (suite rota, ver abajo) | **31 / 31** |
| Vulnerabilidades reales confirmadas y corregidas | — | **2** |
| Hallazgos descartados tras verificación (falso positivo) | — | **1** |
| Bugs de portabilidad de base de datos corregidos | — | **2** |

### Bloqueante: la suite de pruebas no arrancaba

Antes de poder probar nada, ningún test corría — dos migraciones de datos usaban SQL exclusivo de PostgreSQL,
el motor real del proyecto, que no existe en el SQLite en memoria que usan las pruebas.

- **`ILIKE` es exclusivo de PostgreSQL** — la migración que precarga el cliente "Consumidor Final" (DIAN)
  buscaba el departamento Bogotá con `where('name', 'ilike', '%bogot%')`.
  → Corregido con `whereRaw('LOWER(name) LIKE ?', [...])`, portable entre MySQL/Postgres/SQLite.
  (`database/migrations/2026_09_08_212432_seed_dian_default_client.php`)
- **`NOW()` no existe en SQLite** — el backfill de `anonymized_at` en clientes usaba
  `COALESCE(updated_at, created_at, NOW())`.
  → Corregido con `CURRENT_TIMESTAMP` (estándar SQL, funciona igual en los tres motores).
  (`database/migrations/2026_09_08_230500_backfill_anonymized_at_on_clients_table.php`)

También se actualizaron 4 pruebas heredadas del scaffold de Laravel Breeze que ya no coincidían con decisiones
deliberadas de la app (contraseñas de 12+ caracteres con símbolo, cierre de sesión forzado tras cambiar la
contraseña, perfil que redirige al dashboard) — no eran bugs, eran pruebas desactualizadas.

### Hallazgos de seguridad

#### 1. XSS almacenado vía SweetAlert2 — **Alta** — ✅ Corregido en 15 archivos

Todo nombre de cliente, producto, categoría, proveedor, rol, usuario o archivo subido se interpolaba **sin
escapar** dentro del `html:` de SweetAlert2 en los diálogos de confirmación (`"Esta acción eliminará al cliente
<b>${clientName}</b>..."`). Como el campo `name` no tiene restricción de caracteres
(`'string', 'max:255'` en los Form Requests), un cliente creado con nombre `<img src=x onerror=...>` ejecuta ese
script en el navegador de quien intente eliminarlo — típicamente un administrador con más permisos que quien lo
creó.

- **Dónde:** `clientsTable`, `productsTable`, `categoriesTable`, `suppliersTable`, `rolesTable`, `usersTable`,
  `salesTable`, `purchaseOrdersTable`/`Form`/`index`, `productForm`, `inventory-import-dialog`, `status-toggle`
  (14 archivos `.tsx`) + `ProductController::destroy()` en el backend (mismo problema, vía mensaje flash).
- **Fix:** función `escapeHtml()` nueva en `resources/js/lib/utils.ts`, aplicada en los 14 sitios del frontend;
  `e()` de Laravel en el backend.

#### 2. Endpoints de venta sin control de acceso — **Crítica** — ✅ Corregido

`/sales/client-by-document` y `/sales/product-by-code` no tenían **ningún** middleware de permiso, a diferencia
de cada otra ruta del proyecto. Investigando por qué nunca se habían usado desde el frontend, apareció algo más
interesante: ninguna de las dos era alcanzable en absoluto — estaban registradas *después* de `sales/{sale}`, y
Laravel resuelve rutas en orden de registro, así que cualquier petición a `/sales/client-by-document` caía en
`SaleController@show` con `$sale = "client-by-document"`, no en el controlador esperado. Confirmado con una
petición simulada real, no solo lectura de código.

- **Dónde:** `routes/web.php`, grupo `sales`.
- **Fix:** las dos rutas se movieron al inicio del grupo (antes de `/{sale}`) y quedaron con
  `permission:Crear Ventas`.

#### 3. SQL crudo en Dashboard y `ClientController::history()` — Descartado, falso positivo

Se revisó línea por línea cada `DB::raw`, `whereRaw` y `selectRaw` de ambos controladores. En todos los casos lo
que se concatena es texto fijo elegido por el propio código según el motor de base de datos
(`DB::connection()->getDriverName()`) o literales hardcodeados — nunca un valor que venga del request. El único
punto donde entra un parámetro del usuario usa binding real (`whereRaw('stock <= COALESCE(low_stock_threshold,
?)', [...])`). No es explotable.

### Infraestructura de pruebas agregada

No existían factories para los modelos de negocio (solo `User`). Se agregaron las que hacían falta para esta
ronda, y quedan disponibles para las siguientes fases del roadmap:

| Archivo | Qué agrega |
|---|---|
| `database/factories/CategoryFactory.php` | Categorías de prueba |
| `database/factories/SupplierFactory.php` | Proveedores de prueba (NIT válido, contacto) |
| `database/factories/ClientFactory.php` | Clientes de prueba (documento, contacto) |
| `database/factories/ProductFactory.php` | Productos de prueba (con categoría/proveedor asociados) |
| `tests/Feature/Security/AccessControlTest.php` | 9 pruebas: invitados, permisos faltantes/correctos, los dos endpoints corregidos, el caso especial del Dashboard |
| `database/factories/UserFactory.php` (ajustada) | Usuarios de prueba activos y con Términos aceptados por default |

---

## Ronda 2 — Seguridad, cierre de la sección A (2026-09-09)

Las 6 categorías que quedaban pendientes de "Plan de pruebas de seguridad". Cierra la sección A completa del
roadmap: 10/10 categorías revisadas.

| Métrica | Resultado |
|---|---|
| Pruebas nuevas | **16** (CSRF, fuerza bruta, sesión, carga de archivos, exposición de info) |
| Pruebas totales del proyecto | 31 → **47**, todas en verde |
| Bugs reales encontrados y corregidos | **2** (uno de ellos solo alcanzable saltándose el frontend, nunca disparado en uso real) |
| Categorías confirmadas ya seguras, sin cambios de código | **4** (CSRF, fuerza bruta, sesión, carga de archivos) |

### CSRF — confirmado, con una salvedad de método

`bootstrap/app.php` nunca registra excepciones (`validateCsrfTokens(except: [...])` no se llama en ningún
lado) — cero rutas exentas. Lo que **no** se pudo probar con un test normal: "una petición sin token se
rechaza" — el propio middleware de Laravel (`VerifyCsrfToken::runningUnitTests()`) se autodesactiva bajo
PHPUnit a propósito, así que cualquier intento de simular esa petición pasa igual, sin importar qué app sea —
es comportamiento del framework, no un hueco de este proyecto. Se confirmó en cambio que una petición con el
token real de sesión funciona normal.

### Fuerza bruta / login — confirmado, funciona como está diseñado

`LoginRequest::registerFailedAttempt()` aplica cooldown creciente (1er/2do intento sin espera, 3er intento
60s, luego 5min, luego 15min) y bloqueo duro a los 10 intentos — que sobrevive el reinicio del cooldown y solo
se levanta restableciendo la contraseña. Las 4 pruebas nuevas ejecutaron intentos reales de principio a fin, sin
mockear nada, y confirman las tres etapas. (Nota aparte, ya documentada en el propio código: el sistema sí dice
explícitamente si un correo no existe o si la contraseña es incorrecta — decisión consciente para esta app
interna de usuarios conocidos, no un descuido.)

### Sesión — confirmado

El ID de sesión se regenera tanto al iniciar como al cerrar sesión (previene fijación de sesión), y cambiar la
contraseña propia cierra la sesión activa a propósito.

### Carga de archivos — confirmado, con 2 bugs reales encontrados y corregidos

La imagen de producto se valida por contenido real (`mimes:jpeg,png,jpg,gif`, que revisa el tipo detectado del
archivo, no la extensión que manda el cliente) y la carga masiva usa nombres server-generados (UUID) guardados
fuera del disco público — un archivo cargado nunca queda en una ruta ejecutable ni adivinable. La carga de CSV
no puede validarse por "firma" de contenido (a diferencia de una imagen, un CSV es texto plano sin cabecera
propia) pero se confirmó que un binario disfrazado de `.csv` nunca se cuela como fila válida.

Al escribir las pruebas de "crear producto sin imagen dañada" aparecieron dos bugs reales en
`ProductController::store()`/`update()`:

- **`Undefined array key`** al crear/editar un producto sin `description`, `iva_value` o
  `low_stock_threshold` en la petición — Laravel omite del array validado cualquier campo `nullable` que el
  cliente no mande, y el controlador los leía directo (`$validated['description']`) en vez de con `??`.
  → Corregido con acceso seguro (`?? null` / `?? 0` según lo que la columna real acepta).
- Confirmado que el formulario del frontend (`productForm.tsx`) siempre manda estos tres campos (aunque sea
  vacíos), así que este bug **nunca se disparó con el uso normal de la app** — solo era alcanzable llamando el
  endpoint directo, como hace un test. No hay nada que un usuario real haya visto romperse.

### Exposición de información — 1 hallazgo real, corregido

- Con `APP_DEBUG` apagado (el estado real de producción), un error nunca muestra ruta de archivos ni traza
  técnica — confirmado con una petición real.
- **Hallazgo:** `.env.example` (la plantilla para un despliegue nuevo) traía `APP_DEBUG=true` junto con
  `APP_ENV=production` — si alguien copia esa plantilla sin cambiarlo a mano, cada error de producción
  mostraría la traza completa (rutas del servidor, variables de entorno) a cualquier visitante.
  → Corregido: `APP_DEBUG=false` en la plantilla.

### Denegación de servicio — revisado, sin pruebas automatizadas (prioridad baja del roadmap)

Los límites ya existen a nivel de aplicación: 50 filas máximo por carga masiva
(`InventoryImportService::MAX_ROWS`), 5MB máximo por archivo de importación, 2MB máximo por imagen. Un ataque
de denegación de servicio distribuido real es responsabilidad del proveedor de hosting, no de la aplicación —
consistente con lo que ya decía el roadmap original.

### Sección A del roadmap — cerrada

Las 10 categorías del plan de seguridad quedaron revisadas entre la Ronda 1 y la Ronda 2. Quedan en el
roadmap como referencia, no como pendiente.

---

## Ronda 3 — Funcional (caja blanca) y carga (2026-09-09)

Secciones B y C del roadmap. Caja blanca completa con pruebas reales; caja negra queda documentada como
checklist (necesita uso real del sistema, no algo que se automatice solo); carga/estrés se revisó a fondo por
código, con la concurrencia real de verdad pendiente de un motor con locking real (MySQL o Postgres — la
siguiente fase, contra el backup del negocio de tu tío, es exactamente donde eso se termina de confirmar).

| Métrica | Resultado |
|---|---|
| Pruebas nuevas (caja blanca: ventas + movimientos de inventario) | **16** |
| Pruebas totales del proyecto | 47 → **63**, todas en verde |
| Vulnerabilidades XSS nuevas encontradas y corregidas (mismo patrón de la Ronda 1, en sitios que no se habían revisado) | **2** |
| Hueco de manejo de carrera encontrado y corregido | **1** (Roles) |

### Barrido adicional de XSS — 2 sitios más

Al tocar `RoleController` para otra cosa, apareció el mismo patrón de la Ronda 1 (nombre de un registro
interpolado sin escapar en un mensaje `<b>...</b>` que se renderiza como HTML real vía
`flash-error-watcher.tsx`) en dos sitios que el grep de la Ronda 1 no cubrió, porque buscaba variables
`->name` específicamente y estos usan otro atributo o quedaron fuera del patrón exacto:

- `CategoryController::destroy()` — `$category->name` sin escapar.
- `RoleController::destroy()` — `$role->label` sin escapar.

→ Corregidos con `e()`, mismo tratamiento que en la Ronda 1. Con esto, un grep de `<b>` en todo
`app/Http/Controllers` ya no encuentra ningún caso sin `e()`.

### Hueco de manejo de carrera en Roles — corregido

Usuarios, Clientes, Productos y Proveedores ya atrapan el `QueryException` de "nombre duplicado" que puede
pasar cuando dos altas casi simultáneas superan la validación antes de que cualquiera exista todavía, y
muestran un mensaje claro en vez de un error 500. `RoleController::store()`/`update()` no lo tenía, a pesar de
que `RoleRequest` sí valida `name` como único. Corregido con el mismo patrón (`isUniqueViolation()`, que ya
distingue Postgres `23505` de MySQL `1062` — la misma lógica multi-motor que ya usan los otros cuatro
controladores).

No se pudo escribir una prueba automatizada que reproduzca la carrera en sí (necesita dos conexiones de verdad
compitiendo por la misma fila, algo que un test de PHPUnit de un solo proceso no puede simular de forma
honesta) — el fix se aplicó por consistencia con el patrón ya probado en los otros cuatro controladores, no
por un test que lo demuestre.

### Caja blanca — 16 pruebas nuevas sobre dinero, inventario y auditoría

**Ventas** (`tests/Feature/Business/SaleBusinessLogicTest.php`, 8 pruebas):
- El total se calcula siempre server-side desde `Product::sale_price` real (nunca del precio que mande el
  cliente).
- El descuento porcentual se aplica correctamente.
- El stock se descuenta y queda un movimiento de tipo "Salida".
- No se puede vender más de lo que hay en stock.
- El límite DIAN de "Consumidor Final" (5 UVT = $261.870 con la UVT vigente de 2026) se respeta — rechaza por
  encima, permite por debajo.
- Anular una venta restaura el stock exacto y elimina la transacción de Finanzas asociada.
- No se puede registrar una venta sin la caja del día abierta.

**Movimientos de Inventario** (`tests/Feature/Business/InventoryMovementBusinessLogicTest.php`, 8 pruebas):
- Entrada suma, Salida resta, y Salida nunca deja el stock en negativo.
- "Ajuste Inventario" fija el stock al conteo físico real (no es un delta con signo) — probado subiendo,
  probado con conteo en 0.
- Un ajuste manual queda auditado con el stock antes/después.
- Un movimiento con fecha futura se rechaza.
- El proveedor del movimiento siempre sale del producto, nunca de lo que mande el request (aunque se intente
  mandar uno distinto a mano).

### Carga y estrés — revisado por código, concurrencia real pendiente del motor correcto

Los 4 escenarios del roadmap, uno por uno:

1. **Ventas simultáneas** — revisado el código (`Sale::generateInvoiceNumber()` y el `lockForUpdate()` sobre
   cada producto en `SaleController::store()`), **no confirmado con concurrencia real**. Hipótesis concreta a
   verificar en la fase de MySQL: `generateInvoiceNumber()` hace
   `Sale::orderBy('id','desc')->lockForUpdate()->first()` para calcular el siguiente número — bloquea la
   fila de la ÚLTIMA venta existente, pero esa fila nunca cambia (la venta nueva es un INSERT, no un UPDATE
   sobre ella). Si dos transacciones concurrentes bloquean la misma fila "última" ANTES de que cualquiera
   inserte, la segunda —al desbloquearse— podría seguir leyendo el mismo número de factura que ya usó la
   primera. La tabla sí tiene `invoice_number` con índice único (así que un duplicado real terminaría en un
   error de la base de datos, no en dos facturas con el mismo número silenciosamente), pero conviene
   confirmar con tráfico concurrente real si ese error se maneja con un mensaje claro o revienta feo. El
   stock sí queda protegido con `lockForUpdate()` fila por fila — ese mecanismo es más robusto porque el lock
   cae sobre la fila que sí se actualiza (`Product`), no sobre una fila ajena.
2. **Registros duplicados** — mecanismo de protección revisado y confirmado en Ronda 3 arriba
   (`isUniqueViolation()` en los 5 controladores con campos únicos). Falta el mismo tráfico concurrente real
   para confirmarlo en vivo.
3. **Carga sostenida sobre reportes** — no probado. Necesita un volumen de datos real (el backup del negocio
   de tu tío es una oportunidad natural para esto: es data real, no sintética).
4. **Conexiones de tiempo real (Reverb) simultáneas** — no probado, necesita un servidor Reverb corriendo y
   varios clientes WebSocket reales; fuera del alcance de una prueba automatizada de PHPUnit.

**Por qué no se probó con concurrencia real acá:** SQLite (el motor de las pruebas automatizadas de este
proyecto) no tiene locking a nivel de fila de verdad — bloquea la base de datos completa al escribir, lo que
en la práctica "esconde" cualquier condición de carrera en vez de reproducirla fielmente. Probar esto de
verdad necesita el motor real (MySQL o Postgres) con conexiones concurrentes genuinas — exactamente lo que va
a estar disponible en la siguiente fase, con el backup del negocio de tu tío corriendo en MySQL.

### Caja negra — checklist para uso real

Esto no se puede automatizar por definición (el roadmap mismo lo dice: "aceptación con el dueño real del
negocio"). Checklist por rol, para marcar mientras se recorre el sistema de verdad:

**Administrador**
- [ ] Crear/editar/eliminar un rol y ver que los permisos se apliquen de inmediato a un usuario con ese rol.
- [ ] Abrir la caja del día, cerrarla, ver que el resumen cuadre con las ventas reales del día.
- [ ] Ver el historial de auditoría y confirmar que una acción recién hecha aparece con el detalle correcto.

**Vendedor**
- [ ] Crear una venta completa: cliente nuevo (quick-create), varios productos, descuento, forma de pago.
- [ ] Vender el último producto en stock y confirmar que no se puede vender uno más.
- [ ] Anular una venta ya facturada y confirmar que el stock vuelve y la factura deja de estar disponible.
- [ ] Crear un cliente con datos incompletos y confirmar que el formulario pide lo que falta con mensajes
      claros (no técnicos).

**Cajero**
- [x] ~~Abrir caja, registrar un ingreso/gasto manual en Finanzas, cerrar caja al final del turno.~~ Corregido
      en Ronda 4: abrir/cerrar caja es solo del Administrador por diseño (ver `RoleSeeder`) — el Cajero solo
      consulta. Confirmado en el navegador: no hay botón de abrir/cerrar caja visible con este rol.
- [ ] Intentar registrar una venta sin la caja abierta y confirmar el mensaje.

**Bodega**
- [x] Registrar una entrada de mercancía — confirmado en el navegador (Ronda 4): proveedor autocompletado
      del producto, stock actualizado.
- [ ] Registrar un ajuste de inventario (conteo físico) por diferencia.
- [ ] Recibir un pedido a un proveedor y confirmar que el stock sube y el pedido se marca como recibido.
- [ ] Cargar un Excel de productos/movimientos en bloque y revisar el preview antes de confirmar.

**Todos los roles**
- [x] Intentar llegar a una pantalla de un módulo sin permiso escribiendo la URL directo — confirmado en el
      navegador (Ronda 4): Vendedor → `/roles` da 403 real, no solo esconde el botón.

---

## Ronda 4 — Caja negra real en el navegador (2026-09-09)

Con Claude in Chrome (sin instalar nada) sobre el entorno local ya corriendo, usando las cuentas de prueba ya
sembradas por `UserSeeder` (admin, vendedor, cajero, bodega). Esto es lo que caja blanca no puede atrapar: no
prueba lógica interna, prueba lo que de verdad se renderiza y lo que un humano haría sin pensarlo dos veces.

| Métrica | Resultado |
|---|---|
| Roles recorridos con una cuenta real | **4** (Administrador, Vendedor, Cajero, Bodega) |
| Flujos completos verificados de punta a punta en el navegador | **4** (venta, movimiento de inventario, rol duplicado, control de acceso) |
| Vulnerabilidad de integridad de datos encontrada y corregida | **1** (label de Rol duplicado) |
| Hallazgo menor de UX documentado (no corregido aún) | **1** (página 403 sin estilo) |

### Hallazgo real: dos roles podían tener el mismo nombre visible

Probando el formulario de "Nuevo Rol" a mano — exactamente lo que haría un administrador real — crear un rol
escribiendo "Bodega" (ya existente) se aceptó sin ningún aviso. Quedaron dos filas idénticas en la tabla de
Roles y Permisos, indistinguibles para un humano.

**Causa real:** `roleForm.tsx` genera el campo técnico `name` (el único que sí validaba unicidad) a partir del
`label` que el usuario escribe, en minúsculas y con guiones — pero el usuario nunca ve ni edita `name`
directamente. Escribir el mismo `label` dos veces genera casi siempre un `name` distinto si el label ya
existía con otro `name` técnico (ej. el rol sembrado "Bodega" tiene `name` interno `warehouse`, no `bodega`),
así que la regla de unicidad sobre `name` nunca se activaba. Ni caja blanca lo había atrapado: el test de
"rol duplicado" de la Ronda 3 probaba con el mismo `name` técnico, no con el mismo `label` visible — el
escenario exacto que un humano reproduce sin pensarlo.

- **Fix:** `RoleRequest` ahora valida también `label` como único (`app/Http/Requests/RoleRequest.php`).
  Verificado dos veces en el navegador: falló antes del fix (creó el duplicado), no dejó crear después.
- Prueba de regresión agregada: `tests/Feature/Business/RoleLabelUniquenessTest.php`.

### Confirmado en el navegador, sin cambios de código

- **Venta completa como Vendedor:** cliente "Consumidor Final" por documento, producto por código, venta
  creada (factura A-000004), Dashboard/reportes actualizados al instante con el monto real.
- **Auditoría como Administrador:** las acciones que acabo de hacer (crear/eliminar el rol de prueba)
  aparecen en el log con usuario, fecha/hora y registro afectado correctos.
- **Menú por rol:** Vendedor, Cajero y Bodega ven solo los módulos que su rol permite — nada de items
  ocultos-pero-accesibles.
- **Movimiento de inventario como Bodega:** entrada registrada, proveedor autocompletado del producto (no
  editable a mano), stock actualizado.
- **Control de acceso:** Vendedor navegando directo a `/roles` (URL escrita a mano, sin pasar por el menú)
  recibe un 403 real del servidor.

### Hallazgo menor, sin corregir: página de error 403 sin estilo

El 403 de arriba se ve como texto plano en inglés ("403 | USER DOES NOT HAVE THE RIGHT PERMISSIONS.") sin
nada del diseño de la app — no hay `resources/views/errors/` en el proyecto, así que cae al render por
defecto de Laravel. No es un problema de seguridad (el bloqueo sí funciona), es una mala primera impresión si
un empleado real llega ahí por accidente. Queda para una ronda futura — es trabajo de diseño de una página,
no una corrección de una línea.
