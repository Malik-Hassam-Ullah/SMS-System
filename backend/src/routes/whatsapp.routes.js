const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { getStatus, disconnectWhatsApp, sendMessage, connectToWhatsApp } = require('../utils/whatsapp.util');

// GET /api/whatsapp/status — Get connection status and QR code
router.get('/status', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
    res.json({ success: true, data: getStatus() });
}));

// POST /api/whatsapp/connect — Reconnect/Retry connection
router.post('/connect', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
    connectToWhatsApp();
    res.json({ success: true, message: 'Reconnection initiated.' });
}));

// POST /api/whatsapp/disconnect — Log out and clear session
router.post('/disconnect', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
    await disconnectWhatsApp();
    res.json({ success: true, message: 'Disconnected from WhatsApp.' });
}));

// POST /api/whatsapp/test — Send a test message
router.post('/test', authenticate, requireRole('admin', 'accountant'), asyncHandler(async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ success: false, message: 'Phone number and message are required.' });
    }

    try {
        await sendMessage(phone, message);
        res.json({ success: true, message: 'Test message sent successfully!' });
    } catch (err) {
        console.error('Failed to send test WhatsApp message:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}));

module.exports = router;
