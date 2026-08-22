import React, { useState, useEffect } from 'react';
import {
  Sun, Moon, Monitor, Bell, Palette, Type, Download, Upload,
  Shield, Database, School, Save, RotateCcw, Check, Loader,
  BookOpen, LogOut, Users, CreditCard, Printer, Sliders, AlertCircle,
  Sparkles, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settings.store';
import { useAuthStore } from '../../store/auth.store';
import { SIDEBAR_THEMES } from '../../config/sidebarThemes';
import api from '../../lib/api';

// ── Helpers & Micro-Components ────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200/80 dark:border-slate-800">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00875a] to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 text-white">
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{title}</h2>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{description}</p>}
    </div>
  </div>
);

const ToggleSwitch = ({ enabled, onChange, label, description, disabled }) => (
  <div className={`flex items-center justify-between py-3.5 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <div className="flex-1 min-w-0 pr-3">
      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      {description && <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      aria-label={label}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none shrink-0 cursor-pointer ${
        enabled ? 'bg-[#00875a] shadow-md shadow-emerald-500/30' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const CheckDot = ({ gradient, active, onClick, label }) => (
  <div className="flex flex-col items-center gap-1.5">
    <button
      type="button"
      onClick={onClick}
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${gradient} ${
        active ? 'ring-3 ring-offset-2 ring-[#00875a] scale-110 shadow-lg' : 'hover:scale-105 opacity-90 hover:opacity-100'
      }`}
    >
      {active && <Check className="w-4 h-4 text-white stroke-[3]" />}
    </button>
    <span className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
  </div>
);

