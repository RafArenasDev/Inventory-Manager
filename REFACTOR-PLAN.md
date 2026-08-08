# Plan de Refactor — Inventory Manager (portfolio-ready)

> Instrucciones para una sesión futura de Claude Code. Este documento es la fuente
> de verdad de lo que hay que hacer. Antes de empezar, lee todo el archivo y usa
> `search-docs` (Laravel Boost) para confirmar patrones actualizados de Inertia v3 /
> Laravel 12 antes de tocar código.

## Contexto del proyecto

- Laravel 12 + Inertia v2/v3 + React 19 + TypeScript + Tailwind.
- Starter kit `laravel/react-starter-kit`, componentes UI en `resources/js/components/ui`
  (estilo shadcn: `dialog.tsx`, `modal.tsx`, `button.tsx`, `input.tsx`, etc.).
- Permisos/roles con `spatie/laravel-permission`. PDF con `barryvdh/laravel-dompdf`.
  Excel con `phpoffice/phpspreadsheet`.
- App real para un negocio de repuestos de motos (uso productivo de un familiar),
  pero **este repo también es la pieza #1 de mi portfolio de desarrollo** — el
  objetivo de este refactor es dejarlo con calidad profesional para mostrar a
  reclutadores, sin romper el uso real del negocio.
- Ya está desplegado en Render (free tier) + MySQL en Aiven (free tier). Cualquier
  cambio debe seguir funcionando ahí (Docker, ver `Dockerfile` y `docker/entrypoint.sh`).
- **Cambio de dominio de los datos de demo (2026-08-06):** los `seeders/` ya NO
  representan el negocio real de motos — se reescribieron con un catálogo
  ficticio de una tienda de tecnología (computadores, periféricos, redes, etc.)
  para el portfolio. Esto es solo para `database/seeders/*`; no afecta datos
  reales de producción si en algún momento existieran en Render/Aiven.

## Objetivo general

Llevar el código y la UI de "funcional" a "profesional / portfolio-ready", sin
perder ninguna funcionalidad actual. Los entregables de este refactor son
exclusivamente técnicos (código). Todo lo de portfolio en sí (web, capturas,
video, LinkedIn) se hace después, fuera de este repo.

## Estado al cierre de la sesión del 2026-08-06

Sesión larga, mucho avance real. Resumen rápido — detalle en cada punto abajo:

**Hecho y verificado en el navegador:**
- Modal de Ventas unificado entre Dashboard y módulo Ventas (mismo componente,
  mismo diseño que Roles: dark mode sin grisáceos, solo la tabla de items
  scrollea, resto fijo, con fallback de scroll completo si el contenido no cabe).
- Fix de sidebar que no colapsaba en tablet/iPad (breakpoint 768→1024px).
- Fix del componente `Switch` (el thumb no quedaba centrado en la pista).
- Dashboard: sliders de Ventas/Ingresos/Egresos reemplazados por tarjetas fijas
  ligadas al selector de período; sección estática de alertas removida (ahora
  vive en la campana); bug real corregido en el gráfico de categorías (decía
  "distribución del año" pero filtraba por mes actual e ignoraba el selector de
  período); estados vacíos de los gráficos limpiados; tarjetas de stats más
  compactas y horizontales; hover de "Nueva Venta"/"Exportar" corregido.
- Campana de notificaciones nueva en el header (`notification-bell.tsx` +
  endpoint `/notifications/low-stock`): 3 niveles de alerta (advertencia /
  crítico / agotado) alineados con el semáforo de Productos, con SweetAlert real
  (no toast) que dispara al iniciar sesión y se repite cada 30 min mientras el
  problema siga sin resolver — persistido en `localStorage` porque Inertia
  remonta el header en cada navegación (era la causa real de que no alertara).
- **Seeders reescritos por completo** para el nuevo dominio ficticio (tienda de
  tecnología): categorías, proveedores, 81 productos con distribución realista
  de stock (~18.5% en alerta), 25 clientes (con nombres latinoamericanos reales
  — se encontró y corrigió que `es_CO` no existe en fakerphp/faker y caía en
  inglés silenciosamente, se usa `es_PE`), roles ampliados (Cajero, Bodega,
  Auditor + Vendedor con permisos reales de venta), 6 usuarios, 30 ventas
  históricas con sus items/movimientos/transacciones automáticas (replicando
  exactamente las conversiones de unidades del controlador real — Sale en
  centavos, Transaction en pesos), transacciones operativas (arriendo, nómina,
  servicios), 17 cajas diarias cerradas y movimientos extra de ajuste/devolución.

**Continuación tarde del mismo 2026-08-06** (ver sección 10 para el detalle
completo): rediseño total del campo de imagen de producto (dropzone,
drag&drop, validación de solo-imágenes, animación de carga, botón eliminar
con soporte backend nuevo), default sugerido de utilidad al activar "Por
utilidad" en productos nuevos, y el reemplazo completo de **todos** los
`<select>`/`<Select>` de la app por el Combobox real de shadcn — con tres
bugs no triviales encontrados y corregidos en el camino (pointer-events
heredado del Dialog bloqueaba clics, scroll-lock del Dialog bloqueaba la
rueda del mouse, fondo oscuro no coincidía con el resto de inputs).

**Pendiente / no iniciado:** ver "❌ Pendiente" en cada punto de la lista
numerada de abajo, la sección "8. Pendientes que salieron durante la sesión"
(catálogos en BD, WhatsApp — Combobox ya se hizo, ver sección 10), y
"Próxima sesión" al final del documento.

---

## 1. Unificar todos los Create/Edit en modales

**Estado (2026-08-07): ✅ hecho.** Verificado esta sesión que los 7 módulos que
quedaban como "no verificado" (`cashRegister`, `categories`, `clients`,
`inventoryMovements`, `suppliers`, `transactions`, `users`) **ya usan**
`Dialog`/`DialogContent` de Radix en su `index.tsx`, con el mismo patrón
(`isModalOpen`, `attemptCloseForm`, `ConfirmDialog`). `permissions` ya no
existe como módulo separado — se fusionó en `roles/` durante la unificación de
roles/permisos. `dialog.tsx` (base compartida) ya trae `backdrop-blur-sm` +
`bg-black/70` y animaciones in/out, así que todos los módulos lo heredan.

Además esta sesión:
- Se convirtió **"Ver factura" de Ventas** (`sales/show.tsx`, única vista que
  seguía siendo página completa) en modal (`sales/saleDetailModal.tsx`),
  siguiendo el patrón de `clientHistoryModal.tsx` (modal de solo detalle,
  distinto de un form de create/edit). `SaleController::show()` pasó de
  `Inertia::render` a JSON puro (mismo patrón que `clients.history`), y
  `sales/show.tsx` se eliminó por no uso.
- Se confirmó que `productModal.tsx` (botón "Ver producto") **ya era** un
  modal de solo lectura correcto — no reutilizaba el form editable como se
  sospechaba. Solo se corrigieron sus botones en `productsTable.tsx`, que
  usaban colores sólidos (`bg-blue-600`, `bg-yellow-500`, `bg-red-600`) en vez
  del patrón ghost-hover (`text-blue-600 hover:bg-blue-100...`) que ya usa el
  resto de módulos — es el único que rompía el patrón.

❌ Pendiente menor: ningún módulo (salvo Roles/Ventas) refuerza
`dark:border-gray-800` en su `DialogContent` — no se ha confirmado si hace
falta o si el `backdrop-blur-sm` base de `dialog.tsx` ya es suficiente; habría
que verlo en navegador con tema oscuro real antes de tocar 7+ archivos sin
necesidad.

## 2. Diseño consistente en todas las vistas

**Estado (2026-08-06):** el modal de Ventas y el Dashboard ya siguen el patrón
oscuro sin grisáceos (`dark:bg-white/[0.03]`, `dark:border-gray-800`) que ya
usaba Roles. ❌ Falta auditar el resto de módulos de la lista de abajo contra
ese mismo estándar — no se tocaron esta sesión.

- Auditar todos los `index.tsx` de cada módulo y unificar: encabezados de página,
  breadcrumbs, spacing, tipografía, colores de badges/estados, botones de
  acción (ver/editar/eliminar), paginación (`components/ui/pagination.tsx`).
