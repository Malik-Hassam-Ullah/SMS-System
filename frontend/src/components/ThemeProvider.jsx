/**
 * ThemeProvider — Applies global theme settings from the settings store.
 * Works as a "side-effects only" component (renders null).
 *
 * Handles:
 *  1. Dark mode  → adds/removes 'dark' class on <html>
 *  2. Font size  → sets font-size on <html>
 *  3. Session timeout → auto-logout after N minutes of inactivity
 *
 * Must be placed inside <BrowserRouter> (it uses useNavigate for logout redirect).
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settings.store';
import { useAuthStore } from '../store/auth.store';
import api from '../lib/api';

export default function ThemeProvider({ children }) {
    const darkMode = useSettingsStore(s => s.darkMode);
    const fontSize = useSettingsStore(s => s.fontSize);
    const colorScheme = useSettingsStore(s => s.colorScheme);
    const sessionTimeout = useSettingsStore(s => s.sessionTimeout);
    const user = useAuthStore(s => s.user);
    const logout = useAuthStore(s => s.logout);
    const navigate = useNavigate();
    const timerRef = useRef(null);

    // ── Sync Settings from Backend ─────────────────────────────────
    useEffect(() => {
        if (!user) return;
        const syncSettings = async () => {
            try {
                const res = await api.get('/settings');
                if (res.data) {
                    useSettingsStore.getState().updateSettings(res.data);
                }
            } catch (err) {
                console.error("Failed to sync settings from backend:", err);
            }
        };
        syncSettings();
    }, [user]);

    // ── 1. Dark Mode ───────────────────────────────────────────────
    useEffect(() => {
        const html = document.documentElement;
        const isDark = darkMode === true || darkMode === 'true' || (darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
        }
    }, [darkMode]);

    // ── Color Scheme ───────────────────────────────────────────────
    useEffect(() => {
        const html = document.documentElement;
        html.setAttribute('data-color-scheme', colorScheme || 'indigo');
    }, [colorScheme]);

    // ── 2. Font Size ───────────────────────────────────────────────
    useEffect(() => {
        const sizeMap = { small: '13px', medium: '15px', large: '17px' };
        document.documentElement.style.fontSize = sizeMap[fontSize] || '15px';
    }, [fontSize]);

    // ── 3. Session Timeout ─────────────────────────────────────────
    useEffect(() => {
        // Clear any running timer
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!user) return; // Not logged in — no timer needed
        const timeoutMin = parseInt(sessionTimeout || '30', 10);
        if (!timeoutMin || timeoutMin === 0) return; // "Never" selected

        const timeoutMs = timeoutMin * 60 * 1000;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                console.log(`[ThemeProvider] Session expired after ${timeoutMin} min`);
                logout();
                navigate('/login', { replace: true });
            }, timeoutMs);
        };

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer(); // Start timer on mount / when user changes

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [user, sessionTimeout, logout, navigate]);

    return children;
}
