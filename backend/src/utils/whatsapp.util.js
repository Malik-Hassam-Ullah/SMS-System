const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

let client = null;
let qrCodeData = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected'
let reconnectTimer = null;

const logFile = path.join(__dirname, '../../whatsapp_log.txt');

// ─── Logging ───────────────────────────────────────────────────────────────
function logWA(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log('[WhatsApp]', msg);
    try { fs.appendFileSync(logFile, line + '\n'); } catch (_) { }
}

// ─── Connect ───────────────────────────────────────────────────────────────
async function connectToWhatsApp() {
    // Prevent double-init
    if (client) {
        try { await client.destroy(); } catch (_) { }
        client = null;
    }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

    connectionStatus = 'connecting';
    qrCodeData = null;

    try {
        client = new Client({
            authStrategy: new LocalAuth({
                dataPath: path.join(__dirname, '../../whatsapp-session'),
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-gpu',
                ],
            },
        });

        // QR code event — fires when you need to scan
        client.on('qr', async (qr) => {
            logWA('QR code received — waiting for scan...');
            try {
                qrCodeData = await QRCode.toDataURL(qr);
                connectionStatus = 'disconnected';
            } catch (err) {
                logWA('QR generation error: ' + err.message);
            }
        });

        // Auth success
        client.on('authenticated', () => {
            logWA('✅ Authenticated successfully!');
        });

        // Auth failure
        client.on('auth_failure', (msg) => {
            logWA('❌ Auth failure: ' + msg);
            connectionStatus = 'disconnected';
            qrCodeData = null;
        });

        // Ready — fully connected and ready to send messages
        client.on('ready', () => {
            logWA('✅ WhatsApp client is READY!');
            connectionStatus = 'connected';
            qrCodeData = null;
        });

        // Disconnected
        client.on('disconnected', (reason) => {
            logWA('Disconnected: ' + reason);
            connectionStatus = 'disconnected';
            qrCodeData = null;
            client = null;

            // Auto-reconnect after 10 seconds
            logWA('Reconnecting in 10s...');
            reconnectTimer = setTimeout(connectToWhatsApp, 10000);
        });

        // Loading screen (progress updates)
        client.on('loading_screen', (percent, message) => {
            logWA(`Loading: ${percent}% — ${message}`);
        });

        logWA('Initializing WhatsApp client...');
        await client.initialize();

    } catch (err) {
        logWA('Init error: ' + err.message);
        connectionStatus = 'disconnected';
        client = null;
        // Retry after 15 seconds
        reconnectTimer = setTimeout(connectToWhatsApp, 15000);
    }
}

// ─── Send Message ──────────────────────────────────────────────────────────
async function sendMessage(to, text) {
    if (connectionStatus !== 'connected' || !client) {
        throw new Error('WhatsApp is not connected. Please scan the QR code first.');
    }

    // Format number: ensure it's like 923001234567
    let num = to.replace(/[^0-9]/g, '');
    if (num.startsWith('0')) num = '92' + num.substring(1);
    if (!num.startsWith('92')) num = '92' + num;

    // whatsapp-web.js uses chatId format: number@c.us
    const chatId = `${num}@c.us`;
    logWA(`Sending message to ${chatId}`);
    await client.sendMessage(chatId, text);
    logWA(`Message sent to ${chatId}`);
}

// ─── Disconnect ────────────────────────────────────────────────────────────
async function disconnectWhatsApp() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

    if (client) {
        try { await client.logout(); } catch (_) { }
        try { await client.destroy(); } catch (_) { }
        client = null;
    }

    connectionStatus = 'disconnected';
    qrCodeData = null;

    // Clear session data
    const sessionDir = path.join(__dirname, '../../whatsapp-session');
    try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) { }
    logWA('Disconnected and session cleared.');
}

module.exports = {
    connectToWhatsApp,
    sendMessage,
    disconnectWhatsApp,
    getStatus: () => ({ status: connectionStatus, qr: qrCodeData }),
};
