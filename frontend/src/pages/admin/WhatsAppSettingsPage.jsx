import React, { useState, useEffect } from 'react';
import {
  QrCode, RefreshCw, CheckCircle, AlertTriangle, Send, Loader2,
  LogOut, Smartphone, CheckCircle2, ShieldCheck, Sparkles
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from The Smart School Management System!');
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
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/connect');
      toast.success('Connection handshake initiated.');
      fetchStatus();
    } catch (err) {
      toast.error('Failed to initiate connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect WhatsApp session?')) return;
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
      toast.success('✅ Test message sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test message.');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-12 animate-fade-in">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#25D366] to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 text-white shrink-0">
            <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                WhatsApp Gateway
              </h1>
              {status === 'connected' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Offline
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Automated fee vouchers, attendance notifications, and parent broadcasts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* ═══════════ MAIN GRID ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left: Connection Card (2 Columns on Large Screens) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" /> Device Link Status
            </h2>
            <span className="text-xs text-slate-400">whatsapp-web.js engine</span>
          </div>

          {status === 'connected' ? (
            <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10 animate-bounce-short">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  WhatsApp Device is Active
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Automated fee reminders and instant attendance alerts will be sent from your linked WhatsApp instance.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="mt-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect WhatsApp Device</span>
              </button>
            </div>
          ) : status === 'connecting' ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Connecting to WhatsApp Web...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Initializing Chromium instance and generating secure session token.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start py-2">
              {/* QR Box */}
              <div className="w-56 h-56 sm:w-52 sm:h-52 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner p-2">
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-full h-full object-contain bg-white rounded-xl p-1"
                  />
                ) : (
                  <div className="text-center p-4">
                    <QrCode className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Generating QR Code...
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-4 flex-1 w-full">
                <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <p>Scan this QR code with WhatsApp on your phone to link your institutional account.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Step-by-Step Instructions:
                  </p>
                  <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-1">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#00875a] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                      <span>Open WhatsApp on your mobile phone.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#00875a] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                      <span>Tap <b>Menu (⋮)</b> or <b>Settings ⚙️</b> &gt; <b>Linked Devices</b>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#00875a] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      <span>Tap <b>Link a Device</b> and point camera at this QR code.</span>
                    </li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={handleConnect}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#00875a] hover:bg-[#00704a] shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh QR Code</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Test Message Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" /> Test Message
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verify deliverability before broadcast
              </p>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Mobile Number (with country code)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 923001234567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Message Payload
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium h-24 resize-none"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest || status !== 'connected'}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#00875a] hover:bg-[#00704a] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending payload...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>End-to-end encrypted protocol</span>
          </div>
        </div>

      </div>
    </div>
  );
}
