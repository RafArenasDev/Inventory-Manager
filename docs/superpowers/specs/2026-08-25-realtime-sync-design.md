# Sincronización en tiempo real entre sesiones — diseño

**Fecha:** 2026-08-25
**Estado:** Aprobado, en implementación (arranca por Pedidos como slice vertical de referencia).

## Problema

La app permite varias sesiones simultáneas (distintos usuarios, distintos
dispositivos: PC, celular, tablet). Hoy, si un usuario crea, edita o recibe
algo, las demás sesiones abiertas no se enteran hasta que el usuario vuelve
a esa pestaña (stopgap de `window.addEventListener('focus', ...)`) o
recarga manualmente. Se requiere que cualquier cambio guardado por un
usuario sea visible para las demás sesiones activas de forma automática,
sin refrescos manuales ni depender del foco de la ventana.

Fuera de alcance explícito: edición colaborativa carácter-por-carácter
(tipo Google Docs) dentro de un mismo formulario — este es un CRUD de
formularios de negocio, no un editor colaborativo, y nadie edita el mismo
campo a la vez en el flujo normal de uso.

## Diseño

### Backend — Laravel Reverb

Se instala `laravel/reverb` (paquete de primera parte, sin dependencia de
un servicio externo de pago). Cada modelo de negocio recibe un trait
`BroadcastsModelChanges` que se engancha a los eventos de Eloquent
(`created`, `updated`, `deleted`) y transmite un evento minúsculo —
`{model, action, id}`, sin datos sensibles del registro — por un canal
propio del dominio del modelo. Agregar tiempo real a un modelo nuevo el
día de mañana es una línea (`use BroadcastsModelChanges;`), no tocar cada
controller.

Modelos que reciben el trait (cobertura universal de la app de negocio):
`PurchaseOrder`, `PurchaseOrderItem`, `Product`, `Category`, `Supplier`,
`InventoryMovement`, `Sale`, `SaleItem`, `Client`, `Transaction`,
`TransactionCategory`, `CashRegister`.

Quedan fuera (datos de sistema/referencia, bajo valor de tiempo real):
`User`, `Role`, `Permission`, `Module`, `Department`, `City`.

Canales: privados, autenticados por sesión de Laravel (cualquier usuario
logueado puede escuchar — app interna de un solo negocio, ya ve estos
datos por las páginas normales, no hace falta presence channels).

### Frontend — Laravel Echo + Reverb JS

Cliente Echo inicializado una vez en `app.tsx`. Hook
`useLiveRefresh(canales: string[], onEvent)` que cada página usa para
suscribirse solo a los canales que le importan y reaccionar con un
refresco silencioso de sus propios props (Inertia partial reload sobre
las mismas rutas `*.search` que ya existen, sin navegar ni perder
scroll/filtros). El `NotificationBell` se suscribe al canal de
`inventory` para refrescar alertas al instante.

### Caso de colisión: edición concurrente del mismo registro

Si dos usuarios tienen abierto el mismo formulario de edición al mismo
tiempo, el evento de "otro guardó este registro" NO dispara un refresco
silencioso ahí (pisaría lo que el segundo usuario está escribiendo). En
su lugar se muestra un aviso no intrusivo tipo mesa de ayuda — "Este
registro fue actualizado por otro usuario — Actualizar" — que el usuario
dispara manualmente. Es el único punto de la app con ese patrón; en
tablas, listas y vistas de solo lectura el refresco es automático.

### Operación

Reverb necesita un proceso propio corriendo (`php artisan reverb:start`)
además de Herd. Se deja documentado cómo levantarlo en local (script /
tarea programada) — de no poder automatizarse con Herd, queda como
proceso manual mientras se prueba.

## Plan de rollout

1. Slice vertical completo en **Pedidos**: paquete instalado, trait,
   canal `purchase-orders`, Echo configurado, Pedidos + NotificationBell
   escuchando y refrescando. Sirve de patrón de referencia.
2. Replicar el mismo patrón (trait + canal + hook) al resto de módulos:
   Productos/Categorías/Proveedores/Movimientos (canal `inventory`),
   Ventas (canal `sales`), Clientes (canal `clients`), Transacciones/Caja
   (canal `finance`).
3. Aviso de colisión de edición concurrente, aplicado donde haya
   formularios de edición reutilizables.

## Estado al cierre de la sesión (2026-08-25, noche) — créditos agotados

**Hecho y verificado en vivo (dos navegadores + celular por túnel):**
- `laravel/reverb` instalado, `laravel-echo` + `pusher-js` en el frontend.
- Trait `App\Models\Concerns\BroadcastsModelChanges` (evento `App\Events\ModelChanged`,
  `ShouldBroadcastNow`) aplicado a los 12 modelos de negocio listados arriba,
  cada uno en su canal de dominio (`purchase-orders`, `inventory`, `sales`,
  `finance`, `clients`). Autorización de esos 5 canales en `routes/channels.php`
  (cualquier usuario logueado).
- `resources/js/lib/echo.ts` (cliente Echo compartido, autoriza contra
  `/broadcasting/auth`) y `resources/js/hooks/use-live-refresh.ts` (hook de
  suscripción + refresco).
- Wireado en: `notification-bell.tsx` (canal `purchase-orders`),
  `purchaseOrders/index.tsx`, `products/index.tsx`, `categories/index.tsx`,
  `suppliers/index.tsx`, `inventoryMovements/index.tsx`, `sales/index.tsx`,
  `clients/index.tsx`, `transactions/index.tsx`, `cashRegister/index.tsx`.
