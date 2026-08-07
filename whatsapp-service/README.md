# Servicio de WhatsApp (envío de facturas)

Servicio local que adjunta el PDF de la factura directamente en el chat de
WhatsApp del cliente, usando una sesión real de WhatsApp Web
([`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js)).

**No es la API oficial de Meta** — es automatización de WhatsApp Web, gratis,
sin necesidad de verificación de negocio ni plantillas aprobadas. A cambio,
no es soportado oficialmente por WhatsApp: usarlo de forma legítima y con
volumen bajo (facturas post-venta) tiene bajo riesgo reportado por la
comunidad, pero el riesgo de que WhatsApp banee el número vinculado no es
cero. Si en algún momento preocupa, se puede desvincular el dispositivo sin
perder la cuenta de WhatsApp normal (Ajustes > Dispositivos vinculados).

## Primera vez

```bash
cd whatsapp-service
npm install
npm start
```

Va a mostrar un código QR en la consola. En el celular con el WhatsApp que
va a enviar las facturas (el del negocio):

`WhatsApp > Ajustes > Dispositivos vinculados > Vincular un dispositivo` y
escanea el QR.

La sesión queda guardada en `.wwebjs_auth/` (no se sube a git) — las
siguientes veces que corras `npm start` no hace falta volver a escanear,
a menos que cierres la sesión desde el celular.

## Uso normal

Deja el servicio corriendo (`npm start`) mientras uses la app. Escucha en
`http://localhost:3001` por defecto (configurable con `WHATSAPP_SERVICE_PORT`
en un `.env` de esta carpeta, si hace falta cambiarlo).

El botón "Enviar a WhatsApp" en la app intenta usar este servicio primero.
Si no está corriendo, cae automáticamente al comportamiento anterior (abrir
WhatsApp Web con el chat y descargar el PDF para adjuntarlo a mano) — así que
no rompe la demo pública ni el entorno de producción en Render, donde este
servicio no corre.

## Notas

- Requiere Node.js (probado con v22). La primera instalación descarga un
  Chromium propio (~300MB) porque `whatsapp-web.js` controla un navegador
  real internamente.
- Solo pensado para correr en la máquina local del negocio (Windows), no en
  Render: el free tier tiene disco efímero y se apaga por inactividad, lo
  que rompería la sesión de WhatsApp guardada.
