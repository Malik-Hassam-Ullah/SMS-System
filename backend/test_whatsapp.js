const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

async function testConnection() {
    const sessionDir = path.join(__dirname, 'whatsapp-session-test');
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'info' }),
        browser: ['Windows', 'Chrome', '111.0.5563.147'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        console.log('Connection update:', { connection, hasQR: !!qr });
        if (connection === 'close') {
            console.log('Connection closed. Reason:', lastDisconnect?.error);
        }
    });
}

testConnection();
