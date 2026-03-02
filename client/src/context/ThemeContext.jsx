import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const THEMES = [
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'github-dark', name: 'GitHub Dark', icon: '🐙' },
    { id: 'github-light', name: 'GitHub Light', icon: '🐱' },
    { id: 'high-contrast', name: 'High Contrast', icon: '🔲' },
    { id: 'solarized-dark', name: 'Solarized Dark', icon: '🌅' },
    { id: 'nord', name: 'Nord', icon: '❄️' },
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
];

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('sutrabase_theme') || 'dark';
    });
    const [accentColor, setAccentColor] = useState(() => {
        return localStorage.getItem('sutrabase_accent') || 'indigo';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('sutrabase_theme', theme);
    }, [theme]);

    useEffect(() => {
        const accent = ACCENT_COLORS.find(a => a.id === accentColor) || ACCENT_COLORS[0];
        document.documentElement.setAttribute('data-accent', accentColor);
        document.documentElement.style.setProperty('--accent-hue', accent.hue);
        document.documentElement.style.setProperty('--accent-color', accent.color);
        localStorage.setItem('sutrabase_accent', accentColor);
    }, [accentColor]);

    const cycleTheme = useCallback(() => {
        const idx = THEMES.findIndex(t => t.id === theme);
        setTheme(THEMES[(idx + 1) % THEMES.length].id);
    }, [theme]);

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