- Si hay módulos con estilos "a mano" (colores hardcodeados, spacing distinto),
  migrarlos a las clases/utilidades que ya usan los módulos más recientes
  (revisar historial de commits: los mensajes mencionan "Estandarización de
  estilos" en Productos/Movimientos — usar eso como el estándar a replicar en
  el resto).
- Extraer patrones repetidos (ej. header de tabla con botón "Nuevo", estado
  vacío, skeleton de carga) a componentes compartidos en
  `resources/js/components/` para no duplicar entre módulos.

## 3. Responsive total

**Estado (2026-08-06):** parcial. Se corrigió el bug de sidebar que no
colapsaba en tablet/iPad (`use-mobile.tsx`, breakpoint 768→1024px) y las
tarjetas de stats del Dashboard se hicieron más compactas/horizontales para
reducir scroll de página. ❌ Falta la auditoría completa en 375px que pide el
criterio de aceptación — no se hizo esta sesión (el entorno de browser
automatizado usado no permitía redimensionar la ventana a un ancho móvil real
para probarlo visualmente).

- Revisar cada vista en breakpoints móvil / tablet / desktop (usar las utilidades
  de Tailwind ya presentes en el proyecto).
- Las tablas (`*Table.tsx`) deben degradar a vista de tarjetas o scroll horizontal
  controlado en móvil, no desbordar la pantalla.
- Sidebar (`components/ui/sidebar.tsx`, `app-sidebar.tsx`) y header
  (`app-header.tsx`) deben colapsar correctamente en móvil (menú hamburguesa si
  no lo tienen ya).
- Los modales del punto 1 deben ser usables en pantallas pequeñas (full-screen o
  casi full-screen en móvil, centrado con max-width en desktop).

## 4. Convertir en PWA instalable + soporte offline

**Estado (2026-08-06):** ❌ no iniciado.

- Agregar `manifest.json` (nombre, íconos en varios tamaños, `theme_color`,
  `display: standalone`), enlazarlo en `resources/views/app.blade.php`.
- Generar set de íconos (usar el ícono genérico ya puesto en `public/favicon.svg`
  como base, exportar a PNG en 192x192 y 512x512 como mínimo).
- Implementar service worker (evaluar `vite-plugin-pwa` ya que el proyecto usa
  Vite — confirmar compatibilidad con `laravel-vite-plugin` antes de instalar
  nada nuevo, y pedir aprobación antes de agregar una dependencia nueva según
  las reglas del proyecto).
- Estrategia de cache: cachear shell de la app (JS/CSS) y assets estáticos para
  que cargue offline; las peticiones a la API/backend no pueden funcionar
  offline de verdad (no hay backend local), así que definir una pantalla clara
  de "sin conexión" para las acciones que requieren red, en vez de fallar en
  silencio.
- Verificar que sea instalable (prompt "Agregar a pantalla de inicio" /
  "Instalar app") en Chrome desktop, Android y iOS Safari.

## 5. Alertas de inventario más dinámicas

**Estado (2026-08-06): ✅ hecho.** Implementado completo esta sesión:

- Endpoint `GET /notifications/low-stock` (`DashboardController@lowStockNotifications`)
  con 3 tiers (`advertencia` 4-7, `crítico` 1-3, `agotado` 0 — mismos cortes que
  el semáforo de `productsTable.tsx`), consultado cada 45s desde
  `notification-bell.tsx` en el header (visible en toda la app, no solo Dashboard).
- Campana con badge de conteo + dropdown con la lista completa (hasta 200,
  sin cap artificial) y link "Ver todos" a Productos filtrado.
- Alerta proactiva real (SweetAlert centrado, no toast) que dispara: (a) al
  iniciar sesión si ya hay algo crítico/agotado, (b) de inmediato si un
  producto pasa a crítico/agotado, (c) cada 30 min como recordatorio mientras
  el problema siga sin resolver. Estado persistido en `localStorage`
  (`inventory_pos_alert_state_v1`) porque Inertia remonta el componente en
  cada navegación — sin eso, nunca se acumulaban los 30 minutos.
- Sección estática "Alertas de Inventario" del Dashboard, removida (redundante
  con la campana); `lowStockModal.tsx` eliminado por no uso.

❌ Pendiente: el umbral (7) está hardcodeado en `DashboardController`, no es
configurable por producto todavía.

## 6. Seeds completos + perfil de demo con reseteo

**Objetivo:** cualquier reclutador que pida ver la demo debe poder loguearse con
un usuario "demo", ver la app completamente poblada con datos realistas (no
inventados a lo loco, pero tampoco datos reales del negocio de mi familiar), y
usar TODAS las funciones sin miedo a romper nada — porque los datos de demo se
pueden resetear.

**Estado (2026-08-06): ✅ mayormente hecho** — todas las tablas tienen seeder
propio con volumen razonable, reescrito para el nuevo dominio ficticio (tienda
de tecnología, ver nota de "Contexto del proyecto" arriba):

- `CategorySeeder` (16 categorías), `SupplierSeeder` (4 proveedores ficticios),
  `ProductSeeder` (81 productos; stock repartido a propósito: ~82% saludable,
  ~18.5% en alerta — advertencia/crítico/agotado — para que la campana del
  punto 5 tenga datos reales sin que toda la tienda luzca desabastecida).
- `ClientSeeder` nuevo (25 clientes, Faker `es_PE` con departamento/ciudad
  reales de `DepartmentCitySeeder`).
- `RoleSeeder` ampliado: Admin, **Vendedor** (antes no podía ni crear ventas,
  se corrigió), **Cajero**, **Bodega**, **Auditor** (nuevos, con permisos
  reales por función).
- `UserSeeder` ampliado: 6 usuarios (uno por rol + un vendedor extra),
  contraseñas tipo `Rol-123*` (ver el seeder para el detalle de cada email).
- `SaleSeeder` nuevo (30 ventas de los últimos ~90 días con items, movimientos
  de salida y transacción "Ingreso" automática — replica exactamente las
  conversiones de unidades del `SaleController` real: `Sale.total_*` en
  centavos, `SaleItem`/`Transaction.amount` en pesos).
- `TransactionSeeder` nuevo (arriendo, nómina, servicios, impuestos, etc.).
- `CashRegisterSeeder` nuevo (17 cajas diarias cerradas, sin domingos, con las
  mismas fórmulas de apertura/cierre que `CashRegisterController`).
- `InventoryMovementSeeder` nuevo (devoluciones y ajustes extra sobre
  productos con stock saludable, para no interferir con los que están
  deliberadamente bajos).
- `DatabaseSeeder` actualizado con el orden de dependencias correcto.

✅ **Fix 2026-08-07:** `SaleSeeder` no generaba el PDF ni `public_invoice_url`
de cada venta (a diferencia del flujo real de `SaleController::store`), por lo
que el botón "Enviar a WhatsApp" nunca aparecía en ventas de demo. Se extrajo
la generación/guardado del PDF a `App\Services\InvoicePdfService` (reusado
por controlador y seeder) y de paso se eliminó un hardcode grave que había en
`SaleController::savePdfPublicly()`: escribía una copia de cada factura en
`C:/Users/usuario/Documents/` (ruta local del desarrollador) — vestigio de
debug que se habría roto silenciosamente en Render/Linux. También se
encontró y arregló que `resources/views/sales/invoice.blade.php` rompía con
`Attempt to read property on null` en ventas sin cliente ("Cliente varios",
~35% de las ventas sembradas) por no usar `?->` — bug real preexistente,
expuesto recién al generar PDF para todas las ventas del seeder. De paso se
sacaron a `config/business.php` (env `BUSINESS_*`) los datos hardcodeados del
negocio real de motos ("Moto Repuestos Arcoiris") que quedaban en la factura
y en el mensaje de WhatsApp, reemplazados por los del negocio ficticio de
demo.

❌ **Pendiente de este punto:**
- No se creó un usuario `demo@demo.com` único "todo-poderoso" como pedía el
  criterio original — en su lugar hay usuarios por rol (`cajero@demo.com`,
  `bodega@demo.com`, `auditor@demo.com`, etc.). Decidir si además se quiere un
  demo genérico tipo admin para mostrar a reclutadores.
