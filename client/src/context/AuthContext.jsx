import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('md_viewer_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(true);
    const [pending2FA, setPending2FA] = useState(null); // { tempToken, email }
    const lastActivityRef = useRef(Date.now());
    const sessionTimeoutRef = useRef(30); // default 30 minutes

    useEffect(() => {
        const token = localStorage.getItem('md_viewer_token');
        if (token) {
            api.me().then(data => {
                setUser(data.user);
                localStorage.setItem('md_viewer_user', JSON.stringify(data.user));
            }).catch(() => {
                setUser(null);
                localStorage.removeItem('md_viewer_token');
                localStorage.removeItem('md_viewer_user');
            }).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    // Load session timeout from server
    useEffect(() => {
        api.getSessionInfo().then(data => {
            if (data.sessionTimeout) {
                sessionTimeoutRef.current = data.sessionTimeout;
            }
        }).catch(() => { /* use default */ });
    }, []);

    // Track user activity
    useEffect(() => {
        const updateActivity = () => { lastActivityRef.current = Date.now(); };
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
        return () => events.forEach(e => window.removeEventListener(e, updateActivity));
    }, []);

    // Check inactivity and token expiry every 30 seconds
    useEffect(() => {
        const check = () => {
            const token = localStorage.getItem('md_viewer_token');
            if (!token) return;

            // Check token expiry
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 < Date.now()) {
                    console.log('Session expired, logging out...');
                    setUser(null);
                    localStorage.removeItem('md_viewer_token');
                    localStorage.removeItem('md_viewer_user');
                    window.location.href = '/';
                    return;
                }
            } catch (e) { /* invalid token format */ }

            // Check inactivity
            const inactiveMs = Date.now() - lastActivityRef.current;
            const timeoutMs = sessionTimeoutRef.current * 60 * 1000;
            if (inactiveMs > timeoutMs) {
                console.log('Inactivity timeout, logging out...');
                setUser(null);
                localStorage.removeItem('md_viewer_token');
                localStorage.removeItem('md_viewer_user');
                window.location.href = '/';
            }
        };
        const interval = setInterval(check, 30000);
        return () => clearInterval(interval);
    }, []);

    const login = useCallback(async (email, password) => {
        const data = await api.login(email, password);
        if (data.requires2FA) {
            setPending2FA({ tempToken: data.tempToken, email });
            return data;
        }
        localStorage.setItem('md_viewer_token', data.token);
        localStorage.setItem('md_viewer_user', JSON.stringify(data.user));
        setUser(data.user);
        lastActivityRef.current = Date.now();
        return data;
    }, []);

    const verify2FA = useCallback(async (code) => {
        if (!pending2FA) throw new Error('No pending 2FA');
        const data = await api.totpVerifyLogin(pending2FA.tempToken, code);
        localStorage.setItem('md_viewer_token', data.token);
        localStorage.setItem('md_viewer_user', JSON.stringify(data.user));
        setUser(data.user);
        setPending2FA(null);
        lastActivityRef.current = Date.now();
        return data;
    }, [pending2FA]);

    const cancel2FA = useCallback(() => {
        setPending2FA(null);
    }, []);

    const signup = useCallback(async (email, name, password) => {
        const data = await api.signup(email, name, password);
        localStorage.setItem('md_viewer_token', data.token);
        localStorage.setItem('md_viewer_user', JSON.stringify(data.user));
        setUser(data.user);
        lastActivityRef.current = Date.now();
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('md_viewer_token');
        localStorage.removeItem('md_viewer_user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, isAuthenticated: !!user, pending2FA, verify2FA, cancel2FA }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
