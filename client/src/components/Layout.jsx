import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TabBar from './TabBar.jsx';
import EditorPane from './EditorPane.jsx';
import BottomBar from './BottomBar.jsx';
import SettingsModal from './SettingsModal.jsx';
import { useApp } from '../context/AppContext.jsx';

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
    return (
        <div className="sidebar">
            <Sidebar />
            <div style={{
                padding: '8px 12px',
                borderTop: '1px solid var(--border-secondary)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4
            }}>
                <button className="btn-icon" onClick={onOpenSettings} title="Settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
