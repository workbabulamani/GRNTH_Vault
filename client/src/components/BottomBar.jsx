import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../api/client.js';

export default function BottomBar() {
    const { activeCollection, collections, switchCollection, activeTab, loadCollections, addToast } = useApp();
    const [showPicker, setShowPicker] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const wordCount = activeTab?.content
        ? activeTab.content.split(/\s+/).filter(Boolean).length
        : 0;
    const charCount = activeTab?.content?.length || 0;

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            const data = await api.createCollection(newName.trim(), newDesc.trim());
            await loadCollections();
            switchCollection(data.collection);
            setShowCreate(false);
            setNewName('');
            setNewDesc('');
            setShowPicker(false);
            addToast(`Created "${newName.trim()}"`);
        } catch (err) {
            addToast(err.message || 'Failed to create collection');
        }
    };

    return (
        <>
            <div className="bottom-bar">
                <div
                    className="collection-selector"
                    onClick={() => setShowPicker(!showPicker)}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                    </svg>
                    {activeCollection?.name || 'No collection'}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
                <div className="spacer" />
                {activeTab && (
                    <>
                        <span className="status-item">{wordCount} words</span>
                        <span className="status-item">{charCount} chars</span>
                    </>
                )}
            </div>

            {showPicker && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => { setShowPicker(false); setShowCreate(false); }} />
                    <div className="collection-picker">
                        {collections.map(col => (
                            <div
                                key={col.id}
                                className={`collection-picker-item${col.id === activeCollection?.id ? ' active' : ''}`}
                                onClick={() => { switchCollection(col); setShowPicker(false); }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                                </svg>
                                <div className="col-info">
                                    <div className="col-name">{col.name}</div>
                                    <div className="col-count">{col.file_count || 0} files · {col.folder_count || 0} folders</div>
                                </div>
                            </div>
                        ))}
                        <div className="dropdown-separator" />
                        {!showCreate ? (
                            <button
                                className="collection-picker-item"
                                onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
                                style={{ border: 'none', width: '100%', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                                </svg>
                                <span style={{ color: 'var(--accent-color)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>New Collection</span>
                            </button>
                        ) : (
                            <form onSubmit={handleCreateCollection} className="collection-create-form" onClick={e => e.stopPropagation()}>
                                <input
                                    className="input"
                                    placeholder="Collection name"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    autoFocus
                                    required
                                    style={{ marginBottom: 6, fontSize: 'var(--font-size-sm)' }}
                                />
                                <input
                                    className="input"
                                    placeholder="Description (optional)"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                    style={{ marginBottom: 8, fontSize: 'var(--font-size-sm)' }}
                                />
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)} style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}>Create</button>
                                </div>
                            </form>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
