import { useApp } from '../context/AppContext.jsx';

export default function TabBar() {
    const { tabs, activeTabId, setActiveTabId, closeTab } = useApp();

    if (tabs.length === 0) return null;

    return (
        <div className="tab-bar">
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    className={`tab${tab.id === activeTabId ? ' active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, opacity: 0.5 }}>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="tab-name" title={tab.name}>{tab.name}</span>
                    {tab.modified && <span className="tab-modified" />}
                    <span
                        className="tab-close"
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                        title="Close"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </span>
                </div>
            ))}
        </div>
    );
}
