import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme, THEMES, ACCENT_COLORS } from '../context/ThemeContext.jsx';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';

export default function SettingsModal({ onClose }) {
    const { user, logout } = useAuth();
    const { theme, setTheme, accentColor, setAccentColor } = useTheme();
    const { addToast } = useApp();
    const [tab, setTab] = useState('general');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // Admin state
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('user');

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const data = await api.getUsers();
            setUsers(data.users);
        } catch (err) { addToast('Failed to load users'); }
        finally { setLoadingUsers(false); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            await api.changePassword(currentPassword, newPassword);
            addToast('Password changed');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            addToast(err.message);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            await api.createUser({ email: newUserEmail, name: newUserName, password: newUserPassword, role: newUserRole });
            addToast('User created');
            setShowAddUser(false);
            setNewUserEmail(''); setNewUserName(''); setNewUserPassword('');
            loadUsers();
        } catch (err) { addToast(err.message); }
    };

    const handleChangeRole = async (userId, role) => {
        try {
            await api.updateUser(userId, { role });
            loadUsers();
            addToast('Role updated');
        } catch (err) { addToast(err.message); }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Delete this user?')) return;
        try {
            await api.deleteUser(userId);
            loadUsers();
            addToast('User deleted');
        } catch (err) { addToast(err.message); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>Settings</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-primary)', paddingBottom: 8 }}>
                    <button className={`btn btn-ghost${tab === 'general' ? ' active' : ''}`} onClick={() => setTab('general')} style={{ fontSize: 'var(--font-size-sm)' }}>General</button>
                    <button className={`btn btn-ghost${tab === 'account' ? ' active' : ''}`} onClick={() => setTab('account')} style={{ fontSize: 'var(--font-size-sm)' }}>Account</button>
                    {user?.role === 'admin' && (
                        <button className={`btn btn-ghost${tab === 'admin' ? ' active' : ''}`} onClick={() => { setTab('admin'); loadUsers(); }} style={{ fontSize: 'var(--font-size-sm)' }}>Users</button>
                    )}
                </div>

                {tab === 'general' && (
                    <div className="settings-panel">
                        {/* Theme Selection */}
                        <div className="settings-group">
                            <h3>Theme</h3>
                            <div className="theme-grid">
                                {THEMES.map(t => (
                                    <button
                                        key={t.id}
                                        className={`theme-option${theme === t.id ? ' active' : ''}`}
                                        onClick={() => setTheme(t.id)}
                                        title={t.name}
                                    >
                                        <span className="theme-icon">{t.icon}</span>
                                        <span className="theme-name">{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accent Color */}
                        <div className="settings-group">
                            <h3>Accent Color</h3>
                            <div className="accent-grid">
                                {ACCENT_COLORS.map(a => (
                                    <button
                                        key={a.id}
                                        className={`accent-option${accentColor === a.id ? ' active' : ''}`}
                                        onClick={() => setAccentColor(a.id)}
                                        title={a.name}
                                        style={{ '--swatch-color': a.color }}
                                    >
                                        <span className="accent-swatch" />
                                        <span className="accent-name">{a.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-group">
                            <h3>About</h3>
                            <div className="settings-row">
                                <span className="label">Version</span>
                                <span>1.0.0</span>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'account' && (
                    <div className="settings-panel">
                        <div className="settings-group">
                            <h3>Profile</h3>
                            <div className="settings-row"><span className="label">Name</span><span>{user?.name}</span></div>
                            <div className="settings-row"><span className="label">Email</span><span>{user?.email}</span></div>
                            <div className="settings-row"><span className="label">Role</span><span className={`role-badge ${user?.role}`}>{user?.role}</span></div>
                        </div>
                        <div className="settings-group">
                            <h3>Change Password</h3>
                            <form onSubmit={handleChangePassword}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input className="input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                                </div>
                                <button className="btn btn-primary" type="submit">Update Password</button>
                            </form>
                        </div>
                        <div className="settings-group" style={{ marginTop: 24 }}>
                            <button className="btn btn-danger" onClick={logout}>Sign Out</button>
                        </div>
                    </div>
                )}

                {tab === 'admin' && (
                    <div className="settings-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User Management</h3>
                            <button className="btn btn-primary" onClick={() => setShowAddUser(!showAddUser)} style={{ fontSize: 'var(--font-size-xs)', padding: '4px 10px' }}>
                                + Add User
                            </button>
                        </div>

                        {showAddUser && (
                            <form onSubmit={handleAddUser} style={{ marginBottom: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                <div className="form-group"><input className="input" type="text" placeholder="Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required /></div>
                                <div className="form-group"><input className="input" type="email" placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required /></div>
                                <div className="form-group"><input className="input" type="password" placeholder="Password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required minLength={6} /></div>
                                <div className="form-group">
                                    <select className="select" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                                        <option value="user">User</option>
                                        <option value="viewer">Viewer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <button className="btn btn-primary" type="submit" style={{ fontSize: 'var(--font-size-xs)' }}>Create User</button>
                            </form>
                        )}

                        {loadingUsers ? (
                            <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>
                        ) : (
                            <table className="admin-table">
                                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.name}</td>
                                            <td style={{ color: 'var(--text-tertiary)' }}>{u.email}</td>
                                            <td>
                                                <select className="select" value={u.role} onChange={e => handleChangeRole(u.id, e.target.value)} style={{ padding: '2px 6px', fontSize: 'var(--font-size-xs)' }}>
                                                    <option value="admin">admin</option>
                                                    <option value="user">user</option>
                                                    <option value="viewer">viewer</option>
                                                </select>
                                            </td>
                                            <td>
                                                {u.id !== user.id && (
                                                    <button className="btn-icon" onClick={() => handleDeleteUser(u.id)} title="Delete user">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