const colorSchemes = [
  { id: 'emerald', label: 'Emerald', gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
  { id: 'indigo', label: 'Indigo', gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
  { id: 'blue', label: 'Blue', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
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

// ── Main Page Component ────────────────────────────────────────────────────────
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
    if (role === 'ceo' || role === 'admin') return tabs;
    if (role === 'accountant') {
      return tabs.filter((t) => ['appearance', 'notifications', 'fees', 'print', 'security'].includes(t.id));
    }
    if (role === 'teacher') {
      return tabs.filter((t) => ['appearance', 'notifications', 'attendance', 'academic', 'security'].includes(t.id));
    }
    return [tabs[0]];
  };

  const visibleTabs = getVisibleTabs();

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const update = (key, value) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    if (['darkMode', 'fontSize', 'colorScheme', 'sidebarTheme', 'language'].includes(key)) {
      store.updateSettings({ [key]: value });
    }
  };

  const toggleWorkingDay = (day) => {
    const days = local.workingDays || [];
    update('workingDays', days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
  };

  // ── Load Settings from Backend ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/settings');
        const backendData = res.data || {};
        setLocal((prev) => ({ ...prev, ...backendData }));
        store.updateSettings(backendData);
      } catch (err) {
        console.warn('[Settings] Using cached/local settings:', err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line

  // ── Live Theme & Dark Mode Synchronizer ───────────────────────
  useEffect(() => {
    const html = document.documentElement;
    const isDark =
      local.darkMode === true ||
      local.darkMode === 'true' ||
      (local.darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }

    const sizeMap = { small: '13px', medium: '15px', large: '17px' };
    html.style.fontSize = sizeMap[local.fontSize] || '15px';
    html.setAttribute('data-color-scheme', local.colorScheme || 'emerald');
    html.setAttribute('data-sidebar-theme', local.sidebarTheme || 'midnight');
  }, [local.darkMode, local.fontSize, local.colorScheme, local.sidebarTheme]);

  // ── Save Action ───────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setDbWarning('');
    try {
      store.updateSettings(local);
      const { data } = await api.put('/settings', local);

      if (data?.warning) {
        setDbWarning(data.warning);
        toast.success('Settings saved (locally in browser)');
      } else {
        toast.success('✅ Settings saved successfully!');
      }
    } catch (err) {
      store.updateSettings(local);
      toast.success('Settings updated locally!');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset Action ──────────────────────────────────────────────
  const handleReset = () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    const defaults = {
      darkMode: false,
      fontSize: 'medium',
      language: 'en',
      colorScheme: 'emerald',
      sidebarTheme: 'midnight',
      emailNotifications: true,
      smsNotifications: false,
      feeAlerts: true,
      attendanceAlerts: true,
      resultAlerts: true,
      schoolName: '',
      currency: 'PKR',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Asia/Karachi',
      lateFeeEnabled: true,
      lateFeeAmount: 50,
      lateFeeAfterDays: 10,
      gracePeriodDays: 5,
      feeDueDay: '10',
      autoWaiveLateFee: true,
      attendanceTime: '08:00',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      minAttendancePercent: 75,
      lateMarkMinutes: 15,
      passingMarks: 40,
      maxMarks: 100,
      gradingSystem: 'percentage',
      printHeaderEnabled: true,
      printFooterEnabled: true,
      printWatermark: false,
      paperSize: 'A4',
      printFooterText: '',
      sessionTimeout: '30',
      minPasswordLength: 8,
      autoLogout: true,
      activityLog: true,
      autoBackup: false,
    };
    setLocal((prev) => ({ ...prev, ...defaults }));
    store.updateSettings(defaults);
    document.documentElement.classList.remove('dark');
    document.documentElement.style.fontSize = '15px';
    toast('Settings reset to defaults', { icon: '🔄' });
  };

  // ── Backup Export / Import ────────────────────────────────────
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
        const {
          setDarkMode,
          setFontSize,
          setLanguage,
          setColorScheme,
          setSidebarCollapsed,
          updateSettings,
          ...cleanSettings
        } = importedSettings;
        setLocal((prev) => ({ ...prev, ...cleanSettings }));
        store.updateSettings(cleanSettings);
        toast.success('✅ Backup restored successfully!');
      } catch {
        toast.error('❌ Invalid backup file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500 dark:text-slate-400">
        <Loader className="w-8 h-8 animate-spin text-[#00875a]" />
        <span className="text-sm font-semibold">Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#00875a] to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-600/20 text-white shrink-0">
            <Sliders className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                System Settings
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Customize themes, school preferences, rules & preferences
            </p>
          </div>
        </div>

        {/* Desktop Header Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#00875a] hover:bg-[#00704a] shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning Alert if any */}
      {dbWarning && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>{dbWarning}</span>
        </div>
      )}

      {/* ═══════════ MAIN CONTENT: TABS + PANELS ═══════════ */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        
        {/* ── TABS NAVIGATION ── */}
        {/* Mobile: Horizontal Pill Scroller | Desktop: Vertical Glass Card */}
        <div className="lg:w-60 shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 sm:p-2 shadow-sm flex lg:flex-col overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 sticky top-14 lg:top-4 z-20">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#00875a] text-white shadow-md shadow-emerald-900/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TAB PANELS CONTAINER ── */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm">
            
            {/* ═══ 1. APPEARANCE ═══ */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <SectionHeader
                  icon={Palette}
                  title="Theme & Appearance"
                  description="Customize theme modes, color accents, and luxury sidebar styling"
                />

                {/* Theme Mode */}
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                    🌙 Theme Mode (Live Preview)
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: false, label: 'Light', icon: Sun, desc: 'Clean White' },
                      { id: true, label: 'Dark', icon: Moon, desc: 'Midnight Dark' },
                      { id: 'system', label: 'Auto', icon: Monitor, desc: 'System Sync' },
                    ].map((mode) => {
                      const isSelected = local.darkMode === mode.id;
                      const ModeIcon = mode.icon;
                      return (
                        <button
                          key={String(mode.id)}
                          type="button"
                          onClick={() => update('darkMode', mode.id)}
                          className={`flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-[#00875a] bg-emerald-50/50 dark:bg-emerald-950/40 text-[#00875a] dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <ModeIcon className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-1.5 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold">{mode.label}</span>
                          <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {mode.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                    🎨 Primary Accent Color
                  </p>
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    {colorSchemes.map((c) => (
                      <CheckDot
                        key={c.id}
                        gradient={c.gradient}
                        active={local.colorScheme === c.id}
                        onClick={() => update('colorScheme', c.id)}
                        label={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Sidebar Luxury Theme Selector */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="mb-3">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      🎨 Luxury Sidebar Themes
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select navigation bar style with high readability and contrast
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    {SIDEBAR_THEMES.map((theme) => {
                      const isSelected = (local.sidebarTheme || 'midnight') === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => update('sidebarTheme', theme.id)}
                          className={`text-left p-3 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'border-[#00875a] bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-full h-10 rounded-xl bg-gradient-to-r ${theme.swatchBg} p-2 flex items-center justify-between border border-black/10 shadow-inner mb-2`}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-md bg-white/20 flex items-center justify-center text-[9px] text-white font-bold">
                                S
                              </div>
                              <div className="w-12 h-1.5 rounded bg-white/30" />
                            </div>
                            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm" />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <div>
                              <p className={`text-xs font-bold ${isSelected ? 'text-[#00875a] dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {theme.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {theme.description}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#00875a] dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Size */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                    🔤 Base Font Size
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-sm">
                    {[
                      { id: 'small', label: 'Compact' },
                      { id: 'medium', label: 'Normal' },
                      { id: 'large', label: 'Large' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => update('fontSize', f.id)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                          local.fontSize === f.id
                            ? 'border-[#00875a] bg-emerald-50 dark:bg-emerald-950/40 text-[#00875a] dark:text-emerald-400 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Type className="w-3.5 h-3.5" />
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Selector */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      Language / زبان
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Display language</p>
                  </div>
                  <select
                    value={local.language || 'en'}
                    onChange={(e) => update('language', e.target.value)}
                    className="w-full sm:w-48 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                  >
                    <option value="en">English (US/UK)</option>
                    <option value="ur">اردو (Urdu - Coming Soon)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ═══ 2. NOTIFICATIONS ═══ */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <SectionHeader
                  icon={Bell}
                  title="Notification Channels"
                  description="Control alert triggers for fees, attendance, and examinations"
                />
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <ToggleSwitch
                    enabled={local.feeAlerts}
                    onChange={(v) => update('feeAlerts', v)}
                    label="Fee Due Alerts"
                    description="Trigger automated notices when fee voucher due date approaches"
                  />
                  <ToggleSwitch
                    enabled={local.attendanceAlerts}
                    onChange={(v) => update('attendanceAlerts', v)}
                    label="Daily Attendance Alerts"
                    description="Notify parents automatically on student absence or tardiness"
                  />
                  <ToggleSwitch
                    enabled={local.resultAlerts}
                    onChange={(v) => update('resultAlerts', v)}
                    label="Exam Result Alerts"
                    description="Send SMS/WhatsApp notifications when term results are finalized"
                  />
                  <ToggleSwitch
                    enabled={local.emailNotifications}
                    onChange={(v) => update('emailNotifications', v)}
                    label="Email Notification Bridge"
                    description="Send administrative audit digests via email"
                  />
                  <ToggleSwitch
                    enabled={local.smsNotifications}
                    onChange={(v) => update('smsNotifications', v)}
                    label="SMS Gateway Integration"
                    description="Route urgent notifications through telecom SMS gateways"
                  />
                </div>
              </div>
            )}

            {/* ═══ 3. SCHOOL INFO ═══ */}
            {activeTab === 'school' && (
              <div className="space-y-5">
                <SectionHeader
                  icon={School}
                  title="School Profile & Standards"
                  description="General campus details, currency, timezone, and formatting rules"
                />

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      School / Institute Full Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a]"
                      placeholder="The Smart School"
                      value={local.schoolName || ''}
                      onChange={(e) => update('schoolName', e.target.value)}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Reflected across vouchers, report cards, and header banners.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Academic Session Year
                      </label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium"
                        placeholder="2025-2026"
                        value={local.sessionYear || ''}
                        onChange={(e) => update('sessionYear', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Currency Symbol
                      </label>
                      <select
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium"
                        value={local.currency || 'PKR'}
                        onChange={(e) => update('currency', e.target.value)}
                      >
                        <option value="PKR">PKR — Pakistani Rupee (Rs.)</option>
                        <option value="USD">USD — US Dollar ($)</option>
                        <option value="AED">AED — UAE Dirham (AED)</option>
                        <option value="SAR">SAR — Saudi Riyal (SAR)</option>
                        <option value="GBP">GBP — British Pound (£)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Date Display Format
                      </label>
                      <select
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium"
                        value={local.dateFormat || 'DD/MM/YYYY'}
                        onChange={(e) => update('dateFormat', e.target.value)}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Campus Timezone
                      </label>
                      <select
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium"
                        value={local.timezone || 'Asia/Karachi'}
                        onChange={(e) => update('timezone', e.target.value)}
                      >
                        <option value="Asia/Karachi">Asia/Karachi (PKT +5)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST +4)</option>
                        <option value="Asia/Riyadh">Asia/Riyadh (AST +3)</option>
                        <option value="Europe/London">Europe/London (GMT +0)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 4. FEE SETTINGS ═══ */}
            {activeTab === 'fees' && (
              <div className="space-y-5">
                <SectionHeader
                  icon={CreditCard}
                  title="Fee & Billing Automation"
                  description="Late fee fine policies, due dates, grace periods, and auto-waiver settings"
                />

                <div className="divide-y divide-slate-100 dark:divide-slate-800 pb-2">
                  <ToggleSwitch
                    enabled={local.lateFeeEnabled}
                    onChange={(v) => update('lateFeeEnabled', v)}
                    label="Enable Late Fee Surcharges"
                    description="Automatically add a late fine when voucher is overdue"
                  />
                  <ToggleSwitch
                    enabled={local.autoWaiveLateFee !== false}
                    onChange={(v) => update('autoWaiveLateFee', v)}
                    label="Auto Waive Fine on Full Tuition Clearance"
                    description="Waiver prompt to clear accumulated late fines when base tuition is fully paid"
                  />
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${!local.lateFeeEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Late Fine Amount ({local.currency || 'PKR'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.lateFeeAmount ?? 50}
                      onChange={(e) => update('lateFeeAmount', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Fine Applicable After (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.lateFeeAfterDays ?? 10}
                      onChange={(e) => update('lateFeeAfterDays', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Grace Period Buffer (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.gracePeriodDays ?? 5}
                      onChange={(e) => update('gracePeriodDays', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Default Monthly Due Date
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.feeDueDay || '10'}
                      onChange={(e) => update('feeDueDay', e.target.value)}
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={String(d)}>
                          {d}th of every month
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 font-medium">
                  📋 Active Rule: {local.lateFeeEnabled
                    ? `${local.currency || 'PKR'} ${local.lateFeeAmount || 50} surcharge applies after ${local.lateFeeAfterDays || 10} days with a ${local.gracePeriodDays || 5}-day grace period.`
                    : 'Late fee is currently disabled.'}
                </div>
              </div>
            )}

            {/* ═══ 5. ATTENDANCE ═══ */}
            {activeTab === 'attendance' && (
              <div className="space-y-5">
                <SectionHeader
                  icon={Users}
                  title="Attendance Policies"
                  description="School start time, working week definition, and minimum passing threshold"
                />

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      School Opening Time (Attendance Threshold)
                    </label>
                    <input
                      type="time"
                      className="w-full sm:w-52 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.attendanceTime || '08:00'}
                      onChange={(e) => update('attendanceTime', e.target.value)}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Arrivals recorded after this timestamp receive a Late status.</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Active Working Days
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => {
                        const isWorking = (local.workingDays || []).includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleWorkingDay(day.id)}
                            title={day.full}
                            className={`w-10 h-10 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center ${
                              isWorking
                                ? 'bg-[#00875a] text-white shadow-md shadow-emerald-700/20 scale-105'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Minimum Attendance Req. (%)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                        value={local.minAttendancePercent ?? 75}
                        onChange={(e) => update('minAttendancePercent', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Late Mark Grace Buffer (Minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                        value={local.lateMarkMinutes ?? 15}
                        onChange={(e) => update('lateMarkMinutes', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 6. ACADEMIC ═══ */}
            {activeTab === 'academic' && (
              <div className="space-y-5">
                <SectionHeader
                  icon={BookOpen}
                  title="Academic & Examination Rules"
                  description="Passing criteria, grading system rules, and term evaluation weights"
                />

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Passing Marks (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                        value={local.passingMarks ?? 40}
                        onChange={(e) => update('passingMarks', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Default Max Marks Per Subject
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                        value={local.maxMarks ?? 100}
                        onChange={(e) => update('maxMarks', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Grading Standard
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.gradingSystem || 'percentage'}
                      onChange={(e) => update('gradingSystem', e.target.value)}
                    >
                      <option value="percentage">Percentage Based Scale (90%+, 80%+, ...)</option>
                      <option value="gpa">Standard GPA (4.0 Scale)</option>
                      <option value="letter">Letter Grades (A, B, C, D, F)</option>
                    </select>
                  </div>

                  {/* Standard Grade Preview */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Grade Matrix Overview</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] sm:text-xs">
                      {[
                        { g: 'A+ (Excellent)', r: '90-100%', c: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' },
                        { g: 'A (Very Good)', r: '80-89%', c: 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300' },
                        { g: 'B (Good)', r: '70-79%', c: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' },
                        { g: 'C (Average)', r: '60-69%', c: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' },
                        { g: 'D (Below Avg)', r: '50-59%', c: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300' },
                        { g: 'F (Fail)', r: `< ${local.passingMarks || 40}%`, c: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300' },
                      ].map((item) => (
                        <div key={item.g} className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg font-medium ${item.c}`}>
                          <span>{item.g}</span>
                          <span className="font-bold">{item.r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 7. PRINT & PDF ═══ */}
            {activeTab === 'print' && (
              <div className="space-y-5">
                <SectionHeader
                  icon={Printer}
                  title="Document Print & Export Formatting"
                  description="Print headers, page dimensions, and branding footers"
                />

                <div className="divide-y divide-slate-100 dark:divide-slate-800 pb-2">
                  <ToggleSwitch
                    enabled={local.printHeaderEnabled}
                    onChange={(v) => update('printHeaderEnabled', v)}
                    label="Official Logo & Header Banner"
                    description="Include the institution emblem on printed reports and vouchers"
                  />
                  <ToggleSwitch
                    enabled={local.printFooterEnabled}
                    onChange={(v) => update('printFooterEnabled', v)}
                    label="Page Number & Verification Footer"
                    description="Add security code and page numbering to official printouts"
                  />
                  <ToggleSwitch
                    enabled={local.printWatermark}
                    onChange={(v) => update('printWatermark', v)}
                    label="Subtle Background Watermark"
                    description="Embed watermark to prevent unauthorized document reproduction"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Standard Paper Size
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.paperSize || 'A4'}
                      onChange={(e) => update('paperSize', e.target.value)}
                    >
                      <option value="A4">A4 (Standard 210 × 297 mm)</option>
                      <option value="A5">A5 (Half A4 148 × 210 mm)</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                      <option value="Legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Custom Print Footer Note
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium"
                      placeholder="e.g. Powered by The Smart School Portal"
                      value={local.printFooterText || ''}
                      onChange={(e) => update('printFooterText', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 8. SECURITY ═══ */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <SectionHeader
                  icon={Shield}
                  title="Security & Session Management"
                  description="Session timeout boundaries, audit trail logging, and account controls"
                />

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <ToggleSwitch
                    enabled={local.autoLogout !== false}
                    onChange={(v) => update('autoLogout', v)}
                    label="Inactivity Session Lock"
                    description="Automatically terminate active session after configured timeout"
                  />
                  <ToggleSwitch
                    enabled={local.activityLog !== false}
                    onChange={(v) => update('activityLog', v)}
                    label="Continuous Action Audit Trail"
                    description="Record data modifications to the institutional Audit Log"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Inactivity Lock Timeout
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.sessionTimeout || '30'}
                      onChange={(e) => update('sessionTimeout', e.target.value)}
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="120">2 Hours</option>
                      <option value="0">Never (Unsafe)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="20"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold"
                      value={local.minPasswordLength ?? 8}
                      onChange={(e) => update('minPasswordLength', Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Force Clear Session */}
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 mt-4">
                  <p className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-300 mb-1">
                    ⚠️ Emergency Session Reset
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-400 mb-3">
                    If you suspect an active session compromise, clear all local tokens immediately.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear active browser session and log out?')) {
                        localStorage.removeItem('sms-auth');
                        window.location.href = '/login';
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-600/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Clear Active Session</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══ 9. BACKUP & RESTORE ═══ */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                <SectionHeader
                  icon={Database}
                  title="Preferences Backup & Restoration"
                  description="Export or restore your customized school preferences and themes"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Export Box */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-sm">
                        <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Export Backup File</span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        Download all current preferences, timings, and themes as a portable JSON file.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download JSON Backup</span>
                    </button>
                  </div>

                  {/* Restore Box */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
                        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Restore from Backup</span>
                      </div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                        Upload a previously downloaded JSON backup to restore all preferences instantly.
                      </p>
                    </div>
                    <label className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Select Backup File</span>
                      <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                    </label>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  💡 Note: Settings are synchronized between your browser and the cloud backend database.
                </div>
              </div>
            )}

            {/* Desktop Bottom Action Bar */}
            <div className="hidden sm:flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#00875a] hover:bg-[#00704a] shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ═══════════ MOBILE FLOATING BOTTOM ACTION BAR ═══════════ */}
      {/* Provides instant 1-thumb touch saving on mobile screens */}
      <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-2xl p-2.5 flex items-center justify-between gap-2 animate-slide-up">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] py-2.5 px-4 rounded-xl text-xs font-black text-white bg-[#00875a] active:scale-95 shadow-md shadow-emerald-800/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
