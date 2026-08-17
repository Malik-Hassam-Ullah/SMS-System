import React, { useState, useEffect } from 'react';
import { QrCode, RefreshCw, CheckCircle, AlertTriangle, Send, Loader2, LogOut } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function WhatsAppSettingsPage() {
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Hello from School Management System!');
    const [sendingTest, setSendingTest] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data?.status || 'disconnected');
            setQrCode(res.data?.qr || null);
        } catch (err) {
            console.error('Failed to fetch WhatsApp status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Poll status every 5 seconds to check connection state changes
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        setLoading(true);
        try {
            await api.post('/whatsapp/connect');
            toast.success('Reconnection initiated.');
            fetchStatus();
        } catch (err) {
            toast.error('Failed to initiate connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect WhatsApp?')) return;
        setLoading(true);
        try {
            await api.post('/whatsapp/disconnect');
            toast.success('Disconnected successfully.');
            fetchStatus();
        } catch (err) {
            toast.error('Failed to disconnect.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendTest = async (e) => {
        e.preventDefault();
        if (!testPhone) {
            toast.error('Please enter a phone number.');
            return;
        }
        setSendingTest(true);
        try {
            await api.post('/whatsapp/test', { phone: testPhone, message: testMessage });
            toast.success('Test message sent successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send test message.');
        } finally {
            setSendingTest(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="h-6 w-6 text-blue-600" /> WhatsApp Settings
                </h1>
                <p className="text-slate-500 text-sm mt-1">Connect your WhatsApp account to send automatic messages and fee vouchers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Connection Status Card */}
                <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">Connection Status</h2>
                        <button
                            onClick={fetchStatus}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                            title="Refresh Status"
                        >
                            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {status === 'connected' ? (
                        <div className="flex flex-col items-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-800">Connected</h3>
                                <p className="text-slate-500 text-sm mt-1">Your WhatsApp account is active and ready to send messages.</p>
                            </div>
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                            >
                                <LogOut size={16} /> Disconnect Account
                            </button>
                        </div>
                    ) : status === 'connecting' ? (
                        <div className="flex flex-col items-center py-8 space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-800">Connecting...</h3>
                                <p className="text-slate-500 text-sm mt-1">Initializing WhatsApp Web. Please wait.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-6 items-center py-4">
                            {/* QR Code Display */}
                            <div className="w-48 h-48 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                                {qrCode ? (
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="text-center p-4">
                                        <QrCode className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500">Waiting for QR code...</p>
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            <div className="space-y-4 flex-1">
                                <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p>Scan this QR code to link your WhatsApp Business or Personal account. Messages will be sent from your number.</p>
                                </div>

                                <div className="space-y-2 text-sm text-slate-600">
                                    <p className="font-bold text-slate-800">How to connect:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-xs">
                                        <li>Open WhatsApp on your phone.</li>
                                        <li>Tap <b>Menu</b> or <b>Settings</b> and select <b>Linked Devices</b>.</li>
                                        <li>Tap on <b>Link a Device</b>.</li>
                                        <li>Point your phone to this screen to scan the QR code.</li>
                                    </ol>
                                </div>

                                <button
                                    onClick={handleConnect}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-xs flex items-center gap-1"
                                >
                                    <RefreshCw size={14} /> Refresh QR Code
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Test Message Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 pb-4 border-b border-slate-100">Test Connection</h2>

                    <form onSubmit={handleSendTest} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (with country code)</label>
                            <input
                                type="text"
                                placeholder="e.g. 923001234567"
                                className="input w-full text-sm"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
                            <textarea
                                className="input w-full h-24 text-sm resize-none"
                                value={testMessage}
                                onChange={e => setTestMessage(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sendingTest || status !== 'connected'}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                            Send Test Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
