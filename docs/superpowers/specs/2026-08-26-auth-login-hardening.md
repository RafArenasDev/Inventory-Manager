# Sesión 2026-08-26 (noche) — login, seguridad y branding de correos

## Contexto de arranque

La sesión retomó el trabajo de sincronización en tiempo real (Reverb) que
había quedado a medias en `2026-08-25-realtime-sync-design.md` — el fix de
`DB::afterCommit()` ya estaba aplicado, se completó el rollout a los 12
módulos de negocio y se verificó en vivo (ver commits `2896ab4` y
`2e4d337`). A partir de ahí, la noche se centró casi por completo en
login/seguridad/contraseñas a pedido del usuario ("vamos a pulir toda la
parte del login").

## Hecho y commiteado (main, hasta `2184b0a`)

**UI/UX (commit `2896ab4`, `ce9b9ba`):**
- Label de rol correcto en el header (antes mostraba el `name` técnico para
  cualquier rol que no fuera admin/seller).
- Botón "Nueva Venta" del Dashboard ahora respeta el permiso `Crear Ventas`
  (antes lo veía cualquier rol, incluido auditor).
- Divisor de la sidebar alineado en píxeles exactos con el del header
  principal (medido con `getBoundingClientRect()`).
- Barras de búsqueda: las de Ventas/Finanzas/Pedidos/Caja/Movimientos
  quedaban más angostas por compartir el ancho máximo con el filtro de
  período — desacopladas, las 11 miden 512px parejo (medido en el
  navegador, no a ojo).

**Tiempo real (commit `2e4d337`):** rollout completo del patrón
`BroadcastsModelChanges` a Productos, Categorías, Proveedores, Movimientos,
Ventas, Clientes, Transacciones y Caja — ver el spec anterior para el
diseño completo.

**Seguridad de sesión (commit `2896ab4`, `8b95049`):**
- Middleware `active`: si un usuario queda `is_active = false` mientras
  tiene sesión abierta, la próxima request lo desloguea y lo manda a
  `/login` con aviso genérico ("Lo sentimos, tuvimos un inconveniente con tu
  sesión...") — sin revelar el motivo. Un watcher en tiempo real (canal
  `admin`) fuerza el reload apenas pasa, sin esperar a que el usuario
  navegue.
- Bloqueo progresivo por intentos fallidos, con contador persistente en BD
  (`users.failed_login_attempts`, `users.security_locked_at` — migración
  editada en `0001_01_01_000000_create_users_table.php`, no una nueva):
  intentos 3-4 → espera 1 min, 5-7 → 5 min, 8-9 → 15 min, intento 10 →
  bloqueo duro (ni con la contraseña correcta entra) hasta restablecer por
  correo. Probado en vivo los 3 escalones + el bloqueo duro con contraseña
  correcta rechazada.
- Throttle adicional por IP (`throttle:20,1` en login, `throttle:10,1` en
  forgot-password) contra rotación de cuentas desde un mismo origen.
- Validaciones de login específicas por campo (email no registrado, cuenta
  inactiva, contraseña incorrecta — cada una en su input) en vez del
  mensaje ambiguo por defecto de Laravel.
- **Causa raíz real encontrada:** el proyecto nunca tuvo publicados los
  archivos de idioma de Laravel — cualquier validación por defecto sin
  `messages()` propio mostraba la clave cruda (`validation.required`) en
  vez de texto legible. Se publicaron `lang/es/validation.php`, `auth.php`
  y `passwords.php`, cubriendo TODOS los formularios de la app, no solo
  login.
- Quitado `required` + agregado `noValidate` en los formularios de auth —
  el navegador interceptaba con su propia burbuja nativa antes de que
  corriera la validación de la app.

**Contraseñas (commit `a2bb3ef`, `508c2a9`):**
- Ícono de mostrar/ocultar (`PasswordInput` reutilizable) en los 9 campos
  de contraseña de la app.
- Botón "Generar contraseña" (util compartido `lib/generate-password.ts`)
  en el modal de perfil y en el de cambio forzado, además del que ya tenía
  el formulario de usuarios del admin.
- `ProfileController::update()` redirigía a la vista estática vieja de
  Breeze (`settings/profile`) — ahora va a `dashboard`, que es como
  realmente navega esta app (el modal se abre desde el menú global, no hay
  una página de "ajustes" real en el flujo).
- `PasswordController::update()` (cambiar contraseña sabiendo la actual)
  ahora cierra sesión y redirige a login con aviso de éxito — antes hacía
  `back()` y no quedaba claro qué pasaba.

**Branding de correos (commit `2184b0a`):** el header de los correos de
reset-password y bienvenida usaba `config('business.name')` ("NovaTech
Store", el negocio ficticio de las facturas/WhatsApp) mientras el pie de
página ya decía `config('app.name')` — inconsistente dentro del mismo
correo. Unificado a `config('app.name')` en el encabezado también.

## Sin commitear todavía (working tree — el usuario pidió NO commitear/pushear esta noche)

Archivos modificados, pendientes de revisión y commit cuando el usuario lo
indique:

- `.env` / `.env.example` — nueva `APP_LOGO` (ruta pública al logo de los
  correos, configurable por instancia/negocio) y **fix de `APP_URL`**, que
  seguía apuntando al dominio viejo `inventory-pos.test` (arrastrado desde
  antes del rename) en vez de `inventory-manager.test`. Esto afectaba
  cualquier URL absoluta generada fuera de una request de navegador.
- `config/app.php` — nueva clave `'logo'` leída de `APP_LOGO`.
- `resources/views/emails/password_reset.blade.php` y `welcome_user.blade.php`
  — el logo ahora se incrusta como adjunto (`$message->embed(...)`, `cid:`)
  en vez de enlazarse por URL externa. Un logo por URL a un dominio
  `.test` local nunca iba a cargar en Gmail (confirmado con captura del
  usuario: salía el ícono de imagen rota). Con `embed()` se ve sin
  depender de que el dominio sea público.
- `app/Http/Controllers/Auth/PasswordResetLinkController.php` — mensaje
  distinto para `Password::RESET_THROTTLED` ("ya enviamos un enlace hace
  poco, espera un minuto") en vez del genérico "verifica que el correo sea
  correcto", que sonaba a que el correo estaba mal escrito.
- `app/Http/Controllers/Auth/NewPasswordController.php` — el texto de
  éxito no contenía la palabra que el login busca (`"Contraseña
  restablecida"`), así que cuando alguien restablecía su contraseña por
  el enlace de correo, el login mostraba el SweetAlert genérico
  ("¡Link enviado exitosamente!") en vez del de éxito real. Corregido el
  texto para que coincida.
- `resources/js/pages/auth/login.tsx` — los dos mensajes de éxito de
  contraseña ("restablecida" por correo vs. "actualizada" desde el
  perfil) ahora son semánticamente distintos a propósito (uno es
  "no la sabías, la recuperaste"; el otro es "la sabías y la cambiaste") y
  ambos se cierran solos con timer (antes uno pedía clic en "Continuar").
- `resources/js/pages/auth/reset-password.tsx` — agregado el botón
  "Generar contraseña" + el texto de requisitos, igual que los demás
  formularios de contraseña.

## Verificado esta noche (código estático + navegador, sin tinker con side-effects)

- Los 3 escalones de espera progresiva + el bloqueo duro (10º intento),
  probados en vivo con `seller@seller.com`, luego restaurado a estado
  limpio.
- Las 5 combinaciones de validación de login (contraseña vacía, email
  inválido, email no registrado, cuenta inactiva, contraseña incorrecta) —
  cada una con su mensaje correcto en el campo correcto.
- Reglas reales de `Password::defaults()` (12 caracteres, mayúsculas,
  minúsculas, número, símbolo) confirmadas con `Validator::make()` puro —
  sin persistir nada, sin enviar correos.
- Envío real del enlace de recuperación a `rafarenas.dev@gmail.com` (SMTP
  Gmail, síncrono, sin cola) — confirmado que el correo llega, con logo
  (ahora incrustado) y nombre de la app correctos.

## Cierre de CI (más tarde en la misma noche)

`git push` empezó a llegar con dos correos de GitHub Actions fallando
(`tests` y `linter`). Diagnosticado con logs reales, no adivinado:

- **`linter` (job `quality`)**: `npm run lint` tenía 2 errores reales de
  ESLint preexistentes, sin relación con los cambios de la noche —
  `children` sin usar en `combobox.tsx` (destructuring intencional para
  excluirlo del spread) y un import muerto de `axios` en `salesTable.tsx`.
  Arreglados los dos. De paso se corrió `npm run format` + `pint` sobre
  **todo** el proyecto por primera vez (113 archivos, commit de estilo
  separado, sin cambios de comportamiento — verificado con `tsc`/`build`).
- **`tests` (job `ci`)**: corría `phpunit` en cada push sin ningún
  servicio de base de datos (ni MySQL ni Postgres) — fallaba siempre por
  eso, no por diferencias de motor. Pasado a `workflow_dispatch` (disparo
  manual), mismo criterio que StockPro, porque los tests están en pausa
  durante el MVP.
- Guardado en memoria el checklist completo a correr antes de cada commit
  (pint, `npm run lint`, `npm run format`, tsc, build, `php -l`) — antes
  solo corría una parte de esto.
- **Pendiente real, mencionado por el usuario pero sin definir todavía:**
  Render (producción) usa MySQL, el entorno local usa Postgres — el
  usuario quiere una forma de soportar los dos motores dinámicamente, o
  mantener una versión aparte para MySQL (para el despliegue del negocio
  de su tío, que corre MySQL local). **No se diseñó ni se tocó nada de
  esto todavía** — es una decisión de arquitectura aparte, no algo que
  arreglara el fix de CI de hoy.

## Cerrado por el usuario (ya no está pendiente)

- "Lo que había que corregir luego" al frenar los commits **era el CI de
  GitHub** — ya resuelto (ver sección de arriba).
- El nombre "Rafael J. Arenas" fue una prueba del propio usuario, ya
  corregido por él — no hace falta tocar nada.
- Logo incrustado en los correos — confirmado visualmente por el usuario
  en Gmail, se ve bien.

## Panorama completo para decidir próximos pasos (pedido explícito del usuario, 2026-08-26 tarde/noche)

### 1. MySQL (Render + negocio del tío) vs Postgres (local) — análisis

El usuario preguntó si conviene soportar los dos motores dinámicamente en
el mismo código, o mantener una versión aparte solo para MySQL (para el
despliegue del tío, que corre MySQL local).

**Hallazgo concreto:** 12 controllers usan el operador `ilike` en las
búsquedas (`CashRegisterController`, `CategoryController`,
`ClientController`, `InventoryMovementController`, `ProductController`,
`PurchaseOrderController`, `RoleController`, `SaleController`,
`SupplierController`, `TransactionCategoryController`,
`TransactionController`, `UserController`). `ILIKE` es sintaxis
**exclusiva de Postgres** — en MySQL tira error de sintaxis SQL. Este es
el único bloqueador real y concreto encontrado para correr el mismo
código en los dos motores tal cual está hoy.

El resto del código ya es portable: `DashboardController` ya rama por
`DB::connection()->getDriverName()` para las funciones de fecha
(pgsql/sqlite/mysql), y la auditoría de Postgres de la sesión del
2026-08-05 (punto 12.5 de `REFACTOR-PLAN.md`) ya revisó a fondo que no
queda sintaxis específica de motor en migraciones/seeders.

**Recomendación:** unificar en un solo código es viable y es lo correcto
a largo plazo — mantener dos versiones separadas del mismo software
diverge con el tiempo (cada fix hay que aplicarlo dos veces, es un
antipatrón clásico), y ya existe la costumbre en este proyecto de
configurar diferencias por entorno (`.env`) en vez de por rama de código
(mismo espíritu que `APP_NAME`/`APP_LOGO` de esta sesión). La forma más
simple de arreglar el bloqueador de `ilike` es reemplazarlo por un patrón
100% portable: `whereRaw('LOWER(columna) LIKE LOWER(?)', ["%$termino%"])`
— funciona igual en MySQL, Postgres y SQLite, sin necesidad de detectar el
driver en cada búsqueda. Es un cambio acotado (12 archivos, mismo patrón
en cada uno), no una reescritura.

**Actualización — implementado la misma noche:** el usuario autorizó
hacerlo si salía rápido. Se resolvió con `Builder::whereLike()`/
`orWhereLike()`, **nativo de Laravel 12** (no hacía falta escribirlo a
mano) — cada grammar (`MySqlGrammar`, `PostgresGrammar`, `SQLiteGrammar`)
ya lo implementa por su cuenta: `ilike` en Postgres, `like` plano en
MySQL/SQLite. Reemplazadas las 42 apariciones en los 12 controllers.

Dos intentos antes de llegar a esto:
1. Un macro casero con `LOWER(columna) LIKE LOWER(?)` vía `whereRaw` —
   roto: Postgres no tiene `lower(bigint)`, y `SaleController` busca por
   `id` numérico. Se detectó probando con consultas de solo lectura
   contra la BD local (sin tocar datos).
2. Un macro casero replicando el comportamiento de Postgres (auto-cast a
   `::text` solo cuando el operador es `ilike`/`like`) — funcionaba en
   teoría, pero **Laravel 12 ya trae un método nativo `whereLike()`** con
   ese mismo nombre; los métodos nativos de PHP siempre ganan sobre un
   macro con el mismo nombre, así que mi macro nunca se ejecutaba y el
   nativo (con otra firma, sin el wrapping `%...%` automático) corría en
   su lugar — halló el bug comparando el SQL/bindings generados.

Fix final: usar el `whereLike()` nativo tal cual, pasando el valor ya
envuelto en `%...%` en cada call site (igual que antes con `ilike`).
Verificado con consultas de solo lectura: columna de texto (`name`),
columna numérica (`sales.id`) y el caso combinado con varios
`orWhereLike` encadenados — los tres devuelven el SQL/resultados
esperados en Postgres. No se pudo probar contra un MySQL real en esta
sesión (no hay instancia a mano), pero la implementación es la misma que
usa el propio framework para MySQL, no código nuestro.

**También encontrado de paso, más urgente:** la migración de
`security_locked_at`/`failed_login_attempts` de la sesión de seguridad
se había hecho editando `create_users_table.php` (ya desplegada en
Render) en vez de una migración incremental — es casi seguro la causa de
los correos de "deploy failed" que llegaron toda la noche. Revertido el
edit, agregada una migración incremental nueva, verificado con
`migrate:fresh --seed` en local. Actualizada la memoria del proceso de
migraciones para dejar esta excepción documentada.

### 2. Nuevo pendiente: auditoría de validaciones en TODOS los formularios de la app

El usuario pidió explícitamente extender el patrón de login/reset-password
(sin `required`/burbuja nativa del navegador, `InputError` claro debajo de
cada campo con borde rojo, sin alertas redundantes, mensajes específicos
por campo) a **toda la app**, no solo auth. Formularios de negocio
detectados (11, fuera de los de auth ya corregidos):

`cashRegisterForm.tsx`, `categoryForm.tsx`, `clientForm.tsx`,
`inventoryMovementForm.tsx`, `productForm.tsx`, `purchaseOrderForm.tsx`,
`roleForm.tsx`, `saleForm.tsx`, `supplierForm.tsx`,
`transactionForm.tsx`, `usersForm.tsx`.

Para cada uno habría que revisar: atributos `required` nativos (quitar +
`noValidate` en el `<form>`), que cada FormRequest de backend tenga
mensajes claros en español (ya cubierto en general por
`lang/es/validation.php`, pero revisar mensajes custom existentes), y que
no haya alertas SweetAlert duplicando el texto que ya muestra
`InputError`. **No implementado todavía** — es una tarea acotada pero
repetitiva (11 archivos con el mismo patrón).

### 3. Roadmap general — `REFACTOR-PLAN.md` (todo lo que sigue sin tocar)

Documento fechado 2026-08-07, sin actualizar desde entonces salvo por el
módulo de Pedidos, tiempo real y la sesión de hoy (ninguno de los dos
estaba en este plan original). Pendientes reales listados ahí, en el
orden que el propio doc sugiere:

1. **Refactor a componentes reutilizables** (`DataTable`/`ResourceTable`,
   `ResourceModal` genéricos) — con 11 módulos repitiendo el mismo patrón
   a mano, incluido Pedidos.
2. **Modales "Ver" (show)** para Usuarios, Proveedores, Categorías,
   Movimientos de Inventario y Finanzas.
3. **Auditoría de modo claro** — tonos emerald/rose/amber/zinc, popover de
   filtros, badges de Pedidos/alertas — verificado mayormente en tema
   oscuro hasta ahora.
4. **Responsive real en viewport angosto** (375px) — nunca se pudo
   auditar de forma confiable con navegador automatizado, hace falta con
   el navegador real del usuario.
5. **Catálogos en BD** para tipos de movimiento de inventario y métodos de
   pago (el Combobox que los mostraría ya está listo).
6. **PWA instalable** — no depende de nada de lo anterior, se puede hacer
   en paralelo.
7. **WhatsApp automatizado** (Baileys + Render) — pausado a propósito,
   solo retomar si el usuario lo pide explícitamente de nuevo.
8. **Calidad de código general** — tests en pausa durante el MVP, revisión
   de nombres/tipos pendiente (fuera de esto: el checklist de pre-commit
   ya se resolvió hoy, ver arriba).

### 4. Render/Aiven: `/login` en 500 sin resolver — pausado, foco vuelve a local

Decisión del usuario al cierre de la sesión: dejar de invertir tiempo en
diagnosticar el deploy online por ahora. Prioridad es terminar el MVP en
local; Render/Aiven se retoma más adelante, posiblemente migrando a un
VPS más económico en vez de Render+Aiven free tier.

**Estado en el que quedó Render (inventory-manager-rafael):**

- El deploy más reciente (`4c383c6`, worker `22dgq`, live desde las 11:30
  PM) responde **500 en `/login`** de forma consistente y reproducible —
  no es flakiness de Aiven (la DB está `Running`, estable, y las
  migraciones/seeds corren sin error en cada deploy: "Nothing to migrate"
  + 3× "Seeding database." exitosos).
- **Se descartó como causa**: `BROADCAST_CONNECTION=log` y
  `SESSION_LIFETIME=630` — se agregaron para el keep-alive, se sospechó
  que rompían el render, se revirtieron (eliminados de las env vars de
  Render) y el 500 **persistió igual**. No son la causa.
- **Se descartó por lectura estática de código** (sin tocar producción
  con acciones reales, solo grep/Read):
  - `HandleInertiaRequests::share()` — nada específico de Postgres/MySQL.
  - El patrón `@vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])`
    en `resources/views/app.blade.php` — es el patrón estándar del
    starter kit de Laravel+React con Inertia, `app.tsx` resuelve páginas
    vía `import.meta.glob`, debería generar entrada de manifest igual.
  - SSR de Inertia (`config/inertia.php` tiene `ssr.enabled = true`) — se
    confirmó que NO es la causa: `HttpGateway::shouldDispatch()` exige
    `bundleExists()` cuando `ensure_bundle_exists` es true (default), y
    el Dockerfile solo corre `npm run build` (no `build:ssr`), así que
    nunca existe el bundle SSR → Inertia hace `dispatch()` → `null` sin
    intentar conectar, sin lanzar excepción. Descartado con certeza.
  - `ilike`/`whereLike` — no quedan usos de `ilike` en `app/` ni `routes/`.
- **Pendiente sin resolver, sin diagnóstico final**: la causa raíz real
  del 500 en `/login` sigue sin identificarse. Como último paso (no
  completado) se cambió `LOG_CHANNEL` de `stack` a `stderr` en el
  dashboard de Render, para que el stack trace real aparezca en los logs
  del contenedor (visibles en el dashboard) en vez de quedar solo en
  `storage/logs/laravel.log` (invisible sin Shell, y Shell no está
  disponible en el plan free). **Este cambio quedó desplegado y sin
  revertir** — es inofensivo (no expone nada públicamente, solo cambia
  dónde se escriben los logs), pero hay que recordarlo la próxima vez que
  se retome esto en Render.
- **Próximo paso sugerido cuando se retome**: con `LOG_CHANNEL=stderr` ya
  activo, pegarle una vez a `/login` (por ejemplo con `curl`) y leer el
  log del dashboard de Render inmediatamente después — debería mostrar el
  stack trace completo de la excepción real. Ese paso se interrumpió
  antes de ejecutarse.
- **No se tocó** el Dockerfile, `docker/entrypoint.sh`, ni ningún archivo
  de código de la app durante este diagnóstico — todos los cambios de
  esta sesión relacionados con Render fueron solo env vars (agregadas y
  luego revertidas) y este último cambio de `LOG_CHANNEL`.
- El servicio de Aiven (`inventory-pos-db`) se encendió manualmente esta
  sesión (estaba apagado por inactividad del plan free) y quedó
  `Running`. El workflow `.github/workflows/keep-alive.yml` (commit
  `4c383c6`, ya en `main`) pinguea `/login` cada 10 minutos para evitar
  que Render y Aiven se vuelvan a dormir — pero como `/login` está roto,
  el ping en sí seguirá recibiendo 500 hasta que se arregle esto (no
  rompe nada, pero tampoco sirve como demo mientras tanto).
