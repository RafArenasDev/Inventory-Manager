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
  - [ ] Funcional (caja negra / caja blanca)
  - [ ] Carga y estrés
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
