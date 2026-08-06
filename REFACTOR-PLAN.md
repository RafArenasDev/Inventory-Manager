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

## Objetivo general

Llevar el código y la UI de "funcional" a "profesional / portfolio-ready", sin
perder ninguna funcionalidad actual. Los entregables de este refactor son
exclusivamente técnicos (código). Todo lo de portfolio en sí (web, capturas,
video, LinkedIn) se hace después, fuera de este repo.

---

## 1. Unificar todos los Create/Edit en modales

**Estado actual:** inconsistente. Solo `products` tiene `productModal.tsx`
(y `clients` tiene `clientHistoryModal.tsx`, pero es para ver historial, no
crear/editar). El resto de módulos usa un `*Form.tsx` como página completa
separada:

- `cashRegister/cashRegisterForm.tsx`
- `categories/categoryForm.tsx`
- `clients/clientForm.tsx`
- `inventoryMovements/inventoryMovementForm.tsx`
- `permissions/permissionForm.tsx`
- `roles/roleForm.tsx`
- `sales/saleForm.tsx`
- `suppliers/supplierForm.tsx`
- `transactions/transactionForm.tsx`
- `users/usersForm.tsx`

**Qué hacer:**

- Tomar `products/productModal.tsx` como referencia de patrón (o rediseñarlo si
  tampoco cumple con lo de abajo) y aplicar el mismo enfoque a **todos** los
  módulos de la lista.
- Cada modal debe abrir sobre la tabla/índice actual (sin navegación de página
  completa), con:
  - Backdrop con blur (`backdrop-blur-sm` o similar) y oscurecido semitransparente
    del fondo.
  - Animación de entrada/salida suave (usar lo que ya provee `dialog.tsx`/Radix,
    no reinventar).
  - Cierre con `Esc`, click fuera, y botón "Cancelar" — sin perder datos sin
    confirmar si el formulario tiene cambios sin guardar (confirmar antes de
    cerrar si hay "dirty state").
  - Foco automático en el primer campo al abrir (accesibilidad).
- Los formularios existentes (`*Form.tsx`) se convierten en el contenido interno
  del modal — reutilizar la lógica de validación/envío que ya tienen, solo
  cambiar el contenedor visual.
- Verificar que las rutas/controladores sigan devolviendo lo necesario para
  Inertia (probablemente ya no necesitan una ruta de página completa para
  create/edit, solo el endpoint POST/PUT — revisar `routes/web.php` y limpiar
  rutas que ya no se usen).

## 2. Diseño consistente en todas las vistas

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

- Revisar cómo se calculan hoy las alertas de stock bajo (buscar en
  `InventoryMovement`, `Product`, dashboard).
- Mejorar para que sean dinámicas en vez de estáticas: ej. badge de "stock bajo"
  visible en la tabla de productos, contador en el dashboard, y notificación
  visual (toast o badge en el sidebar) cuando un producto cruza el umbral mínimo
  configurado.
- Si tiene sentido, permitir configurar el umbral mínimo por producto (columna
  ya existe o hay que migrarla — revisar `products` migration).

## 6. Seeds completos + perfil de demo con reseteo

**Objetivo:** cualquier reclutador que pida ver la demo debe poder loguearse con
un usuario "demo", ver la app completamente poblada con datos realistas (no
inventados a lo loco, pero tampoco datos reales del negocio de mi familiar), y
usar TODAS las funciones sin miedo a romper nada — porque los datos de demo se
pueden resetear.

- Completar seeders para **todas** las tablas con datos realistas: categorías,
  proveedores, productos (con variedad de stock, algunos en alerta de stock
  bajo a propósito para mostrar el punto 5), clientes, ventas históricas,
  movimientos de inventario, cajas registradoras, transacciones.
