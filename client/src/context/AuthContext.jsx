import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('md_viewer_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(true);

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

    const login = useCallback(async (email, password) => {
        const data = await api.login(email, password);
        localStorage.setItem('md_viewer_token', data.token);
        localStorage.setItem('md_viewer_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const signup = useCallback(async (email, name, password) => {
        const data = await api.signup(email, name, password);
        localStorage.setItem('md_viewer_token', data.token);
        localStorage.setItem('md_viewer_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('md_viewer_token');
        localStorage.removeItem('md_viewer_user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
