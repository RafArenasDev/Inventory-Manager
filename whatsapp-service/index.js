const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const PORT = process.env.WHATSAPP_SERVICE_PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

let isReady = false;
let lastQr = null;

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: __dirname + '/.wwebjs_auth' }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

client.on('qr', (qr) => {
    lastQr = qr;
    isReady = false;
    console.log('\nEscanea este código QR con WhatsApp (Dispositivos vinculados > Vincular un dispositivo):\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isReady = true;
    lastQr = null;
    console.log('WhatsApp vinculado y listo para enviar facturas.');
});

client.on('disconnected', (reason) => {
    isReady = false;
    console.log('WhatsApp desvinculado:', reason);
});

client.initialize();

const formatWhatsAppNumber = (rawNumber) => {
    const digits = String(rawNumber).replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
        return `57${digits}`;
    }
    return digits;
};

app.get('/status', (req, res) => {
    res.json({ ready: isReady, hasPendingQr: !!lastQr });
});

app.post('/send-invoice', async (req, res) => {
    const { phone, pdfUrl, message } = req.body || {};

    if (!phone || !pdfUrl) {
        return res.status(400).json({ success: false, error: 'Faltan phone o pdfUrl.' });
    }

    if (!isReady) {
        return res.status(503).json({ success: false, error: 'WhatsApp no está vinculado todavía. Escanea el QR en la consola del servicio.' });
    }

    try {
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error(`No se pudo descargar el PDF (HTTP ${pdfResponse.status}).`);
        }
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const fileName = pdfUrl.split('/').pop() || 'factura.pdf';

        const media = new MessageMedia('application/pdf', base64, fileName);
        const chatId = `${formatWhatsAppNumber(phone)}@c.us`;

        const numberId = await client.getNumberId(formatWhatsAppNumber(phone));
        if (!numberId) {
            return res.status(422).json({ success: false, error: 'Ese número no tiene WhatsApp registrado.' });
        }

        await client.sendMessage(numberId._serialized, media, { caption: message || '' });

        return res.json({ success: true });
    } catch (error) {
        console.error('Error enviando factura por WhatsApp:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error desconocido enviando el mensaje.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servicio de WhatsApp escuchando en http://localhost:${PORT}`);
});
