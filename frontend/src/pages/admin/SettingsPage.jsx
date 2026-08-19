import React, { useState, useEffect, useCallback } from 'react';
import {
    Sun, Moon, Monitor, Bell, Palette, Type, Download, Upload,
    Shield, Database, School, Save, RotateCcw, Check, Loader,
    BookOpen, LogOut, Users, CreditCard, Printer, Sliders, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settings.store';
import { useAuthStore } from '../../store/auth.store';
import { SIDEBAR_THEMES } from '../../config/sidebarThemes';
import api from '../../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, description }) => (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
    </div>
);

const ToggleSwitch = ({ enabled, onChange, label, description, disabled }) => (
    <div className={`flex items-center justify-between py-3 ${disabled ? 'opacity-50' : ''}`}>
        <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        <button
            disabled={disabled}
            onClick={() => !disabled && onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none flex-shrink-0 ${enabled ? 'bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25' : 'bg-slate-200'
                }`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const CheckDot = ({ gradient, active, onClick, label }) => (
    <div className="flex flex-col items-center gap-1.5">
        <button
            onClick={onClick}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${gradient} ${active ? 'ring-2 ring-offset-2 ring-primary-500 scale-110 shadow-lg' : 'hover:scale-110'
                }`}
        >
            {active && <Check className="w-4 h-4 text-white" />}
        </button>
        <span className="text-xs text-slate-500">{label}</span>
    </div>
);