- No existe el comando `php artisan demo:reset` — hoy resetear es
  `migrate:fresh --seed` a mano.
- La pregunta original de si `docker/entrypoint.sh` debe correr el seeding
  completo en Render o seguir con el mínimo actual (solo permisos/roles/
  usuarios) sigue sin resolver — el entrypoint no se tocó esta sesión.

## 7. Calidad de código general

**Estado (2026-08-06):** parcial. Se extrajo `getPeriodDateRange()` en
`DashboardController` para no repetir el mismo `switch` de fechas en
`getSalesData`/`getTransactionData`/`getCategoryChartData` (este último además
tenía un bug real: ignoraba el período seleccionado, ver punto 5/Dashboard más
abajo en el changelog). ❌ El resto de la lista no se hizo esta sesión — nota:
mientras dure el MVP, el proyecto tiene la regla de **no escribir/correr
tests** (ver memoria del usuario), así que ese ítem específico queda
explícitamente fuera hasta que esa fase termine.

- Revisar convenciones de nombres (mezclas de `camelCase` en archivos como
  `productModal.tsx` vs. posibles inconsistencias en otros) y unificar.
- Tipar correctamente todo con TypeScript (evitar `any`), aprovechar los tipos
  ya generados por Wayfinder para rutas/controladores.
- Revisar N+1 queries en controladores (usar `with()` donde falte eager loading).
- ~~Añadir/completar tests de Pest~~ — pausado mientras dure el MVP.
- Correr `vendor/bin/pint --dirty --format agent` y el lint de frontend
  (`npm run lint`, `npm run format`, `npm run types:check` si existen en
  `package.json`) antes de dar por terminado cualquier cambio.

## 8. Pendientes que salieron durante la sesión (no estaban en el plan original)

- **Combobox de shadcn:** ✅ hecho 2026-08-06, ver sección 10 para el detalle
  completo (API real usada, bugs encontrados, archivos convertidos).
- **Catálogos en BD en vez de hardcodeados:** los tipos de movimiento de
  inventario (`productForm.tsx` ~línea 55, duplicados en
  `inventoryMovementForm.tsx`) y los métodos de pago (`transactionForm.tsx`,
  `saleForm.tsx` — hoy son 2 valores fijos vía `Switch`) siguen quemados en el
  frontend. ❌ No migrado a tablas — diseño pendiente de proponer antes de
  crear modelos/migraciones nuevas (regla del proyecto: proponer antes de
  construir).
- **Envío de factura por WhatsApp gratis:** **decisión consciente 2026-08-07:
  se queda solo con el link manual (`wa.me` + descarga del PDF), automatización
  descartada por ahora.** Historial completo para no repetir la investigación
  ni la implementación:
  - CallMeBot **no sirve**: solo texto (no PDFs), requiere que cada
    destinatario se registre manualmente con el bot antes.
  - Se **construyó completo** un servicio de automatización con
    `whatsapp-web.js` (adjuntaba el PDF real en el chat, sin paso manual):
    integrado en el mismo Docker de Render (Node + Chromium del sistema en
    el `Dockerfile`, arrancado desde `docker/entrypoint.sh`), con la sesión
    de WhatsApp persistida en una tabla nueva (`whatsapp_sessions`) vía
    `RemoteAuth` en vez de disco local — resolviendo el problema de
    persistencia que había quedado sin resolver en la investigación
    original (Render free tier borra el disco en cada sleep/wake). Backend
    Laravel actuaba de proxy (`POST /sales/{sale}/send-whatsapp`,
    `GET /whatsapp/status`, `GET /whatsapp/qr`) para que el navegador nunca
    hablara directo con el servicio interno. **Revertido completo** (commit
    de revert) tras preguntarle directamente al usuario sobre el riesgo real
    de baneo: cualquier automatización no oficial de WhatsApp (Baileys,
    whatsapp-web.js, o cualquier equivalente en Python — el lenguaje no
    cambia el riesgo ni evita necesitar un navegador real ~300MB) tiene
    riesgo bajo-pero-no-cero de que WhatsApp banee el número vinculado. El
    usuario decidió explícitamente **no** asumir ese riesgo ni para su
    número de pruebas ni para el del negocio real de su tío, prefiriendo
    quedarse con el link manual (riesgo cero, porque es el mecanismo
    "click to chat" que WhatsApp ofrece oficialmente + un humano hace clic
    en enviar) hasta poder costear la API oficial de Meta más adelante, o
    evaluar otra solución (posible app de notificación aparte).
  - Si se retoma en el futuro: el diseño de arriba (Docker + RemoteAuth +
    proxy Laravel) es el punto de partida correcto, ya validado — solo
    faltaría reconstruirlo y decidir en qué número probarlo primero.
  - **Fix puntual 2026-08-07:** el link `wa.me/${cellphone}` daba 404 porque
    el celular ficticio se generaba con guion (`ClientSeeder`, formato
    `3##-#######`) y sin código de país — wa.me exige solo dígitos con
    código de país. Se agregó `formatWhatsAppNumber()` en
    `saleDetailModal.tsx` que limpia el número y antepone `57` (Colombia)
    cuando detecta un celular local de 10 dígitos. El link en sí
    (`https://wa.me/<número>?text=<mensaje>`) ya era la forma simple
    correcta — el problema era solo el formato del número, no el link.
  - **Fix puntual 2026-08-07:** el botón usaba el ícono genérico `MessageCircle`
    de lucide-react (no es un logo de marca). Se reemplazó por un ícono SVG
    inline del logo real de WhatsApp (`components/icons/whatsapp-icon.tsx`,
    sin dependencia nueva) y el botón pasó a usar el verde de marca
    (`#25D366`) en vez del color primario genérico del tema.
  - **Fix puntual 2026-08-07:** `ClientController::history()` (historial de
    compras del cliente, `clientHistoryModal.tsx`) nunca traía datos —
    seleccionaba columnas inexistentes en `sale_items` (`unit_price`,
    `total_price`, `product_name`; las reales son `price_at_sale`,
    `subtotal`, y el nombre viene de la relación `product`). Corregido.

## 9.8 Barrido de consistencia UI + filtros fuera de la URL (pedido 2026-08-07)

**Estado: ✅ hecho, salvo lo anotado abajo.**

- Producto (`products/index.tsx`) convertido de página completa a modal —
  era el único módulo que faltaba de los 10.
- Botón de cierre "bonito" (círculo, `bg-white/90`, sombra) centralizado en
  `dialog.tsx` (antes solo `saleDetailModal.tsx` lo tenía vía override
  local) — todos los modales lo heredan ahora sin tener que repetirlo.
- Barra de búsqueda: los 10 módulos usaban `flex justify-between
  items-center` fijo, que comprimía el input contra el botón de exportar
  en mobile (ahí se perdía el placeholder). Normalizado a
  `flex flex-col gap-4 sm:flex-row ...` + `className="w-full sm:max-w-md"`
  en el `SearchInput`.
- `PageHeader`: quitada la línea divisoria bajo título+descripción.
- Fondo de contenido: los 14 archivos que hardcodeaban
  `dark:bg-[oklch(0.100205_0_0)]` (el mismo valor exacto del sidebar, cero
  contraste) pasaron a `bg-card` (token de tema, `oklch(0.145 0 0)` en
  oscuro — más claro que el sidebar a propósito).
- Botones de acción: confirmado que todos los módulos ya usan
  `IconActionButton` con el mismo patrón ghost-hover; no quedó ninguno con
  estilo sólido fuera de patrón.
- **Filtros fuera de la URL:** cambio más grande — todo el flujo de
  búsqueda/paginación pasó de `router.get()` (query string, terminaba en
  el historial del navegador y en logs del servidor) a `router.post()`
  contra una ruta `/<módulo>/search` nueva por módulo. `pagination.tsx` se
  reescribió completo: antes construía los links de página leyendo
  `window.location.href` (heredaba el filtro activo sin querer); ahora
  todo pasa por POST con los filtros en el body. Verificado en el
  navegador: la barra de direcciones nunca muestra el término buscado, y
  recargar en `/search` (GET simple, sin body) cae al listado sin filtro
  en vez de un 405.

