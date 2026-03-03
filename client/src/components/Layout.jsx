import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TabBar from './TabBar.jsx';
import EditorPane from './EditorPane.jsx';
import BottomBar from './BottomBar.jsx';
import SettingsModal from './SettingsModal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const SutraBaseLogoSmall = () => (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--accent-color)" opacity="0.15" />
        <path d="M10 9h8a2 2 0 012 2v10a2 2 0 01-2 2h-8a2 2 0 01-2-2V11a2 2 0 012-2z" stroke="var(--accent-color)" strokeWidth="1.5" fill="none" />
        <line x1="11" y1="16" x2="17" y2="16" stroke="var(--accent-color)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="19" x2="15" y2="19" stroke="var(--accent-color)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <circle cx="22" cy="22" r="5" fill="var(--accent-color)" />
        <path d="M20.5 22L21.5 23L23.5 21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Layout() {
    const { toasts, sidebarOpen, setSidebarOpen } = useApp();
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div className="app-layout">
            {!sidebarOpen && (
                <div className="sidebar-rail">
                    <button className="rail-btn rail-logo" onClick={() => setSidebarOpen(true)} title="Open sidebar">
                        <SutraBaseLogoSmall />
                    </button>
                    <div className="rail-spacer" />
                    <button className="rail-btn" onClick={() => setShowSettings(true)} title="Settings">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                    </button>
                </div>
            )}
            {sidebarOpen && <SidebarWrapper onOpenSettings={() => setShowSettings(true)} />}

            <div className="main-content">
                <TabBar />
                <EditorPane />
                <BottomBar />
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className="toast">{t.message}</div>
                ))}
            </div>
        </div>
    );
}

function SidebarWrapper({ onOpenSettings }) {
    const { activeCollection, collections, switchCollection, loadCollections, addToast, canEdit } = useApp();
    const { logout } = useAuth();
    const [showPicker, setShowPicker] = useState(false);
    const [showNewCollection, setShowNewCollection] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColDesc, setNewColDesc] = useState('');

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newColName.trim()) return;
        try {
            const { api } = await import('../api/client.js');
            const data = await api.createCollection(newColName.trim(), newColDesc.trim());
            await loadCollections();
            const { switchCollection: sc } = useApp();
            addToast(`Created "${newColName.trim()}"`);
            setShowNewCollection(false);
            setNewColName('');
            setNewColDesc('');
        } catch (err) {
            addToast(err.message || 'Failed to create collection');
        }
    };

    return (
        <div className="sidebar">
            <Sidebar />

            {/* Sidebar Bottom Navigation */}
            <div className="sidebar-bottom-nav">
                {/* New Collection */}
                {canEdit && !showNewCollection && (
                    <button
                        className="sidebar-nav-item sidebar-nav-new-collection"
                        onClick={() => setShowNewCollection(true)}
                        title="New Collection"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <span>New Collection</span>
                    </button>
                )}

                {/* New Collection Inline Form */}
                {canEdit && showNewCollection && (
                    <form className="sidebar-new-col-form" onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newColName.trim()) return;
                        try {
                            const { api } = await import('../api/client.js');
                            const data = await api.createCollection(newColName.trim(), newColDesc.trim());
                            await loadCollections();
                            addToast(`Created "${newColName.trim()}"`);
                            setShowNewCollection(false);
                            setNewColName('');
                            setNewColDesc('');
                        } catch (err) {
                            addToast(err.message || 'Failed to create collection');
                        }
                    }}>
                        <input
                            className="input"
                            placeholder="Collection name"
                            value={newColName}
                            onChange={e => setNewColName(e.target.value)}
                            autoFocus
                            required
                            style={{ marginBottom: 5 }}
                        />
                        <input
                            className="input"
                            placeholder="Description (optional)"
                            value={newColDesc}
                            onChange={e => setNewColDesc(e.target.value)}
                            style={{ marginBottom: 6 }}
                        />
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '3px 8px', fontSize: 'var(--font-size-xs)' }}
                                onClick={() => { setShowNewCollection(false); setNewColName(''); setNewColDesc(''); }}
                            >Cancel</button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ padding: '3px 8px', fontSize: 'var(--font-size-xs)' }}
                            >Create</button>
                        </div>
                    </form>
                )}

                {/* Current Collection Selector */}
                <div className="sidebar-nav-item sidebar-nav-collection" onClick={() => setShowPicker(!showPicker)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                    </svg>
                    <span className="sidebar-nav-collection-name">{activeCollection?.name || 'No collection'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.5 }}>
                        <polyline points={showPicker ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                    </svg>
                </div>

                {/* Collection Picker Dropdown */}
                {showPicker && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowPicker(false)} />
                        <div className="sidebar-collection-picker">
                            {collections.map(col => (
                                <div
                                    key={col.id}
                                    className={`sidebar-collection-picker-item${col.id === activeCollection?.id ? ' active' : ''}`}
                                    onClick={() => { switchCollection(col); setShowPicker(false); }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                                    </svg>
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{col.name}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{col.file_count || 0} files · {col.folder_count || 0} folders</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Settings */}
                <button className="sidebar-nav-item" onClick={onOpenSettings} title="Settings">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                    <span>Settings</span>
                </button>

                {/* Logout */}
                <button className="sidebar-nav-item sidebar-nav-logout" onClick={logout} title="Logout">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}
