# Inventory Manager

Sistema de gestión de inventario, ventas y caja para un negocio de venta de repuestos — catálogo de productos,
ventas en mostrador, clientes, proveedores, pedidos de reabastecimiento, caja diaria, finanzas, roles y permisos
por empleado, y un historial de auditoría interno que registra quién hizo qué y cuándo.

No es un sistema de facturación electrónica certificado ante la DIAN: el documento que genera es un comprobante
interno de venta, pensado para el control interno del negocio, no para validación tributaria previa.

**Versión actual:** consultar el badge de versión en el pie de la barra lateral una vez dentro de la app (enlaza al
historial completo de cambios), o [`CHANGELOG.md`](./CHANGELOG.md) en este repositorio.

## Stack técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | [Laravel](https://laravel.com) | 12.x (PHP ^8.2) |
| Frontend | [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | React 19 |
| Puente backend/frontend | [Inertia.js](https://inertiajs.com) | 2.x |
| Estilos | [Tailwind CSS](https://tailwindcss.com) | 4.x |
| Build | [Vite](https://vitejs.dev) | 6.x |
| Tiempo real | [Laravel Reverb](https://reverb.laravel.com) (WebSockets) | — |
| Roles y permisos | [spatie/laravel-permission](https://spatie.be/docs/laravel-permission) | — |
| PDF (facturas) | [barryvdh/laravel-dompdf](https://github.com/barryvdh/laravel-dompdf) | — |
| Excel (exportaciones/carga masiva) | [PhpSpreadsheet](https://phpspreadsheet.readthedocs.io) | — |
| Base de datos | MySQL (uso actual, local) / PostgreSQL (alternativa compatible) | — |

La app es una **PWA instalable**: se puede agregar a pantalla de inicio en Android, iOS, Windows y macOS, con
service worker propio (`public/sw.js`) para que la interfaz siga cargando aunque se pierda la conexión un
instante (los datos en sí, obviamente, necesitan red).

## Módulos

- **Administración** — Usuarios, Roles y Permisos, Auditoría.
- **Inventario** — Categorías, Productos, Proveedores, Movimientos de Inventario, Pedidos (órdenes de compra).
- **Ventas** — Ventas, Clientes, Caja, Finanzas.
- **Dashboard** — resumen financiero, gráficas de ventas por período/categoría, alertas de stock bajo y de tope
  de facturación electrónica obligatoria (DIAN), exportación a Excel/PDF.

Todas las acciones críticas (crear/editar/eliminar en cualquier módulo, login, cambios de contraseña/perfil,
cambios de roles/permisos, anular una venta, anonimizar un cliente, ajustar inventario manualmente) quedan
registradas en el módulo de **Auditoría**, con filtro de año/mes, exportación a Excel, y vista de detalle
antes/después de cada cambio.

## Requisitos previos

- **PHP** ^8.2 con las extensiones habituales de Laravel (`pdo`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `gd`)
- **Composer** (última versión)
- **Node.js** ^20.x y **npm**
- **MySQL** 8+ o **PostgreSQL** 14+ (a elección — ver [Base de datos](#base-de-datos))
- **Git**

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/FlakoArenas26/Inventory-Manager.git
cd Inventory-Manager
```

### 2. Dependencias

```bash
composer install
npm install
```

### 3. Archivo de entorno

```bash
cp .env.example .env
php artisan key:generate
```

Edita `.env` con los datos de tu base de datos y del negocio (ver secciones siguientes). Las variables
`BUSINESS_*` alimentan la factura PDF y el mensaje de WhatsApp; no son datos reales, son de ejemplo por defecto.

### 4. Base de datos

Elige un motor y ajusta `.env` en consecuencia:

**MySQL (recomendado para desarrollo local):**

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=inventory_manager
DB_USERNAME=root
DB_PASSWORD=
```

**PostgreSQL (alternativa compatible, por si en el futuro se despliega en un servidor):**

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=inventory_manager
DB_USERNAME=postgres
DB_PASSWORD=
```

El código es compatible con ambos motores (las consultas que lo requieren ya manejan la sintaxis específica de
cada uno — fechas, búsqueda sin tildes, etc.). Con la base de datos creada y las credenciales en `.env`, corre las
migraciones:

```bash
php artisan migrate --seed
```

Esto crea el esquema completo y siembra roles, permisos, módulos del menú, y usuarios de ejemplo para probar la
app localmente:

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@admin.com` | `Admin-12345*` | Administrador |
| `seller@seller.com` | `Seller-1234*` | Vendedor |
| `cajero@demo.com` | `Cajero-1234*` | Cajero |
| `bodega@demo.com` | `Bodega-1234*` | Bodega |
| `auditor@demo.com` | `Auditor-123*` | Auditor |

> Estas credenciales son **solo para desarrollo local**. En un despliegue real, cambia las contraseñas o elimina
> estos usuarios de ejemplo antes de dar acceso a alguien.

### 5. Enlace de almacenamiento

```bash
php artisan storage:link
```

### 6. Compilar el frontend

```bash
npm run build
```

Para desarrollo con recarga en caliente:

```bash
npm run dev
```

> `npm run build`/`npm run dev` regeneran automáticamente `resources/js/version.ts` a partir de
> [`CHANGELOG.md`](./CHANGELOG.md) — no lo edites a mano.

### 7. Levantar la app

```bash
php artisan serve
```

Si usás [Laravel Herd](https://herd.laravel.com) (Windows/macOS) en vez de `artisan serve`, Herd sirve el proyecto
directamente desde su carpeta — **pero solo lee el build ya compilado** (`public/build/`), no corre un servidor de
Vite en caliente. Con Herd, corré `npm run build` cada vez que cambies algo del frontend antes de probarlo en el
navegador; para desarrollo activo del frontend usá `npm run dev` en su lugar.

Para el tiempo real (ver "Novedades" reflejadas en otras sesiones sin recargar, notificaciones de stock bajo,
etc.) hace falta correr el servidor de Reverb aparte:

```bash
php artisan reverb:start
```

Genera tus propias credenciales de Reverb (`REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`) con:

```bash
php artisan reverb:install
```

## Configurar un host local (dominio propio en vez de `localhost:8000`)

### Windows

**Opción A — Laravel Herd (recomendado):** Herd detecta automáticamente cualquier carpeta de proyecto Laravel
dentro de su directorio de sitios (por defecto `~/Herd`) y la sirve en `http://<nombre-de-la-carpeta>.test` sin
configuración adicional — así corre este proyecto en `http://inventory-manager.test`.

**Opción B — manual:** edita `C:\Windows\System32\drivers\etc\hosts` (como Administrador) y agrega:

```
127.0.0.1   inventory-manager.test
```

Después corre `php artisan serve --host=inventory-manager.test` o configura un servidor web (nginx/Apache) con
ese `server_name` apuntando a `public/`.

### Linux

**Opción A — [Laravel Valet Linux](https://github.com/cpriego/valet-linux):**

```bash
cd Inventory-Manager
valet link inventory-manager
```

Queda disponible en `http://inventory-manager.test`.

**Opción B — manual:** agrega la misma línea al `/etc/hosts`:

```
127.0.0.1   inventory-manager.test
```

y configura un vhost de nginx/Apache apuntando su `root` a la carpeta `public/` del proyecto, con `server_name
inventory-manager.test`.

> Cualquiera sea el dominio que uses, actualizá `APP_URL` en `.env` para que coincida — algunos enlaces
> generados por Laravel (correos, links firmados) lo usan como base.

## Variables de entorno relevantes

Además de las estándar de Laravel (`APP_*`, `DB_*`, `MAIL_*`), este proyecto usa:

| Variable | Para qué sirve |
|---|---|
| `BUSINESS_NAME`, `BUSINESS_NIT`, `BUSINESS_PHONE`, `BUSINESS_EMAIL`, `BUSINESS_ADDRESS` | Identidad del negocio en la factura PDF y el mensaje de WhatsApp |
| `BUSINESS_UVT_VALUE` | Valor de la UVT (DIAN) del año gravable vigente — de acá se derivan los dos topes siguientes |
| `BUSINESS_CONSUMIDOR_FINAL_LIMIT_UVT` | Tope de venta al cliente "Consumidor Final" en UVT (5 por defecto) |
| `BUSINESS_ANNUAL_INVOICING_THRESHOLD_UVT` | Tope de ingresos anuales (UVT) para el aviso de facturación electrónica obligatoria (3.500 por defecto) |
| `WHATSAPP_SERVICE_URL`, `WHATSAPP_INTERNAL_TOKEN`, `LARAVEL_INTERNAL_URL` | Integración con el microservicio de Node aparte que envía las facturas por WhatsApp |
| `REVERB_*`, `VITE_REVERB_*` | Credenciales y host del servidor de WebSockets para tiempo real |

## Comandos útiles

```bash
php artisan config:clear      # Limpiar cache de configuración tras editar .env o config/*.php
php artisan migrate:status    # Ver qué migraciones han corrido
composer run pint             # Formatear PHP según el estándar del proyecto (Laravel Pint)
npm run lint                  # ESLint (con --fix) sobre resources/
npm run format                # Prettier sobre resources/
npm run types                 # Chequeo de tipos de TypeScript sin emitir archivos
```

## Calidad y pruebas

```bash
php artisan test    # 64/64 — corre contra SQLite en memoria, ver phpunit.xml
```

El progreso de QA (seguridad, funcional, carga) queda documentado en [`QA.md`](./QA.md), una sección por ronda
de pruebas — hallazgos, evidencia y qué se corrigió, en el mismo formato que `CHANGELOG.md`.

## Versionado

El historial de cambios vive en [`CHANGELOG.md`](./CHANGELOG.md) — una sección por versión con un resumen y el
detalle en viñetas. Un script (`scripts/generate-changelog.mjs`) lo parsea en cada build y genera
`resources/js/version.ts`, que alimenta tanto el badge de versión del pie de la barra lateral como el modal de
"Novedades" (última versión destacada, historial anterior colapsado por versión). No hay llamadas a la API de
GitHub en producción — todo queda embebido en el bundle en build time.

## Licencia

Este software se distribuye bajo una **licencia Freeware** (uso gratuito autorizado explícitamente por el
desarrollador) de tipo **propietaria, de uso limitado, no exclusiva e intransferible (EULA)**. No es software
libre/de código abierto — el código fuente no se entrega ni se autoriza su modificación, redistribución o
reventa. El texto legal completo (Términos y Condiciones, tratamiento de datos personales conforme a la Ley 1581
de 2012 de Colombia, límite de responsabilidad) se muestra dentro de la propia app y su aceptación es obligatoria
al iniciar sesión — ver `resources/js/components/terms-content.tsx`.

Si en el futuro el desarrollador decide cobrar por el uso del software, el software dejaría de clasificarse como
Freeware y pasaría a una licencia comercial propietaria, bajo los mismos términos de propiedad intelectual.

## Solución de problemas

- **Errores de conexión a la base de datos**: confirma que `.env` tenga las credenciales correctas y que el
  servidor de base de datos esté corriendo.
- **Errores de `node_modules`**: borra `node_modules` y `package-lock.json`, y corre `npm install` de nuevo.
- **Permisos de escritura**: asegúrate de que `storage/` y `bootstrap/cache/` sean escribibles:
  ```bash
  chmod -R 775 storage bootstrap/cache
  ```
- **La app no refleja cambios del frontend en Herd**: correr `npm run build` — Herd sirve el build estático, no
  un servidor de Vite en caliente (ver sección de instalación).
- **El tiempo real no funciona**: confirma que `php artisan reverb:start` esté corriendo aparte y que
  `REVERB_*`/`VITE_REVERB_*` en `.env` tengan credenciales válidas (`php artisan reverb:install` las genera).