❌ **Pendiente / no verificado:**
- **Responsive real en 375px:** no se pudo confirmar visualmente esta
  sesión tampoco — la herramienta de navegador no logró redimensionar el
  viewport de forma confiable (la pestaña parecía estar en uso paralelo
  del usuario, saltando de página sola). Las tablas ya usan contenedores
  `overflow-x-auto`, pero falta la pasada visual real en mobile.
- **Búsqueda insensible a tildes** (hallazgo nuevo, no pedido esta vez):
  buscar "portatil" no encuentra "Portátil" — el `LIKE` de MySQL/Postgres
  es sensible al acento. No se tocó, queda para cuando se pida.
- Filtros adicionales de `inventoryMovements` (`product_id`, `type`,
  fechas) y `transactions` (`category_id`, `status`, fechas) existen en el
  backend pero no tienen UI conectada — no se les pasó `extraFilters` a
  `Pagination` porque no hay nada que preservar todavía.

## 9.6 Exports con nombre de archivo descriptivo y export de Dashboard completo (pedido 2026-08-07)

**Estado: ✅ hecho.** Ver commits del 2026-08-07: nombres de archivo
(factura y todos los exports Excel) pasaron a mayúscula + descriptivos +
fecha sin hora; el export del Dashboard (Excel y PDF) se reconstruyó con
logo, gráficos reales (nativos en Excel, SVG server-side en PDF) y ahora
siempre trae TODOS los períodos con TODA la info, sin importar el filtro
que esté activo en pantalla. De paso se encontraron y arreglaron dos bugs
reales que rompían el export en producción: `products.export` apuntaba a
un método que no existía (500 al hacer clic), y el nombre de hoja
`"Dashboard Report"` (con espacio) sin comillas en las referencias de
rango de los gráficos de Excel hacía que el parser de fórmulas lo
interpretara como un operador de intersección inválido
(`array_intersect_key(): string given` — el archivo se corrompía en
silencio).

## 9.7 Lógica de crecimiento % del Dashboard (pedido 2026-08-07)

**Estado: ✅ revisado y corregido.** Se pidió auditar si la fórmula de
crecimiento (comparar período actual vs. anterior) estaba bien. La fórmula
en sí (`(actual - anterior) / anterior * 100`, con tope a 100% cuando el
anterior es 0) ya era correcta — el problema real estaba en **cómo se
calculaba el rango "período anterior"**:

- **Bug real corregido:** en el período semestral, al estar en el 2º
  semestre el código comparaba contra el 1er semestre del **año pasado**
  (saltando 1.5 años) en vez del 1er semestre del **año actual** (el
  semestre inmediatamente anterior). `getPeriodDateRange()`.
- **Sesgo de comparación corregido:** el período "anterior" se comparaba
  completo (ej. mes anterior con sus 31 días) contra el período "actual"
  parcial (ej. 6 días transcurridos del mes en curso), lo que siempre daba
  caídas artificiales enormes (-98%) sin reflejar el ritmo real de ventas.
  Ahora el período anterior se recorta a la misma cantidad de días
  transcurridos que el actual (comparación equivalente, no período
  completo vs. parcial).
- **Limitación real que queda, no es un bug:** con solo ~90 días de datos
  sembrados, las comparaciones trimestral/semestral/anual necesitan un
  "período anterior equivalente" que cae *antes* del inicio de los datos
  — da 100% (convención de "sin histórico"), que es matemáticamente
  correcto dado que no hay más historia. Un negocio real con más tiempo
  operando no tendría este límite.
- **Seeder ampliado** (`SaleSeeder`) de 30 ventas sueltas en fechas
  aleatorias a ~180 ventas recorriendo día por día los últimos ~90 días
  (85% de probabilidad de vender algo cada día, 1-4 ventas por día
  cuando sí vende) — sin esto, meses/semanas enteras quedaban en cero por
  simple escasez de muestras, lo cual por sí solo ya generaba saltos de
  crecimiento sin sentido incluso con la fórmula bien calculada.

## 9.5 Calculadora de precio de venta por utilidad (pedido 2026-08-07)

**Estado: ✅ hecho.** El modal de crear/editar producto (`productForm.tsx`)
ya calculaba bien el IVA (sin IVA ↔ con IVA, bidireccional, 0%/19%/
personalizado) — se confirmó que esa parte no tenía bugs. Se agregó lo que
faltaba: un toggle "Manual" / "Por utilidad" junto al campo de precio de
venta. En modo "Por utilidad" se ingresa el % de utilidad deseado y el
precio de venta se calcula solo (`sale_price = price_with_tax * (1 +
utilidad/100)`, sobre el costo con IVA); en ambos modos se muestra siempre
la utilidad real actual (% y $) comparando `sale_price` contra
`price_with_tax`, en rojo si es negativa.

❌ No se agregó ningún campo de "descuento" al producto — no existe hoy en
el modelo `Product` y el pedido original no especificó qué representaría
(¿precio de lista vs. promocional?). El descuento que sí existe y funciona
es el de **ventas** (`saleForm.tsx`, por venta/factura). Si se quiere un
descuento a nivel de producto, hay que proponer el diseño del campo antes
de crear la migración (regla del proyecto).

✅ **Addendum 2026-08-06:** se agregó un % de utilidad sugerido por defecto
(`DEFAULT_PROFIT_PERCENT = 30`) al activar modo "Por utilidad" cuando no hay
todavía un precio de venta real por encima del costo (producto nuevo, o
`sale_price` sin editar) — antes el cálculo implícito daba un % negativo sin
sentido (`((0 - costo) / costo) * 100`) en vez de dejar un punto de partida
razonable. Nota explícita en el propio form: Colombia no fija por ley un
margen de utilidad para retail (a diferencia del IVA, que sí es 0%/19% por
ley), así que el 30% es solo una sugerencia editable, no un valor "correcto".

## 9. Seguridad de usuarios (pedido 2026-08-07)

**Estado: ✅ hecho.**

- Contraseña mínima subida de 6 a 12 caracteres + mayúsculas/minúsculas/
  números/símbolos, centralizada en `AppServiceProvider::boot()` vía
  `Password::defaults()` (aplica tanto a `UserRequest` como al cambio de
  contraseña en Ajustes).
- Botón "Generar contraseña" en `users/usersForm.tsx` que rellena
  contraseña + confirmación con una password aleatoria que cumple la
  política.
- Nueva columna `must_change_password` en `users` (editada en la migración
  original, no como `add_*` — regla del proyecto en DEV). Al crear un
  usuario queda en `true`; se resetea a `false` al guardar un cambio de
  contraseña exitoso en `Settings\PasswordController`.
- Modal global bloqueante (`force-password-change-modal.tsx`, montado en
  `app-sidebar-layout.tsx`) que aparece en cualquier página si
  `auth.user.must_change_password` es `true` — no se puede cerrar con Esc/
  click fuera, usa el mismo endpoint `password.update` que ya existía en
  Ajustes. Se excluye a sí mismo si el usuario ya está en `/settings/password`.
- Email de bienvenida (`App\Notifications\WelcomeUserNotification` +
  `emails/welcome_user.blade.php`, mismo patrón que `ResetPasswordNotification`)
  con URL de login, email y password en texto plano, enviado al crear un
  usuario desde `UserController::store()`.
- De paso: se sacó el logo hardcodeado de "Moto Repuestos Arcoiris" del
  email de reset de password (`emails/password_reset.blade.php`), ahora usa
  `config('business.name')` igual que la factura.

❌ **Pendiente / bloqueado:** el envío real de correo **no funciona en este
entorno** — la contraseña de aplicación de Gmail en `.env` (`MAIL_PASSWORD`)
está caducada/revocada (`535 5.7.8 Username and Password not accepted`
confirmado con un envío de prueba real). `MAIL_USERNAME` se cambió a
`rafarenas.dev@gmail.com` a pedido del usuario, pero falta generar una app
password nueva para esa cuenta en https://myaccount.google.com/apppasswords
y pegarla en `MAIL_PASSWORD`. El código de envío en sí está verificado
(el error es 100% de autenticación SMTP, no de lógica de la app).

## 10. Imagen de producto + Combobox en toda la app (pedido 2026-08-06, sesión tarde)