- **Infra local:** Reverb corre en `127.0.0.1:8080` (plano, sin TLS propio).
  El navegador se conecta por `wss://inventory-manager.test` (puerto 443,
  el HTTPS normal del sitio) gracias a un bloque agregado a mano en
  `C:\Users\usuario\.config\herd\config\valet\Nginx\Inventory-Manager.test.conf`
  (`location /app { proxy_pass http://127.0.0.1:8080; ... }`) que reenvía la
  ruta `/app` (WebSocket) al Reverb interno. **Si Herd regenera ese archivo
  (cambio de versión de PHP, re-"Secure", etc.) este bloque se pierde y hay
  que volver a pegarlo** — ver el propio bloque, tiene un comentario de aviso.
  `.env`/`.env.example` documentan las variables `REVERB_*` (servidor,
  interno, sin TLS) vs `VITE_REVERB_*` (cliente, por nginx, con TLS).
- Probado end-to-end con `php artisan tinker` simulando "otra sesión":
  la tabla de Pedidos y la campana de otro navegador se refrescaron solas,
  sin foco ni recarga manual — confirmado por captura.
- Acceso móvil de prueba: túnel Expose (`expose share inventory-manager.test`,
  free tier, dura 1h) — el usuario probó desde el celular y confirma que
  **los SweetAlerts (errores de validación, etc.) sí llegan bien tanto en
  el celular como en ambos navegadores**.

**Bug real encontrado y diagnosticado, SIN arreglar — este es el punto de
partida de la próxima sesión:**

El usuario probó el flujo real (un navegador crea/acepta un pedido) y
reportó: la sesión que ACEPTA el pedido pierde el ícono de "Registrar
recepción" correctamente (normal, viene de la respuesta de su propia
acción), pero **las demás sesiones abiertas siguen mostrando el ícono de
aceptar en ese mismo pedido ya recibido** — pese a que la campana/alertas sí
llegan bien. Es decir: el *push* llega, pero el *refetch* que dispara trae
datos viejos.

**Causa raíz identificada:** `PurchaseOrderController::receive()`
(`app/Http/Controllers/PurchaseOrderController.php:138-176`) envuelve todos
los cambios en `DB::transaction(...)`. Como `ModelChanged` es
`ShouldBroadcastNow` (síncrono, sin cola), cada `increment()`/`update()`
dentro del closure dispara el broadcast **antes de que la transacción haga
commit**. Las otras sesiones reciben el push casi al instante y piden los
datos frescos por HTTP en una request/conexión aparte — que puede llegar
antes del commit y leer el estado viejo (pedido todavía "Solicitado").
Coincide exactamente con el síntoma: la alerta (que no depende de leer el
pedido recién commiteado) llega bien; el estado del pedido en la tabla,
no.

**Fix recomendado (no aplicado, un solo archivo):** en
`app/Models/Concerns/BroadcastsModelChanges.php`, envolver el dispatch en
`DB::afterCommit()`:

```php
use Illuminate\Support\Facades\DB;

protected function broadcastModelChange(string $action): void
{
    $channel = $this->broadcastChannel();
    $model = class_basename($this);
    $id = $this->getKey();

    DB::afterCommit(fn () => ModelChanged::dispatch($channel, $model, $action, $id));
}
```

`DB::afterCommit()` ejecuta el callback de inmediato si no hay transacción
abierta (todo el resto de la app, que no usa transacciones explícitas, sigue
igual de instantáneo) y lo pospone hasta el commit real si la hay — exactamente
el caso de `receive()`. Después de aplicar esto: `npm run build` no hace
falta (solo backend), pero sí reiniciar `php artisan reverb:start` si estaba
corriendo, y volver a probar el mismo flujo (aceptar en un navegador, mirar
la tabla en el otro sin recargar).

**Otras cosas pendientes de esta iniciativa (no bloqueantes, no empezadas):**
- El aviso de "otro usuario está editando este mismo registro" (colisión de
  edición concurrente) descrito en el diseño — no implementado aún.
- Falta correr `npm run types` / revisar visualmente el resto de páginas
  recién cableadas (products, categories, suppliers, inventoryMovements,
  sales, clients, transactions, cashRegister) — se cablearon todas en el
  mismo lote justo antes de que se agotaran los créditos, sin alcanzar a
  verificar cada una individualmente en el navegador (solo Pedidos se
  probó de punta a punta).
- `php artisan reverb:start` es un proceso aparte que hay que dejar
  corriendo siempre (no lo gestiona Herd automáticamente en el plan free) —
  falta decidir cómo automatizarlo (tarea programada de Windows, script de
  arranque, etc.).

**Limpieza pendiente en el entorno (fuera del código):**
- Regla de firewall `InventoryManager-LAN-Test` (puerto 8080) — ya no se usa
  (se optó por el túnel Expose), se puede borrar con
  `Remove-NetFirewallRule -DisplayName "InventoryManager-LAN-Test"`.
- El túnel Expose expira solo a la hora de haberlo levantado — no requiere
  limpieza.
- Todo lo de esta sesión (esto + los fixes de UI de antes: scroll,
  SweetAlert-antes-de-WhatsApp, etc.) está **sin commitear** — hay que
  revisar `git status`/`git diff` y commitear cuando se retome.

## Acceso móvil para pruebas (no forma parte del código de la app)

Para probar la PWA desde un celular en la misma red sin depender de Herd
Pro: `php artisan serve --host=0.0.0.0 --port=8080` + regla de firewall
de Windows (perfil privado, puerto 8080 TCP, temporal). El celular abre
`http://<ip-lan-del-pc>:8080` directamente, sin configurar nada del lado
del teléfono. No es el mismo dominio `inventory-manager.test` (eso
requeriría Herd Pro o un resolutor DNS local aparte) pero es la misma
app y los mismos datos.
