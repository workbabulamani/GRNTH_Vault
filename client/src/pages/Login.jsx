import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login({ onSwitch }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">📝</div>
                <h1>Welcome back</h1>
                <p className="auth-subtitle">Sign in to Sutra Knowledge Base</p>
                {error && <div className="auth-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@admin.com" required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                        {loading ? <span className="spinner" /> : 'Sign In'}
                    </button>
                </form>
                <div className="auth-footer">
                    Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }}>Sign up</a>
                </div>
            </div>
        </div>
    );
}