**Estado: ✅ hecho.**

### Campo de imagen de producto (`productForm.tsx`)

Rediseño completo pedido explícitamente: ancho completo, dropzone grande con
drag & drop, validación estricta de solo-imágenes, preview, animación de
carga y botón de eliminar.

- Validación **cliente** (defensa en profundidad, no la real): allowlist de
  MIME (`image/jpeg`, `image/png`, `image/gif`) + tamaño máx. 2MB antes de
  aceptar el archivo, tanto en `<input type="file">` como en `onDrop`.
- La validación **real** (servidor) ya existía y no se tocó:
  `'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048'` en
  `ProductController::store()`/`update()` — Laravel valida el contenido real
  del archivo, no solo la extensión.
- Preview con `<Loader2>` mientras el navegador decodifica la imagen
  (`onLoad`/`onError` del `<img>`, no un spinner falso), botón "Cambiar" y
  "Eliminar" superpuestos.
- **Bug de backend real encontrado y corregido en el camino:** `update()` no
  tenía forma de *borrar* una imagen existente — enviar `image_path` vacío no
  hacía nada (`elseif ($validated['image_path'])` nunca entra con string
  vacío, así que la imagen vieja se quedaba). Se agregó un flag
  `remove_image` (validado como boolean) que si viene en `true`, borra el
  archivo de `Storage::disk('public')` y deja `image_path` en `null`.

### Selects → Combobox en toda la app

