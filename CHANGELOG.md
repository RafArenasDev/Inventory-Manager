# Changelog

Formato: una entrada corta por versión, en el orden en que se creó el tag de
Git correspondiente (`git tag -a vX.Y.Z -m "..."`). Generado a mano hasta
`v1.10.1`; desde `v1.11.0` se actualiza junto con cada tag nuevo. El modal de
"Novedades" del sidebar y el badge de versión se generan de este archivo en
build time — ver `scripts/generate-changelog.mjs`.

## v1.11.0 - 2026-09-08

Auditoría cubre ahora login, logout, cambio de contraseña, cambio de perfil
propio, reseteo de contraseña por correo, y sincronización de roles/permisos
(antes invisibles al ser cambios de pivote, no de atributos). Cliente
anonimizado queda totalmente bloqueado: sin editar, eliminar, reactivar ni
ver ningún dato — la tabla solo muestra "Cliente Anonimizado" y guiones.
Términos y Condiciones reescritos con contenido legal completo y aceptación
obligatoria con checkboxes justo después del login (bloquea el acceso si se
rechaza), versionada para volver a pedirse si el texto cambia. Corregido el
copyright desactualizado en las plantillas de correo.

## v1.10.1 - 2026-09-08

Audit trail expanded app-wide (Auditable trait, real-time, export, mandatory
reason) + concurrency fixes (invoice-number race, unique-constraint races) +
opt-in DIAN Consumidor Final limit.

## v1.10.0 - 2026-09-08

Legal compliance notices (cookies, T&C, Habeas Data, employee monitoring) +
new Audit Log module (client anonymize, sale cancellation reason, manual
inventory adjustment reason).

## v1.9.3 - 2026-09-08

Align currency columns app-wide: fixed-left $, right-aligned digits (tables,
detail modals, invoice PDF, Excel exports).

## v1.9.2 - 2026-09-08

Fix invoice modal title stray hash and demo business identity (NovaTech
Store -> Inventory Manager).

## v1.9.1 - 2026-09-08

Fix sale discount display bug, add missing Products export, audit fixes to
Dashboard/exports.

## v1.9.0 - 2026-09-08

Finanzas hardening: real validation, audit-safe edit guard, dead code
cleanup. Closes the 13/13 module hardening pass.

## v1.8.0 - 2026-09-08

Close Cash Register module: fix login-crashing race condition, stale-zero
totals, double-close race.

## v1.7.1 - 2026-09-08

Fix modal bg-card/bg-background inconsistency + require supplier address as
text input.

## v1.7.0 - 2026-09-08

Close Clients module: full required contact data + DIAN default client +
quickStore error fix.

## v1.6.0 - 2026-09-08

Close Ventas module: server-authoritative pricing/stock, required client,
item price display fix.

## v1.5.1 - 2026-09-08

Fix validation layout shift + validate password/profile modals + product
form alignment.

## v1.5.0 - 2026-09-08

Suppliers module hardening + cross-cutting validation fixes.

## v1.4.0 - 2026-09-07

Products, Movements and Purchase Orders hardened: never-negative quantities,
server-side validation, explicit WhatsApp/Email sending, focus-ring fixes.

## v1.3.3 - 2026-09-07

Product image upload errors: bold file name via Swal html, drop quotes.

## v1.3.2 - 2026-09-07

Bulk import redesign: products-only creation mode, dropzone UI, field guide
table.

## v1.3.1 - 2026-09-07

Products: hide movement notes in view modal, add bulk-import guide card.

## v1.3.0 - 2026-09-07

Categories module closed to standard: name-only validation, redundant check
removed, hardened delete message.

## v1.2.0 - 2026-09-07

Roles module closed to standard: validation, admin-role/self-lockout
hardening.

## v1.1.1 - 2026-09-07

Users module hardening fix.

## v1.1.0 - 2026-09-07

Users module closed.

## v1.0.0 - 2026-09-07

MVP baseline.
