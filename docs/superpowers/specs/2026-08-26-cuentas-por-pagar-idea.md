# Cuentas por Pagar (a proveedores) — idea para evaluar más adelante

**Fecha:** 2026-08-26
**Estado:** Idea sin aprobar — no implementar todavía. Queda documentada acá
para retomarla cuando se decida si entra al roadmap.

## Problema que resolvería

Hoy `Pedidos` registra qué se pidió y si ya llegó (`Solicitado` /
`Recibido`), y `Finanzas` registra ingresos/gastos sueltos. Pero no hay
ningún lugar que responda "¿cuánto le debo a cada proveedor ahora mismo?"
ni "¿qué pedidos recibidos todavía no pagué?". Un pedido puede llegar y
quedar recibido en el sistema sin que eso implique que ya se pagó — hoy esa
plata simplemente no se rastrea en ningún lado.

## Qué agregaría

1. **Saldo por proveedor**: cuánto se le debe a cada proveedor, sumando sus
   pedidos `Recibido` menos lo que ya se le pagó.
2. **Registrar pagos**: abonar (parcial o total) contra un pedido recibido,
   o contra el saldo general del proveedor si no se quiere atar el pago a
   un pedido puntual.
3. **Fecha de vencimiento** (opcional): si el proveedor da plazo (ej. 30
   días desde que llegó el pedido), marcar cuándo vence cada deuda y poder
   ver qué está por vencer o ya venció — mismo espíritu que la alerta de
   stock bajo, pero para plata que se debe.
4. **Total de cuentas por pagar** como cifra en el Dashboard (junto a
   Ventas/Ingresos/Egresos) — es un pasivo real del negocio.

## Boceto de modelo de datos (a validar, no aprobado)

- **`SupplierPayment`** (tabla nueva): `id, supplier_id, purchase_order_id
  (nullable — pago no atado a un pedido puntual), amount, payment_date,
  payment_method, notes, created_by, timestamps`.
- **`PurchaseOrder`**: agregar `payment_due_date` (nullable) y un
  `amount_paid` calculado (suma de sus `SupplierPayment`) para saber el
  saldo pendiente de ESE pedido sin duplicar el total ya guardado en sus
  items.
- Vincular cada `SupplierPayment` con una `Transaction` tipo `Gasto`
  (o un nuevo `type` dedicado) para que Finanzas/Caja sigan cuadrando sin
  tener que sumar dos fuentes de plata distintas — a definir si es 1:1
  automático o si el usuario elige.

## Encaje con lo que ya existe

- Nuevo módulo en la tabla `modules` (`key: 'accounts-payable'`, ícono
  tipo `Landmark`/`CreditCard`, grupo `Ventas` o uno nuevo), con sus
  permisos (`Ver Cuentas por Pagar`, `Registrar Pago a Proveedor`) —
  mismo patrón que todos los módulos actuales, así entra gratis a la
  sidebar y a las cards del dashboard sin tocar ese código de nuevo.
- La vista principal sería: lista de proveedores con saldo pendiente >
  0, clic entra al detalle con sus pedidos recibidos sin pagar (o
  parcialmente pagados) y un botón para registrar abono — mismo patrón
  visual que el resto de la app (card + tabla + modal de formulario).

## Preguntas abiertas para cuando se retome

- ¿El pago se registra siempre contra un pedido puntual, o también contra
  el proveedor en general (ej. un abono grande que cubre varios pedidos a
  la vez)?
- ¿Vale la pena el campo de fecha de vencimiento desde el arranque, o es
  una fase 2 una vez que el registro de pagos básico esté probado?
- ¿Esto se factura/concilia con la contabilidad real del negocio, o es
  solo un tablero interno de seguimiento?
