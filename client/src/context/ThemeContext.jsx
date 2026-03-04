import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client.js';

const ThemeContext = createContext(null);

export const THEMES = [
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'github-dark', name: 'GitHub Dark', icon: '🐙' },
    { id: 'github-light', name: 'GitHub Light', icon: '🐱' },
    { id: 'high-contrast', name: 'High Contrast', icon: '🔲' },
    { id: 'solarized-dark', name: 'Solarized Dark', icon: '🌅' },
    { id: 'nord', name: 'Nord', icon: '❄️' },
    { id: 'rose-pine', name: 'Rosé Pine', icon: '🌸' },
];

export const ACCENT_COLORS = [
    { id: 'indigo', name: 'Indigo', hue: '239', color: '#6366f1' },
    { id: 'blue', name: 'Blue', hue: '217', color: '#3b82f6' },
    { id: 'violet', name: 'Violet', hue: '270', color: '#8b5cf6' },
    { id: 'rose', name: 'Rose', hue: '346', color: '#f43f5e' },
    { id: 'emerald', name: 'Emerald', hue: '160', color: '#10b981' },
    { id: 'amber', name: 'Amber', hue: '38', color: '#f59e0b' },
    { id: 'cyan', name: 'Cyan', hue: '192', color: '#06b6d4' },
    { id: 'pink', name: 'Pink', hue: '330', color: '#ec4899' },
    { id: 'teal', name: 'Teal', hue: '173', color: '#14b8a6' },
    { id: 'orange', name: 'Orange', hue: '25', color: '#f97316' },
];

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem('sutrabase_theme') || 'dark';
    });
    const [accentColor, setAccentColorState] = useState(() => {
        return localStorage.getItem('sutrabase_accent') || 'indigo';
    });
    const [prefsLoaded, setPrefsLoaded] = useState(false);
    const saveTimerRef = useRef(null);

    // Load preferences from server on mount
    useEffect(() => {
        const token = localStorage.getItem('md_viewer_token');
        if (!token) { setPrefsLoaded(true); return; }
        api.getPreferences().then(data => {
            const prefs = data.preferences || {};
            if (prefs.theme && THEMES.some(t => t.id === prefs.theme)) {
                setThemeState(prefs.theme);
                localStorage.setItem('sutrabase_theme', prefs.theme);
            }
            if (prefs.accentColor && ACCENT_COLORS.some(a => a.id === prefs.accentColor)) {
                setAccentColorState(prefs.accentColor);
                localStorage.setItem('sutrabase_accent', prefs.accentColor);
            }
            setPrefsLoaded(true);
        }).catch(() => { setPrefsLoaded(true); });
    }, []);

    // Debounced save to server
    const saveToServer = useCallback((newTheme, newAccent) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const token = localStorage.getItem('md_viewer_token');
            if (!token) return;
            api.savePreferences({ theme: newTheme, accentColor: newAccent }).catch(() => { });
        }, 500);
    }, []);

    const setTheme = useCallback((newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('sutrabase_theme', newTheme);
        saveToServer(newTheme, accentColor);
    }, [accentColor, saveToServer]);

    const setAccentColor = useCallback((newAccent) => {
        setAccentColorState(newAccent);
        localStorage.setItem('sutrabase_accent', newAccent);
        saveToServer(theme, newAccent);
    }, [theme, saveToServer]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const accent = ACCENT_COLORS.find(a => a.id === accentColor) || ACCENT_COLORS[0];
        document.documentElement.setAttribute('data-accent', accentColor);
        document.documentElement.style.setProperty('--accent-hue', accent.hue);
        document.documentElement.style.setProperty('--accent-color', accent.color);
    }, [accentColor]);

    const cycleTheme = useCallback(() => {
        const idx = THEMES.findIndex(t => t.id === theme);
        setTheme(THEMES[(idx + 1) % THEMES.length].id);
    }, [theme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, accentColor, setAccentColor }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