- Crear un usuario/rol **"demo"** separado del `admin`/`seller` reales:
  - Mismos permisos que admin (para que pueda ver todo), pero identificado
    claramente (ej. `demo@demo.com`).
  - Documentar la contraseña en el `.env.example` de forma clara con un
    comentario "solo para entorno demo", nunca usar esa cuenta con datos
    sensibles reales.
- Mecanismo de reseteo de datos demo: opción simple (comando artisan tipo
  `php artisan demo:reset` que corre `migrate:fresh --seed` limitado al set de
  datos de demo) que se pueda ejecutar manualmente cuando el demo "se ensucie"
  por el uso de visitantes. Evaluar si vale la pena automatizarlo con un cron
  en el VPS más adelante (no es urgente para Render).
- Importante: este seeding completo es **distinto** al seeding mínimo que ya
  corre en `docker/entrypoint.sh` en producción (que hoy solo siembra permisos,
  roles y usuarios a propósito). Decidir explícitamente cuál de los dos
  comportamientos queremos en el Render actual antes de tocar el entrypoint:
  ¿dejamos Render con datos de demo completos (recomendado, ya que ese es su
  propósito ahora: mostrar el trabajo) o mantenemos tablas limpias? Si se opta
  por datos de demo completos, actualizar `docker/entrypoint.sh` para llamar al
  `DatabaseSeeder` completo (o a un `DemoSeeder` dedicado) en lugar de solo los
  tres seeders actuales.

## 7. Calidad de código general

- Revisar convenciones de nombres (mezclas de `camelCase` en archivos como
  `productModal.tsx` vs. posibles inconsistencias en otros) y unificar.
- Tipar correctamente todo con TypeScript (evitar `any`), aprovechar los tipos
  ya generados por Wayfinder para rutas/controladores.
- Revisar N+1 queries en controladores (usar `with()` donde falte eager loading).
- Añadir/completar tests de Pest para los flujos de CRUD críticos (ventas,
  movimientos de inventario, productos) — el proyecto ya tiene algunos tests de
  auth, seguir ese patrón.
- Correr `vendor/bin/pint --dirty --format agent` y el lint de frontend
  (`npm run lint`, `npm run format`, `npm run types:check` si existen en
  `package.json`) antes de dar por terminado cualquier cambio.

---

## Orden sugerido de ejecución

1. Diseño consistente (punto 2) — establece la base visual para todo lo demás.
2. Modales unificados (punto 1) — el cambio estructural más grande de UI.
3. Responsive (punto 3) — más fácil de validar una vez el diseño ya es consistente.
4. Alertas dinámicas de inventario (punto 5).
5. Seeds completos + usuario demo (punto 6) — decidir y aplicar antes de grabar
   video/capturas para el portfolio.
6. PWA (punto 4) — es más independiente del resto, se puede hacer en paralelo o
   al final.
7. Calidad de código / tests (punto 7) — transversal, ir aplicando en cada PR,
   pero hacer una pasada final antes de cerrar el refactor.

## Criterios de aceptación

- [ ] Ningún módulo navega a una página completa para crear/editar; todos usan
      modal con blur de fondo.
- [ ] Las vistas se ven consistentes entre sí (mismo lenguaje visual).
- [ ] La app es usable de principio a fin en un viewport de 375px de ancho.
- [ ] Lighthouse PWA score en verde / app instalable en Chrome y Android.
- [ ] Existe un usuario demo con datos realistas en todas las tablas y forma de
      resetearlos.
- [ ] Las alertas de stock bajo son visibles sin tener que buscarlas.
- [ ] `vendor/bin/pint` y los linters de frontend pasan sin errores.

## Fuera de alcance de este documento

- Migración de MySQL a PostgreSQL (es una decisión pendiente aparte, solo
  relevante si se despliega en VPS propio en vez de Render+Aiven).
- Todo lo del portfolio en sí (sitio, capturas, video, publicación en LinkedIn).
- El proyecto StockPro (SaaS multi-tenant) — este documento es solo para
  Inventory Manager.