Pedido repetido varias veces en la sesión ("los selects te pedi que todos
siempre sean tipo combobox... hay selects que traen demasiados valores y
hacer scroll siempre es molesto"). Se intentó primero un Combobox armado a
mano (Radix Popover + `cmdk`), pero tenía un bug de foco real dentro de un
Dialog (el input de búsqueda nunca quedaba enfocado al abrir) que no se pudo
resolver de forma confiable. Se descartó esa implementación y se usó la
oficial de shadcn en su lugar:

- **Instalación:** `@base-ui/react` (el Combobox de shadcn está construido
  sobre Base UI, no sobre Radix — el proyecto ya usa Radix para
  Dialog/DropdownMenu/etc., pero no había una versión Radix real de este
  componente en el registry pese a que la doc muestra tabs "Base UI / React
  Aria / Radix UI" — las tres tabs devuelven el mismo código Base UI).
  Descargado directo de `ui.shadcn.com/r/styles/new-york-v4/combobox.json` y
  `.../input-group.json` (el `components.json` del proyecto tiene
  `"style": "default"`, un nombre de estilo viejo que ya no resuelve en el
  registry actual — de ahí que `npx shadcn add combobox` fallara con 404).
  Archivos nuevos: `resources/js/components/ui/combobox.tsx`,
  `resources/js/components/ui/input-group.tsx`. `button.tsx` ganó los
  tamaños `icon-xs`/`icon-sm` que el registry de Combobox espera.
- **API real usada** (la que el usuario pidió, con `items` + render prop, no
  la que se había armado a mano primero):
  ```tsx
  <Combobox items={categories} itemToStringLabel={c => c.name} value={selected} onValueChange={setSelected}>
    <ComboboxInput placeholder="..." />
    <ComboboxContent>
      <ComboboxEmpty>No se encontraron resultados.</ComboboxEmpty>
      <ComboboxList>{(item) => <ComboboxItem key={item.id} value={item}>{item.name}</ComboboxItem>}</ComboboxList>
    </ComboboxContent>
  </Combobox>
  ```
  Para catálogos por id se pasa el **objeto completo** como `value` de cada
  `ComboboxItem` (no el id como string) y se resuelve el id en
  `onValueChange`/`itemToStringValue` — distinto al patrón de
  `<SelectItem value={id.toString()}>` que tenía el `<Select>` viejo.
- **Tres bugs reales encontrados y corregidos** (no cosméticos — sin esto el
  componente era inusable con mouse):
  1. **Clics no hacían nada dentro del popup.** Radix Dialog pone
     `pointer-events: none` en `<body>` mientras el modal está abierto (para
     bloquear el fondo) y solo reactiva `pointer-events: auto` en el propio
     subárbol del `DialogContent`. El popup del Combobox se porta aparte
     (`Portal` a `document.body`, fuera de ese subárbol), así que heredaba el
     `none` sin que nadie lo reactivara — el teclado sí funcionaba (no le
     afecta `pointer-events`), lo que ocultó el bug en las primeras pruebas.
     Fix: `pointer-events-auto` explícito en el `Positioner` del popup.
  2. **La rueda del mouse no hacía scroll en la lista** (arrastrar la
     scrollbar sí funcionaba, confirmando que era un problema específico de
     wheel, no de pointer-events). El scroll-lock del Dialog solo reconoce
     como "propio" el contenido dentro de su subárbol; al estar el popup en
     un portal aparte, el wheel se bloqueaba antes de llegar al
     `overflow-y-auto` de la lista. Fix: `onWheel` manual en `ComboboxList`
     que aplica el `deltaY` directo a `scrollTop`, sin depender del scroll
     nativo.
  3. **Fondo distinto al resto de inputs en modo oscuro.** `input-group.tsx`
     trae `dark:bg-input/30` (un tinte gris propio) que ni `<Input>` ni
     `<SelectTrigger>` tienen (ambos son `bg-transparent`). Fix: override a
     `bg-transparent dark:bg-transparent` en `ComboboxInput`.
- **Alto/tipografía:** se detectó que `productForm.tsx` usaba `<input>`/
  `<textarea>` a mano (42px, texto 16px fijo) en vez de los componentes
  compartidos `<Input>`/`<Textarea>` (36px, `h-9`, texto 14px en desktop) que
  usa el resto de la app. En vez de forzar el Combobox a 42px solo en ese
  archivo (parche local que hubiera vuelto a desalinear todo si se tocaba
  cualquier otro form), se estandarizó `productForm.tsx` para usar los
  mismos `<Input>`/`<Textarea>` que todos los demás — así el Combobox (que ya
  hereda el tamaño estándar de shadcn por defecto) queda pixel-idéntico en
  **todos** los forms sin overrides por archivo. Verificado con
  `getBoundingClientRect()` en el navegador, no a ojo.
- **Archivos convertidos** (los únicos que usaban `<select>` nativo o
  `<Select>` de shadcn en toda la app — confirmado con grep global antes y
  después, cero restantes):
  - `productForm.tsx`: categoría, proveedor (con botón "×" para limpiar,
    `showClear`), tipo de movimiento.
  - `clientForm.tsx`: tipo de documento, departamento, ciudad (los dos
    últimos eran el caso de uso real del pedido — ~32 departamentos con
    scroll nativo molesto).
  - `inventoryMovementForm.tsx`: tipo de movimiento, producto (~450
    movimientos sembrados, el select de producto era el más largo de toda
    la app).
  - `transactionForm.tsx`: tipo, categoría (filtrada por tipo), medio de pago.
  - `usersForm.tsx`: rol.
  - `pagination.tsx`: selector de "registros por página" (10/25/50/100) —
    convertido también pese a ser una lista fija corta, por consistencia
    total pedida explícitamente ("todos los selects, sin excepción").
  - **Limpieza:** `ui/select.tsx` (y su dependencia `@radix-ui/react-select`)
    quedó sin ningún import en toda la app — eliminado. El Combobox armado a
    mano que se descartó (`popover.tsx`, `command.tsx`, `cmdk`,
    `@radix-ui/react-popover`) también se eliminó por el mismo motivo.

❌ **Pendiente / no verificado de este punto:**
- No se probó el flujo completo de **crear** un registro nuevo (solo editar)
  en cada uno de los 6 forms convertidos — se verificó a fondo
  `productForm`/`clientForm` (incluida la cascada departamento→ciudad) y
  visualmente el resto, pero falta un pase de humo completo módulo por
  módulo antes de dar esto por 100% cerrado.
- **Hallazgo sin confirmar, no resuelto:** durante las pruebas volvió a
  aparecer la alerta de "Stock crítico"/"Productos agotados"
  (`notification-bell.tsx`) más seguido de lo esperado (el diseño es cada 45s
  con memoria de 30 min en `localStorage` para no repetir si nada cambió). No
  se determinó si es un bug real (¿la memoria se resetea en algún caso?) o si
  fue solo un artefacto de las pruebas automatizadas (clics con coordenadas
  de capturas viejas que a veces cerraban el modal y provocaban
  remontar el header). Revisar con uso normal antes de asumir que es un bug.
- No se corrió `npm run lint`/`npm run format` sobre los archivos tocados
  hoy (sí `tsc --noEmit` y `npm run build` después de cada cambio).

## 11. Caja automática, Estado activo/inactivo, y estandarización UI/UX (sesión larga 2026-08-07)

**Estado: ✅ hecho y verificado en el navegador**, salvo lo anotado al final.
Sesión muy larga con demanda explícita y repetida de "estandarización" (una
misma corrección debe aplicarse igual en todos los módulos, no solo donde se
detectó el problema). Commits (`git log`, en orden):

1. `style(theme)`: retoque de contraste sidebar/card/canvas (light y dark).
2. `feat(auth)`: rediseño del menú de usuario — modales de Perfil/Contraseña
   inline, switch de tema sol/luna, se elimina la página estática de
   Configuración. El estado de apertura del modal se subió a `NavUserMenu`
   (padre) porque `UserMenuContent` (hijo, dentro del `DropdownMenuContent`
   que se desmonta al cerrar) mataba el modal antes de que renderizara.
3. `feat`: **Estado (activo/inactivo)** para Usuarios, Categorías, Proveedores
   y Clientes — switch verde/rojo directo en la tabla (`StatusToggle`,
   autocontenido: confirma con SweetAlert y dispara el PATCH él mismo). Login
   bloqueado para usuarios inactivos. Reactivación automática: crear un
   producto/movimiento reactiva su categoría; una venta reactiva al cliente.
   Nuevo comando `app:deactivate-inactive-entities` (categorías sin productos
   60+ días, clientes sin ventas 90+ días) — disparado una vez al día desde
   el primer login (`routes/console.php`), no vía `Schedule`, porque esta PC
   no es un servidor 24/7.
4. `feat(cash-register)`: **caja con horario automático** — se abre sola en
   el primer login del día (8:00am–6:30pm) y se cierra sola al hacer logout,
   cada una con aviso SweetAlert (~30s después del login, no interrumpe de
   inmediato). Abrir/cerrar caja pasó a ser exclusivo de Admin (antes Cajero
   también podía). **Bug real corregido:** `total_sales` se guardaba en
   centavos mientras `total_income` estaba en pesos (descuadre de 100x,
   encontrado por el usuario con un dump crudo de BD) — se corrigió el
   cálculo y se hizo backfill de los registros ya cerrados. Se separó
   "Ventas" de "Otros Ingresos" en vez de sumarlos (una venta ya genera su
   propia Transacción tipo Ingreso, sumarlas de nuevo duplicaba el monto).
   "Diferencia" se renombró a "Resultado del Día" (no hay caja física que
   contar, el nombre anterior sugería una reconciliación que no aplica). Se
   quitó el botón "X" por fila y la columna Acciones completa de la tabla;
   cerrar la caja de hoy es ahora un botón "Cerrar Caja" en el header
   (mismo lugar y estilo que "Abrir Caja", en rojo). Se agregó
   `FlashErrorWatcher` global — `flash.error`/`flash.success` nunca tenían
   consumidor en el frontend pese a que el middleware ya los compartía.
5. `fix`: búsqueda **case-insensitive** en toda la app — Postgres's `LIKE` es
   sensible a mayúsculas (a diferencia de MySQL), se reemplazó por `ilike`
   (soportado nativo por Laravel) en los ~12 controladores con filtro de
   búsqueda. De paso se corrigió un `SQLSTATE[42803]` real que rompía
   Finanzas en producción (`(clone $query)->selectRaw(...)` heredaba un
   `orderBy` incompatible con un SELECT solo-agregado en Postgres sin
   `GROUP BY` — se agregó `->reorder()`).
6. `feat`: modal de cliente **unificado** (info + historial de compras en
   uno solo, antes dos modales separados), con filtro Año/Mes (default al
   mes actual). Nuevo componente compartido `PeriodFilter` (solo Año+Mes,
   sin trimestre/semestre) reusado en Caja, Finanzas, Ventas y Movimientos
   de Inventario — el backend defaultea `date_from`/`date_to` al mes actual
   cuando no llega filtro, y devuelve el default aplicado en `filters` para
   que la UI no tenga que adivinar. Fix de formato de moneda faltante en el
   export a Excel de Ventas (los montos se escribían como números crudos
   sin separador de miles, a diferencia de Caja/Finanzas que sí lo tenían).
7. `style`: **estandarización de tablas y layout** en los 10 módulos —
   altura de fila única (`TableCell`, misma que ya tenía Proveedores con
   teléfono+celular), íconos de acción e interruptores más chicos,
   badges con el mismo padding vertical y paleta (emerald/rose/amber/zinc
   en vez de la mezcla verde/rojo/azul/naranja de antes — Movimientos de
   Inventario tenía 9 tonos distintos para lo que en realidad es solo
   entra/sale/ajuste). Badges de permisos de Roles ya no envuelven a 2-3
   líneas (capados a 4 + "+N"). La card de cada módulo replica ahora
   exactamente el panel de Resumen Financiero del Dashboard: mismo shadow,
   esquinas redondeadas sin condicionar a `sm:` (se veían cuadradas en
   mobile), y `flex-1` cuando hay paginación activa para que el margen
   inferior de la card quede igual al superior (antes quedaba un espacio
   muerto irregular abajo). El filtro Año-Mes pasó de ocupar su propia fila
   a un botón compacto con ícono + popover (nuevo primitivo `Popover`,
   porque el Combobox de Base UI se porta mal dentro de un `DropdownMenu`
   de Radix), con fondo `bg-card` (no `bg-background`) y sin robar el foco
   al abrir. Botones de Exportar unificados al estilo del propio botón
   Exportar del Dashboard. Placeholders de búsqueda en minúscula en toda la
   app; texto redundante "Mostrando X de Y" eliminado (ya lo muestra
   `Pagination`).

❌ **Pendiente explícito para la próxima sesión** (pedido directo del
usuario, en este orden):
- **Modales "Ver" (show)** para Usuarios, Proveedores, Categorías,
  Movimientos de Inventario y Finanzas — siguiendo el precedente de
  `clientDetailModal.tsx`/`productModal.tsx`, ya que sus tablas no exponen
  todas las columnas de la BD.
- **Refactor a componentes reutilizables**: todas las tablas (`*Table.tsx`)
  y modales de create/edit repiten la misma estructura (search + tabla +
  paginación; form con los mismos patrones de Dialog/confirm/dirty-check),
  solo cambian las columnas, los campos y los colores de botones por
  módulo. Diseñar un `DataTable`/`ResourceTable` genérico (columnas,
  render de celda, acciones y badges como parámetros) y un `ResourceModal`/
  `FormModal` genérico para create/edit, de forma que cada `index.tsx` solo
  pase parámetros (columnas, endpoints, permisos) en vez de reimplementar
  la tabla completa — reduce archivos y código duplicado entre los 10
  módulos. **Diseñar y proponer la forma de estos componentes antes de
  migrar los módulos uno por uno** (no reescribir los 10 de una).
- No se auditó el modo claro a fondo en esta sesión (la mayoría de
  verificación fue en oscuro) — revisar los nuevos tonos emerald/rose/
  amber/zinc y el popover del filtro también en tema claro.
- Responsive real en pantallas angostas (móvil) sigue sin poder probarse de
  forma confiable con el navegador automatizado — pendiente de una pasada
  visual real del usuario.

## 12. [DISEÑO APROBADO, PENDIENTE DE IMPLEMENTAR] Sidebar agrupada, versión/copyright, módulo Pedidos y rediseño de alertas de stock (pedido 2026-08-07)

**Estado: 📋 diseño aprobado por el usuario 2026-08-07, sin código todavío**
(salvo el punto 12.6, ya aplicado). Antes de tocar los 10 módulos o crear
tablas nuevas, este documento es la referencia — seguir el flujo normal del
proyecto: implementar, verificar en navegador, y solo entonces marcar ✅.

## 12.1 Sidebar agrupada + versión + copyright

- La lista de módulos de la sidebar **ya vive en BD** (tabla `modules`:
  `key, label, icon, route, order, is_active`, compartida vía Inertia en
  `HandleInertiaRequests`, `ModuleSeeder` la puebla). Se le agrega una
  columna `group` (string, nullable — `null` = sin grupo, como Dashboard),
  editando la migración original (`2026_08_05_164932_create_modules_table`)
  + `ModuleSeeder`, no una migración `add_*` nueva (regla del proyecto en
  DEV: editar + `migrate:fresh --seed`).
- Grupos y contenido:
  - *(sin grupo, arriba)* Dashboard.
  - **Administración**: Usuarios, Roles y Permisos.
  - **Inventario**: Categorías, Productos, Proveedores, Movimientos de
    Inventario, **Pedidos** (nuevo, ver 12.2).
  - **Ventas**: Ventas, Clientes, Caja, Finanzas.
- `nav-main.tsx` ya soporta un patrón de `Collapsible` (hoy pensado para un
  item padre con sub-items); se adapta para agrupar por `group` con
  `SidebarGroupLabel`/`SidebarGroupContent` (ya existen en `ui/sidebar.tsx`,
  no hace falta un componente nuevo) envueltos en `Collapsible`. Estado
  abierto/cerrado por grupo persistido en `localStorage` (clave por grupo,
  mismo patrón que ya usa `notification-bell.tsx` para su memoria).
- Separador (`SidebarSeparator`, ya existe en `ui/sidebar.tsx`) entre el
  logo (`SidebarHeader`) y la lista de grupos.
- **Pie de la sidebar** (`SidebarFooter`, nuevo): versión + copyright en una
  línea compacta, ej. `v1.0.0 · © 2025–2026 RafArenasDev`. Misma línea (sin
  la versión) en el footer de `login.tsx`.
- **Versionado:**
  - Fuente única: `APP_VERSION` en `.env`, default en `config/app.php`
    (`'version' => env('APP_VERSION', '1.0.0')`), compartido por Inertia
    (mismo mecanismo que `modules`/`flash`).
  - `git tag v1.0.0` se crea cuando este punto 12 quede implementado y
    verificado — primera versión "completa": el negocio ya puede vender,
    cobrar, inventariar, **y** reabastecer desde la propia app. Versiones
    `v1.x.0` para mejoras incrementales después. `v2.0.0` queda reservada
    para cuando se cierre el resto de este documento (responsive real, PWA,
    tests) — el hito de "portfolio-ready".
  - Copyright: derecho de autor de software nace automático al crearlo (no
    requiere RUT ni Cámara de Comercio — eso es para operar como
    comerciante, algo aparte). Primer commit real: 1 de junio de 2025
    (verificado con `git log --reverse`), de ahí el rango `2025–2026`.

## 12.2 Módulo Pedidos (nuevo)

Órdenes de compra a proveedores, para reabastecer productos agotados/bajos
sin salir de la app.

- **`purchase_orders`**: `id, supplier_id (FK), status, requested_by (FK
  users), notes, expected_at (nullable), received_at (nullable),
  timestamps`.
- **`purchase_order_items`**: `id, purchase_order_id (FK), product_id (FK),
  quantity_requested, quantity_received (default 0), unit_cost (nullable),
  timestamps`.
- Un Pedido = un proveedor + N líneas de producto (como una Venta con
  ítems) — no un pedido suelto por producto.
- **Estados: `Solicitado` → `Recibido`, + `Cancelado`** como salida en
  cualquier punto antes de Recibido. Sin estados intermedios de tránsito
  (decisión explícita del usuario: no quiere trazabilidad de transportadora
  ni integraciones de courier — eso sería mucho más desarrollo sin aportar
  a un negocio de este tamaño).
- `Recibido` se marca **automático** cuando un movimiento de inventario
  (manual o por carga masiva, ver 12.4) cubre `quantity_requested` de sus
  líneas — no hay botón manual de "marcar recibido" en el v1 (si algún día
  hace falta un cierre parcial/forzado, se agrega después).
- Permisos siguiendo el patrón existente (`spatie/laravel-permission`):
  `Ver Pedidos`, `Crear Pedidos`, `Actualizar Pedidos`, `Eliminar Pedidos`,
  `Exportar Pedidos` — asignar a Admin/Bodega en `RoleSeeder`.
- Tabla propia `pedidos/index.tsx` + `pedidosTable.tsx`, con badge de
  estado (mismo estilo/paleta ya estandarizado: emerald=Recibido,
  amber=Solicitado, rose=Cancelado) y filtro Año/Mes (`PeriodFilter`, ya
  existe) por fecha de creación.

## 12.3 Rediseño del modal de alertas de stock bajo

Reemplaza el `SweetAlert` emergente y el `DropdownMenuContent` chico
actuales de `notification-bell.tsx`.

- Clic en la campana → abre un `Dialog` grande (mismo tamaño que Roles y
  Permisos), agrupado **por proveedor**: nombre + botón WhatsApp del
  proveedor, y debajo sus productos agotados/bajos con badge de severidad
  (reutiliza los tiers `advertencia/crítico/agotado` ya existentes).
- Acciones por proveedor: **"Pedir con este proveedor"** (abre el modal de
  Nuevo Pedido — modal sobre modal — con proveedor y productos
  preseleccionados) y **"Cambiar de proveedor"** (mismo modal de Nuevo
  Pedido, pero con el selector de proveedor abierto en vez de fijo).
- Modal de Nuevo Pedido: proveedor (fijo o `Combobox`), líneas
  producto+cantidad (precargadas desde la alerta, editables), notas. Al
  guardar (`status=Solicitado`), aparece un botón **"Enviar por WhatsApp"**
  que arma el mensaje con la lista de productos solicitados y abre
  `wa.me/<celular del proveedor>` — mismo patrón `formatWhatsAppNumber()`
  ya construido en `saleDetailModal.tsx`, reusado tal cual.
- **El modal nunca se abre solo** — decisión explícita del usuario, mismo
  criterio que ya se aplicó a la caja (no interrumpir el flujo de trabajo).
  Solo lo abre el usuario, con clic en la campana o en una notificación del
  sistema operativo (ver abajo).
- **Badge de la campana:**
  - Cuenta = número de productos crítico/agotado **sin** un Pedido activo
    (`Solicitado`) que los cubra. Anima con `animate-pulse` + un aro de
    color mientras el conteo sea &gt; 0 — llamativo a propósito.
  - **No se resetea por abrir el modal ni por verlo** — solo se resetea
    (deja de contar ese producto) cuando se crea un Pedido que lo cubre.
    Si el Pedido se cancela, el producto vuelve a sumar al badge si sigue
    bajo de stock.
- **Notificación nativa del navegador/SO** (`Notification` API — gratis, ya
  incluida en cualquier navegador moderno, sin servicio nuevo ni permiso de
  pago): se dispara una vez apenas un producto cruza a crítico/agotado sin
  Pedido activo, y como recordatorio cada **2 horas** (antes eran 30 min,
  demasiado seguido) mientras siga sin Pedido — **solo dentro del horario
  laboral 8:00am–6:30pm** (mismas constantes `BUSINESS_OPEN`/
  `BUSINESS_CLOSE` que ya usa `CashRegisterController`, para no despertar
  a nadie con la pestaña olvidada abierta de noche o el fin de semana).
  Clic en la notificación enfoca la pestaña de la app (no abre el modal
  solo — el usuario decide si hace clic en la campana después).
  Requiere pedir permiso del navegador una vez (`Notification.
  requestPermission()`), con manejo explícito de "permiso denegado" (la
  campana sigue funcionando igual, solo sin el aviso del SO).
- Sin AI/MCP: se descartó explícitamente — una máquina de estados simple
  (las tablas de 12.2 + estas reglas) cubre todo lo pedido sin costo ni
  complejidad extra, apropiado para un negocio de este tamaño. Sugerencias
  de reorden con IA quedan anotadas como posible mejora futura, fuera de
  alcance ahora.

## 12.4 Carga masiva de productos/movimientos (Excel/CSV)

Una sola pieza reutilizable (`App\Services\ImportInventoryBatch` o similar,
usando `phpoffice/phpspreadsheet` ya instalado — soporta leer .xlsx/.csv,
no hace falta ninguna librería nueva), con botón "Importar" en tres
lugares: `products/index.tsx`, `inventoryMovements/index.tsx`, y dentro del
detalle de un Pedido (ahí, además, alimenta `quantity_received`).

- Columnas de la plantilla: `codigo, nombre, categoria, proveedor,
  precio_sin_iva, iva_porcentaje, precio_venta, cantidad, tipo_movimiento,
  fecha, notas`. `nombre/categoria/proveedor/precios` son opcionales si
  `codigo` ya existe (solo hace falta para crear un producto nuevo).
- Flujo: (1) parsear el archivo completo, (2) validar TODAS las filas
  primero (dry-run, sin tocar la BD) y mostrar una vista previa — fila por
  fila, "crea producto nuevo" / "registra movimiento" / error — (3) el
  usuario confirma, (4) se ejecuta todo dentro de una transacción de BD.
- Crear un producto nuevo desde el importador **reutiliza la lógica que ya
  existe** en `ProductController::store()` (incluido el movimiento inicial
  automático con la nota "Primer pedido del proveedor X") — no se duplica
  esa lógica en el importador.
- Si se invoca desde un Pedido, cada fila procesada además intenta calzar
  contra sus líneas (`purchase_order_items`) por `product_id`, suma a
  `quantity_received`, y dispara el cierre automático (12.2) si con eso
  quedó completo.
- Botón "Descargar plantilla" (Excel en blanco con esas columnas,
  reutilizando el mismo `PhpSpreadsheet` que ya generan los exports).

## 12.5 Auditoría Postgres + barrido final (después de implementar 12.1-12.4)

Pedido explícito del usuario para **después** de que el módulo de Pedidos
esté funcionando: revisar que todo el código quede estandarizado para
Postgres (recordar que el proyecto migró de MySQL a Postgres — ver "Estado
al cierre... 2026-08-06" y la sección de contexto al inicio de este
documento) — buscar cualquier función SQL específica de MySQL que haya
quedado (`DB::raw`, `selectRaw`, `whereRaw`, `having` sin verificar,
`ENUM` de MySQL vs `CHECK` de Postgres, etc.), y cerrar con un resumen
general de todo lo hecho en el proyecto vs. lo que queda pendiente.

## 12.6 Ya aplicado (sin esperar al resto del punto 12)

✅ **`SESSION_LIFETIME`** subido de 120 a **630 minutos** (exactamente
8:00am–6:30pm) en `.env`/`.env.example` — antes cualquiera que entrara a
las 8am quedaba desconectado a las 10am, mucho antes de terminar turno.
Nota: Laravel usa una sesión "sliding" (el contador se reinicia con cada
request), así que mientras el usuario siga usando la app durante el día
esto prácticamente no expira — el valor solo importa si la pestaña queda
totalmente inactiva. **No afecta** el cierre automático de caja al hacer
logout (`AuthenticatedSessionController::destroy()`) — ese se dispara por
la petición explícita de logout, no por expiración de sesión; son dos
mecanismos independientes.

---

## Orden sugerido de ejecución

1. Diseño consistente (punto 2) — establece la base visual para todo lo demás.
2. Modales unificados (punto 1) — el cambio estructural más grande de UI.
3. Responsive (punto 3) — más fácil de validar una vez el diseño ya es consistente.
4. ~~Alertas dinámicas de inventario (punto 5)~~ — ✅ hecho 2026-08-06.
5. ~~Seeds completos + usuario demo (punto 6)~~ — ✅ mayormente hecho 2026-08-06,
   ver pendientes puntuales en el punto 6 (usuario demo único, comando de
   reseteo, decisión sobre `docker/entrypoint.sh`).
6. PWA (punto 4) — es más independiente del resto, se puede hacer en paralelo o
   al final.
7. Calidad de código / tests (punto 7) — transversal, ir aplicando en cada PR,
   pero hacer una pasada final antes de cerrar el refactor. Tests en pausa
   mientras dure el MVP.
8. ~~Combobox (punto 8)~~ — ✅ hecho 2026-08-06, ver sección 10.
9. Catálogos en BD (punto 8) — proponer el diseño de las tablas nuevas para
   aprobación antes de construir (tipos de movimiento de inventario,
   métodos de pago). Ya no depende del Combobox, que quedó listo.
10. WhatsApp (punto 8) — pausado a propósito; retomar cuando el usuario lo
    pida de nuevo, confirmando primero viabilidad de Baileys en Render free
    tier (persistencia de sesión) o decidiendo ir por la API oficial de Meta.

## Próxima sesión — por dónde seguir

Lo más práctico para retomar, en orden de impacto (actualizado tras el
diseño aprobado del punto 12):

1. **Implementar el punto 12** (diseño ya aprobado 2026-08-07, ver esa
   sección para el detalle completo): sidebar agrupada + versión/
   copyright, módulo Pedidos, rediseño del modal de alertas de stock, e
   importador masivo Excel/CSV. Seguir el orden interno 12.1 → 12.4 (la
   sidebar y el modelo de Pedidos son la base de todo lo demás). Cerrar con
   12.5 (auditoría Postgres + barrido general) una vez lo anterior esté
   verificado en el navegador.
2. **Diseñar y proponer** (antes de escribir código) los componentes
   reutilizables de tabla y modal descritos en el punto 11 — considerar
   hacerlo junto con el punto 12 ya que el módulo Pedidos y su tabla son
   una oportunidad natural de estrenar ese patrón en vez de escribirlo "a
   mano" una vez más.
3. **Modales "Ver" (show)** para Usuarios, Proveedores, Categorías,
   Movimientos de Inventario y Finanzas — implementarlos ya usando el
   componente reutilizable del punto 2 si quedó listo, para no duplicar
   trabajo dos veces.
4. **Auditar modo claro** de los tonos nuevos (emerald/rose/amber/zinc,
   popover del filtro Año-Mes) — la verificación del punto 11 fue
   mayormente en tema oscuro.
5. **Responsive total (punto 3):** sigue sin poder auditarse en un viewport
   angosto real de forma confiable con el navegador automatizado — hacerlo
   con la ventana del navegador real del usuario.
6. **Catálogos en BD (punto 8):** proponer diseño de tablas para tipos de
   movimiento y métodos de pago antes de construir (el Combobox que los va
   a mostrar ya está listo).
7. **PWA (punto 4):** no depende de nada de lo anterior, se puede hacer en
   paralelo si se prefiere.
8. **WhatsApp:** retomar la investigación de Baileys + Render solo cuando el
   usuario lo pida explícitamente otra vez (quedó pausado a propósito).

## Criterios de aceptación

- [ ] Ningún módulo navega a una página completa para crear/editar; todos usan
      modal con blur de fondo. *(parcial: Roles y Ventas sí; resto sin verificar)*
- [ ] Las vistas se ven consistentes entre sí (mismo lenguaje visual).
      *(parcial: Dashboard y Ventas sí; resto de módulos sin auditar)*
- [ ] La app es usable de principio a fin en un viewport de 375px de ancho.
      *(sin verificar esta sesión)*
- [ ] Lighthouse PWA score en verde / app instalable en Chrome y Android.
      *(no iniciado)*
- [ ] Existe un usuario demo con datos realistas en todas las tablas y forma de
      resetearlos. *(datos realistas ✅; usuario demo único y comando de
      reseteo ❌)*
- [x] Las alertas de stock bajo son visibles sin tener que buscarlas. — ✅
      campana + SweetAlert real, 2026-08-06.
- [ ] `vendor/bin/pint` y los linters de frontend pasan sin errores.
      *(no se corrió una pasada final esta sesión — sí se corrieron
      `tsc --noEmit`, `npm run build` y `php -l` en cada archivo tocado)*

## Fuera de alcance de este documento

- Migración de MySQL a PostgreSQL (es una decisión pendiente aparte, solo
  relevante si se despliega en VPS propio en vez de Render+Aiven).
- Todo lo del portfolio en sí (sitio, capturas, video, publicación en LinkedIn).
- El proyecto StockPro (SaaS multi-tenant) — este documento es solo para
  Inventory Manager.