const colorSchemes = [
    { id: 'indigo', label: 'Indigo', gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
    { id: 'blue', label: 'Blue', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
    { id: 'emerald', label: 'Emerald', gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
    { id: 'rose', label: 'Rose', gradient: 'bg-gradient-to-br from-rose-500 to-pink-600' },
    { id: 'amber', label: 'Amber', gradient: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { id: 'violet', label: 'Violet', gradient: 'bg-gradient-to-br from-violet-500 to-fuchsia-600' },
];

const weekDays = [
    { id: 'Mon', label: 'M', full: 'Monday' },
    { id: 'Tue', label: 'T', full: 'Tuesday' },
    { id: 'Wed', label: 'W', full: 'Wednesday' },
    { id: 'Thu', label: 'T', full: 'Thursday' },
    { id: 'Fri', label: 'F', full: 'Friday' },
    { id: 'Sat', label: 'S', full: 'Saturday' },
    { id: 'Sun', label: 'S', full: 'Sunday' },
];

const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'school', label: 'School Info', icon: School },
    { id: 'fees', label: 'Fee Settings', icon: CreditCard },
    { id: 'attendance', label: 'Attendance', icon: Users },
    { id: 'academic', label: 'Academic', icon: BookOpen },
    { id: 'print', label: 'Print & PDF', icon: Printer },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup', icon: Database },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const store = useSettingsStore();
    const { user } = useAuthStore();
    const [local, setLocal] = useState({ ...store });
    const [activeTab, setActiveTab] = useState('appearance');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dbWarning, setDbWarning] = useState('');

    const getVisibleTabs = () => {
        const role = user?.role;
        if (role === 'ceo' || role === 'admin') {
            return tabs;
        }
        if (role === 'accountant') {
            return tabs.filter(t => ['appearance', 'notifications', 'fees', 'print', 'security'].includes(t.id));
        }
        if (role === 'teacher') {
            return tabs.filter(t => ['appearance', 'notifications', 'attendance', 'academic', 'security'].includes(t.id));
        }
        return [tabs[0]]; // fallback to appearance only
    };

    const visibleTabs = getVisibleTabs();

    useEffect(() => {
        if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
            setActiveTab(visibleTabs[0].id);
        }
    }, [visibleTabs, activeTab]);

    const update = (key, value) => {
        setLocal(prev => ({ ...prev, [key]: value }));
        if (['darkMode', 'fontSize', 'colorScheme', 'sidebarTheme', 'language'].includes(key)) {
            store.updateSettings({ [key]: value });
        }
    };

    const toggleWorkingDay = (day) => {
        const days = local.workingDays || [];
        update('workingDays', days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
    };

    // ── Load from backend on mount ────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.get('/settings');
                const backendData = res.data || {};
                // Merge backend data into local state (backend wins for non-UI settings)
                setLocal(prev => ({ ...prev, ...backendData }));
                // Sync backend settings into Zustand store too
                store.updateSettings(backendData);
            } catch (err) {
                // Backend not available or column not set up — use localStorage values
                console.warn('[Settings] Could not load from backend:', err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []); // eslint-disable-line

    // Live preview: apply dark mode + font size + color scheme + sidebar theme immediately on change
    useEffect(() => {
        const html = document.documentElement;
        const isDark = local.darkMode === true || local.darkMode === 'true' || (local.darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
        }
        const sizeMap = { small: '13px', medium: '15px', large: '17px' };
        html.style.fontSize = sizeMap[local.fontSize] || '15px';
        html.setAttribute('data-color-scheme', local.colorScheme || 'indigo');
        html.setAttribute('data-sidebar-theme', local.sidebarTheme || 'midnight');
    }, [local.darkMode, local.fontSize, local.colorScheme, local.sidebarTheme]);

    // ── Save ──────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        setDbWarning('');
        try {
            // 1. Always save everything to localStorage via Zustand store
            store.updateSettings(local);

            // 2. Save backend-relevant settings to API
            const { data } = await api.put('/settings', local);

            if (data?.warning) {
                setDbWarning(data.warning);
                toast.success('Settings saved (locally only - see warning)');
            } else {
                toast.success('✅ Settings saved successfully!');
            }
        } catch (err) {
            // API failed — still saved to localStorage
            store.updateSettings(local);
            toast.error('Failed to save to backend, but saved locally in browser.');
        } finally {
            setSaving(false);
        }
    };

    // ── Reset ─────────────────────────────────────────────────────
    const handleReset = () => {
        if (!window.confirm('Are you sure you want to reset all settings to defaults?')) return;
        const defaults = {
            darkMode: false, fontSize: 'medium', language: 'en', colorScheme: 'indigo',
            emailNotifications: true, smsNotifications: false, feeAlerts: true,
            attendanceAlerts: true, resultAlerts: true, schoolName: '', currency: 'PKR',
            dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Karachi', lateFeeEnabled: true,
            lateFeeAmount: 50, lateFeeAfterDays: 10, gracePeriodDays: 5, feeDueDay: '10',
            autoWaiveLateFee: true,
            attendanceTime: '08:00', workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            minAttendancePercent: 75, lateMarkMinutes: 15,
            passingMarks: 40, maxMarks: 100, gradingSystem: 'percentage',
            printHeaderEnabled: true, printFooterEnabled: true, printWatermark: false,
            paperSize: 'A4', printFooterText: '',
            sessionTimeout: '30', minPasswordLength: 8, autoLogout: true, activityLog: true,
            autoBackup: false,
        };
        setLocal(prev => ({ ...prev, ...defaults }));
        store.updateSettings(defaults);
        document.documentElement.classList.remove('dark');
        document.documentElement.style.fontSize = '15px';
        toast('Settings reset to defaults', { icon: '🔄' });
    };

    // ── Backup Export ─────────────────────────────────────────────
    const handleExportBackup = () => {
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: user?.full_name || user?.email || 'Admin',
            version: '1.0',
            settings: { ...local },
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sms-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Backup file downloaded successfully!');
    };

    const handleImportBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                const importedSettings = parsed.settings || parsed;
                // Remove any function keys
                const { setDarkMode, setFontSize, setLanguage, setColorScheme, setSidebarCollapsed, updateSettings, ...cleanSettings } = importedSettings;
                setLocal(prev => ({ ...prev, ...cleanSettings }));
                store.updateSettings(cleanSettings);
                toast.success('✅ Backup restored successfully!');
            } catch {
                toast.error('❌ Failed to parse file. Please select a valid backup file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-slate-500">
                <Loader className="w-6 h-6 animate-spin text-primary-500" />
                <span className="text-sm font-medium">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="page-header mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                        <Sliders className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="page-title">System Settings</h1>
                        <p className="page-subtitle">Connected to backend — changes are persisted to the database</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleReset} className="btn-secondary text-sm" disabled={saving}>
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={handleSave} className="btn-primary text-sm" disabled={saving}>
                        {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                    </button>
                </div>
            </div>

            {dbWarning && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{dbWarning}</span>
                </div>
            )}

            <div className="flex gap-6">
                {/* Tabs */}
                <div className="w-52 flex-shrink-0">
                    <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl p-2 shadow-premium">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md shadow-primary-500/25'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Panel */}
                <div className="flex-1 min-w-0">
                    <div className="card">

                        {/* ══ APPEARANCE ══════════════════════════════════════ */}
                        {activeTab === 'appearance' && (
                            <div>
                                <SectionHeader icon={Palette} title="Appearance" description="Frontend UI settings — saved locally in browser (localStorage)" />

                                <div className="mb-6">
                                    <p className="text-sm font-semibold text-slate-700 mb-3">🌙 Theme Mode (Live Preview)</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: false, label: 'Light Mode', icon: Sun, desc: 'Light theme' },
                                            { id: true, label: 'Dark Mode', icon: Moon, desc: 'Dark theme' },
                                            { id: 'system', label: 'System', icon: Monitor, desc: 'Auto detect' },
                                        ].map(mode => (
                                            <button
                                                key={String(mode.id)}
                                                onClick={() => update('darkMode', mode.id)}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${local.darkMode === mode.id
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary-300'
                                                    }`}
                                            >
                                                <mode.icon className="w-6 h-6" />
                                                <span className="text-sm font-semibold">{mode.label}</span>
                                                <span className="text-xs text-slate-500">{mode.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {local.darkMode === true && (
                                        <p className="mt-2 text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                                            <Moon className="w-3 h-3" /> Dark mode live preview active!
                                        </p>
                                    )}
                                </div>

                                <div className="mb-6 py-4 border-t border-slate-100">
                                    <p className="text-sm font-semibold text-slate-700 mb-3">🎨 Color Scheme</p>
                                    <div className="flex items-center gap-4 flex-wrap">
                                        {colorSchemes.map(c => (
                                            <CheckDot key={c.id} gradient={c.gradient} active={local.colorScheme === c.id} onClick={() => update('colorScheme', c.id)} label={c.label} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">Color scheme applies instantly across the platform</p>
                                </div>

                                <div className="mb-6 py-4 border-t border-slate-100">
                                    <div className="mb-3">
                                        <p className="text-sm font-semibold text-slate-700">🎨 Sidebar Color Theme</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Select a luxury color theme for the navigation sidebar with guaranteed contrast in both Light & Dark modes</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {SIDEBAR_THEMES.map(theme => {
                                            const isSelected = (local.sidebarTheme || 'midnight') === theme.id;
                                            return (
                                                <button
                                                    key={theme.id}
                                                    type="button"
                                                    onClick={() => update('sidebarTheme', theme.id)}
                                                    className={`group text-left p-3.5 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                                                        isSelected
                                                            ? 'border-primary-500 bg-primary-50/40 ring-2 ring-primary-500/20 shadow-md scale-[1.01]'
                                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                                    }`}
                                                >
                                                    {/* Mini Mockup Bar */}
                                                    <div className={`w-full h-12 rounded-xl bg-gradient-to-r ${theme.swatchBg} p-2 flex items-center justify-between border border-black/10 shadow-inner mb-2.5`}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-[10px] text-white font-bold">
                                                                S
                                                            </div>
                                                            <div className="w-16 h-2 rounded bg-white/30"></div>
                                                        </div>
                                                        <div className="w-4 h-4 rounded-full bg-rose-500 shadow-sm flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className={`text-xs font-bold ${isSelected ? 'text-primary-700 font-extrabold' : 'text-slate-800'}`}>
                                                                {theme.name}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                                                {theme.description}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                                <Check className="w-3 h-3 stroke-[3]" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2.5 flex items-center gap-1.5">
                                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Changes apply instantly with clear contrast & readable typography.
                                    </p>
                                </div>

                                <div className="mb-6 py-4 border-t border-slate-100">
                                    <p className="text-sm font-semibold text-slate-700 mb-3">🔤 Font Size (Live Preview)</p>
                                    <div className="flex gap-3">
                                        {[{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => update('fontSize', f.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${local.fontSize === f.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary-300'
                                                    }`}
                                            >
                                                <Type className="w-4 h-4" /> {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="py-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Language / زبان</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Display language</p>
                                        </div>
                                        <select value={local.language || 'en'} onChange={e => update('language', e.target.value)} className="input w-40 py-1.5">
                                            <option value="en">English</option>
                                            <option value="ur">Urdu (Coming Soon)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ NOTIFICATIONS ═══════════════════════════════════ */}
                        {activeTab === 'notifications' && (
                            <div>
                                <SectionHeader icon={Bell} title="Notifications" description="Alert and notification settings — saved in backend database" />
                                <div className="divide-y divide-slate-100">
                                    <ToggleSwitch enabled={local.emailNotifications} onChange={v => update('emailNotifications', v)} label="Email Notifications" description="Receive important updates via email (requires SMTP configuration on backend)" />
                                    <ToggleSwitch enabled={local.smsNotifications} onChange={v => update('smsNotifications', v)} label="SMS Notifications" description="Text alerts via SMS gateway (requires Telenor/Jazz API)" />
                                    <ToggleSwitch enabled={local.feeAlerts} onChange={v => update('feeAlerts', v)} label="Fee Due Alerts" description="Alert when fee due date is approaching" />
                                    <ToggleSwitch enabled={local.attendanceAlerts} onChange={v => update('attendanceAlerts', v)} label="Attendance Alerts" description="Send WhatsApp/SMS to guardians on student absence" />
                                    <ToggleSwitch enabled={local.resultAlerts} onChange={v => update('resultAlerts', v)} label="Result Notifications" description="Notify when exam results are published" />
                                </div>
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-600 flex gap-2">
                                    <span>ℹ️</span>
                                    <span>Email/SMS require backend gateway configuration. WhatsApp alerts are managed under Settings → WhatsApp Settings.</span>
                                </div>
                            </div>
                        )}

                        {/* ══ SCHOOL INFO ══════════════════════════════════════ */}
                        {activeTab === 'school' && (
                            <div>
                                <SectionHeader icon={School} title="School Information" description="School info — saved in backend database, will reflect in sidebar and documents" />
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">School / Institute Name</label>
                                        <input className="input" placeholder="The Smart School" value={local.schoolName || ''} onChange={e => update('schoolName', e.target.value)} />
                                        <p className="text-xs text-slate-500 mt-1">Will automatically update the sidebar title upon saving</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Academic Session Year</label>
                                            <input className="input" placeholder="2025-2026" value={local.sessionYear || ''} onChange={e => update('sessionYear', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label">Currency Symbol</label>
                                            <select className="input" value={local.currency || 'PKR'} onChange={e => update('currency', e.target.value)}>
                                                <option value="PKR">PKR — Pakistani Rupee</option>
                                                <option value="USD">USD — US Dollar</option>
                                                <option value="GBP">GBP — British Pound</option>
                                                <option value="AED">AED — UAE Dirham</option>
                                                <option value="SAR">SAR — Saudi Riyal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Date Format</label>
                                            <select className="input" value={local.dateFormat || 'DD/MM/YYYY'} onChange={e => update('dateFormat', e.target.value)}>
                                                <option value="DD/MM/YYYY">DD/MM/YYYY (Pakistani)</option>
                                                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                                                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Timezone</label>
                                            <select className="input" value={local.timezone || 'Asia/Karachi'} onChange={e => update('timezone', e.target.value)}>
                                                <option value="Asia/Karachi">Asia/Karachi (PKT +5)</option>
                                                <option value="Asia/Dubai">Asia/Dubai (GST +4)</option>
                                                <option value="Asia/Riyadh">Asia/Riyadh (AST +3)</option>
                                                <option value="Europe/London">Europe/London (GMT)</option>
                                                <option value="America/New_York">America/New York (EST)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ FEE SETTINGS ════════════════════════════════════ */}
                        {activeTab === 'fees' && (
                            <div>
                                <SectionHeader icon={CreditCard} title="Fee Settings" description="Fee collection rules — saved in backend database, used during voucher generation" />
                                <div className="divide-y divide-slate-100 mb-6">
                                    <ToggleSwitch enabled={local.lateFeeEnabled} onChange={v => update('lateFeeEnabled', v)} label="Enable Late Fee Charges" description="Charge an additional fee if paid after the due date" />
                                    <ToggleSwitch enabled={local.autoWaiveLateFee !== false} onChange={v => update('autoWaiveLateFee', v)} label="Auto Waive Fine on Payment" description="Automatically waive accumulated fines/late fees if the student pays their core tuition fees in full" />
                                </div>
                                <div className={`grid grid-cols-2 gap-4 ${!local.lateFeeEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div>
                                        <label className="label">Late Fee Amount ({local.currency || 'PKR'})</label>
                                        <input type="number" min="0" className="input" value={local.lateFeeAmount ?? 50} onChange={e => update('lateFeeAmount', Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="label">Late Fee After (Days from due date)</label>
                                        <input type="number" min="1" className="input" value={local.lateFeeAfterDays ?? 10} onChange={e => update('lateFeeAfterDays', Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="label">Grace Period (Days)</label>
                                        <input type="number" min="0" className="input" value={local.gracePeriodDays ?? 5} onChange={e => update('gracePeriodDays', Number(e.target.value))} />
                                        <p className="text-xs text-slate-500 mt-1">No late fee will be charged during the grace period</p>
                                    </div>
                                    <div>
                                        <label className="label">Fee Due Date (Day of Month)</label>
                                        <select className="input" value={local.feeDueDay || '10'} onChange={e => update('feeDueDay', e.target.value)}>
                                            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                                                <option key={d} value={String(d)}>{d} of every month</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4 p-4 rounded-xl border text-sm font-medium bg-amber-50 border-amber-200 text-amber-700">
                                    📋 Summary: {local.lateFeeEnabled
                                        ? `${local.currency || 'PKR'} ${local.lateFeeAmount || 50} late fee charged after ${local.lateFeeAfterDays || 10} days. Grace period: ${local.gracePeriodDays || 5} days.`
                                        : 'Late fee disabled — no extra charges will apply.'}
                                </div>
                            </div>
                        )}

                        {/* ══ ATTENDANCE ══════════════════════════════════════ */}
                        {activeTab === 'attendance' && (
                            <div>
                                <SectionHeader icon={Users} title="Attendance Settings" description="Working days, timings, and attendance rules — saved in backend database" />
                                <div className="space-y-6">
                                    <div>
                                        <label className="label">School Start Time (Attendance deadline)</label>
                                        <input type="time" className="input w-48" value={local.attendanceTime || '08:00'} onChange={e => update('attendanceTime', e.target.value)} />
                                        <p className="text-xs text-slate-500 mt-1">Marking attendance after this time will count as late</p>
                                    </div>
                                    <div>
                                        <label className="label">Working Days</label>
                                        <div className="flex gap-2 mt-2">
                                            {weekDays.map(day => (
                                                <button
                                                    key={day.id}
                                                    onClick={() => toggleWorkingDay(day.id)}
                                                    title={day.full}
                                                    className={`w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 ${(local.workingDays || []).includes(day.id)
                                                        ? 'bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Working days: {(local.workingDays || []).join(', ') || 'None'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Min Attendance % (Required to Pass)</label>
                                            <input type="number" min="50" max="100" className="input" value={local.minAttendancePercent ?? 75} onChange={e => update('minAttendancePercent', Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="label">Late Mark After (Minutes)</label>
                                            <input type="number" min="0" max="60" className="input" value={local.lateMarkMinutes ?? 15} onChange={e => update('lateMarkMinutes', Number(e.target.value))} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ ACADEMIC ════════════════════════════════════════ */}
                        {activeTab === 'academic' && (
                            <div>
                                <SectionHeader icon={BookOpen} title="Academic Settings" description="Grading system and marks rules — saved in backend database" />
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Passing Marks (%)</label>
                                            <input type="number" min="0" max="100" className="input" value={local.passingMarks ?? 40} onChange={e => update('passingMarks', Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="label">Max Marks (per subject)</label>
                                            <input type="number" min="0" className="input" value={local.maxMarks ?? 100} onChange={e => update('maxMarks', Number(e.target.value))} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Grading System</label>
                                        <select className="input" value={local.gradingSystem || 'percentage'} onChange={e => update('gradingSystem', e.target.value)}>
                                            <option value="percentage">Percentage Based (90%, 80%...)</option>
                                            <option value="gpa">GPA (4.0 Scale)</option>
                                            <option value="letter">Letter Grade (A, B, C, D, F)</option>
                                        </select>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-sm font-semibold text-slate-700 mb-3">Grade Chart (Standard)</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {[
                                                { g: 'A+ (Excellent)', r: '90-100%', c: 'bg-emerald-100 text-emerald-700' },
                                                { g: 'A (Very Good)', r: '80-89%', c: 'bg-green-100 text-green-700' },
                                                { g: 'B (Good)', r: '70-79%', c: 'bg-blue-100 text-blue-700' },
                                                { g: 'C (Average)', r: '60-69%', c: 'bg-yellow-100 text-yellow-700' },
                                                { g: 'D (Below Avg)', r: '50-59%', c: 'bg-orange-100 text-orange-700' },
                                                { g: `F (Fail)`, r: `Below ${local.passingMarks || 40}%`, c: 'bg-red-100 text-red-700' },
                                            ].map(g => (
                                                <div key={g.g} className={`flex justify-between px-3 py-1.5 rounded-lg ${g.c}`}>
                                                    <span className="font-semibold">{g.g}</span><span>{g.r}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ PRINT ═══════════════════════════════════════════ */}
                        {activeTab === 'print' && (
                            <div>
                                <SectionHeader icon={Printer} title="Print & PDF Settings" description="Voucher, report, and certificate print layout — saved in backend database" />
                                <div className="divide-y divide-slate-100 mb-6">
                                    <ToggleSwitch enabled={local.printHeaderEnabled} onChange={v => update('printHeaderEnabled', v)} label="Print Header" description="Show school name and logo on every printout" />
                                    <ToggleSwitch enabled={local.printFooterEnabled} onChange={v => update('printFooterEnabled', v)} label="Print Footer" description="Show page number and school info at the bottom" />
                                    <ToggleSwitch enabled={local.printWatermark} onChange={v => update('printWatermark', v)} label="Watermark" description="Show faded school name in the background" />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Paper Size</label>
                                        <select className="input" value={local.paperSize || 'A4'} onChange={e => update('paperSize', e.target.value)}>
                                            <option value="A4">A4 (Standard — 210×297mm)</option>
                                            <option value="A5">A5 (Half A4 — 148×210mm)</option>
                                            <option value="Letter">Letter (US)</option>
                                            <option value="Legal">Legal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Footer Text (Optional)</label>
                                        <input className="input" placeholder="Powered by Smart School Management System" value={local.printFooterText || ''} onChange={e => update('printFooterText', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ SECURITY ════════════════════════════════════════ */}
                        {activeTab === 'security' && (
                            <div>
                                <SectionHeader icon={Shield} title="Security Settings" description="Session, password, and security policies — saved in backend database" />
                                <div className="divide-y divide-slate-100 mb-6">
                                    <ToggleSwitch enabled={local.autoLogout !== false} onChange={v => update('autoLogout', v)} label="Auto Logout on Inactivity" description="Automatically log out when session times out" />
                                    <ToggleSwitch enabled={local.activityLog !== false} onChange={v => update('activityLog', v)} label="Activity Logging" description="Log all administrative actions (visible in Audit Logs)" />
                                    <ToggleSwitch enabled={local.twoFactorAuth || false} onChange={v => update('twoFactorAuth', v)} label="2FA (Two-Factor Auth)" description="OTP verification on login (requires Supabase Auth configuration)" disabled={true} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Session Timeout</label>
                                        <select className="input" value={local.sessionTimeout || '30'} onChange={e => update('sessionTimeout', e.target.value)}>
                                            <option value="0">Never (Not recommended)</option>
                                            <option value="15">15 minutes</option>
                                            <option value="30">30 minutes</option>
                                            <option value="60">1 hour</option>
                                            <option value="120">2 hours</option>
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">Active after saving — {local.sessionTimeout && local.sessionTimeout !== '0' ? `logout after ${local.sessionTimeout} min of inactivity` : 'Timeout disabled'}</p>
                                    </div>
                                    <div>
                                        <label className="label">Min Password Length</label>
                                        <input type="number" min="6" max="20" className="input" value={local.minPasswordLength ?? 8} onChange={e => update('minPasswordLength', Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Danger Zone</p>
                                    <button
                                        className="btn-danger text-sm"
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to clear your session? You will need to log in again.')) {
                                                localStorage.removeItem('sms-auth');
                                                window.location.href = '/login';
                                            }
                                        }}
                                    >
                                        <LogOut className="w-4 h-4" /> Clear My Session (Force Logout)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ══ BACKUP ══════════════════════════════════════════ */}
                        {activeTab === 'backup' && (
                            <div>
                                <SectionHeader icon={Database} title="Backup & Restore" description="Download or upload settings backup file" />
                                <div className="space-y-4">
                                    <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <Download className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold text-blue-800">Export Settings Backup</p>
                                                <p className="text-sm text-blue-600 mt-1">
                                                    Export all settings to a JSON file. You can restore them later if browser cache is cleared.
                                                </p>
                                                <button onClick={handleExportBackup} className="mt-3 btn-primary text-sm">
                                                    <Download className="w-4 h-4" /> Download Backup File (.json)
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <Upload className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold text-emerald-800">Restore from Backup</p>
                                                <p className="text-sm text-emerald-600 mt-1">Restore settings from a previously downloaded JSON backup file.</p>
                                                <label className="mt-3 btn-success text-sm cursor-pointer inline-flex items-center gap-2">
                                                    <Upload className="w-4 h-4" /> Select Backup File
                                                    <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                                        <p className="font-semibold text-slate-700 mb-3">Auto Backup Reminder</p>
                                        <div className="divide-y divide-slate-200">
                                            <ToggleSwitch
                                                enabled={local.autoBackup || false}
                                                onChange={v => update('autoBackup', v)}
                                                label="Daily Backup Reminder"
                                                description="Shows a reminder to backup settings upon logging in"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                                        <p className="font-semibold text-slate-700">💾 Storage Info</p>
                                        <p>Settings size: ~{(JSON.stringify(store).length / 1024).toFixed(1)} KB</p>
                                        <p>Backend: branches.settings (JSONB column)</p>
                                        <p>Frontend: localStorage (browser)</p>
                                        <p className="text-amber-600">⚠️ Clearing browser data resets local preferences — keep a backup!</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Buttons */}
                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={handleReset} className="btn-secondary" disabled={saving}>
                            <RotateCcw className="w-4 h-4" /> Reset to Defaults
                        </button>
                        <button onClick={handleSave} className="btn-primary" disabled={saving}>
                            {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
