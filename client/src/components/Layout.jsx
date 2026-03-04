import { useState, useRef, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import TabBar from './TabBar.jsx';
import EditorPane from './EditorPane.jsx';
import BottomBar from './BottomBar.jsx';
import SettingsModal from './SettingsModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { renderMarkdown } from '../utils/markdown.js';

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
    const { toasts, sidebarOpen, setSidebarOpen, sidebarWidth, setSidebarWidth, activeTab, canEdit, addToast } = useApp();
    const [showSettings, setShowSettings] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [menuAction, setMenuAction] = useState(null);
    const menuRef = useRef(null);
    const menuBtnRef = useRef(null);
    const isResizingRef = useRef(false);

    // Sidebar resize
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        const onMove = (ev) => {
            if (!isResizingRef.current) return;
            const newWidth = Math.max(200, Math.min(500, ev.clientX));
            setSidebarWidth(newWidth);
        };
        const onUp = () => {
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [setSidebarWidth]);

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    const exportAs = useCallback((format) => {
        if (!activeTab) return;
        const content = activeTab.content || '';
        const name = activeTab.name?.replace(/\.md$/, '') || 'untitled';

        if (format === 'md') {
            const blob = new Blob([content], { type: 'text/markdown' });
            downloadBlob(blob, `${name}.md`);
            addToast('Exported as Markdown');
        } else if (format === 'html') {
            const renderedHtml = renderMarkdown(content);
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>
body{font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#2d2d2f;background:#fafafa}
h1,h2,h3{margin-top:1.5em;color:#1a1a1a}h1{font-size:1.8em;border-bottom:1px solid #e5e5e5;padding-bottom:0.3em}
pre{background:#f5f5f7;padding:16px;border-radius:10px;overflow-x:auto;border:1px solid #e5e5e5}
code{background:#f5f5f7;padding:2px 6px;border-radius:4px;font-size:0.9em}
pre code{background:none;padding:0}img{max-width:100%;border-radius:8px}
blockquote{border-left:3px solid #6366f1;padding:8px 16px;margin:12px 0;background:#f0f0ff;border-radius:0 8px 8px 0}
table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:8px 12px;border:1px solid #e5e5e5;text-align:left}
th{background:#f5f5f7;font-weight:600}
</style></head><body>${renderedHtml}</body></html>`;
            const blob = new Blob([html], { type: 'text/html' });
            downloadBlob(blob, `${name}.html`);
            addToast('Exported as HTML');
        } else if (format === 'pdf') {
            const renderedHtml = renderMarkdown(content);
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>
body{font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#2d2d2f}
h1,h2,h3{margin-top:1.5em}h1{font-size:1.8em;border-bottom:1px solid #e5e5e5;padding-bottom:0.3em}
pre{background:#f5f5f7;padding:16px;border-radius:10px;overflow-x:auto}
code{background:#f5f5f7;padding:2px 6px;border-radius:4px;font-size:0.9em}
pre code{background:none;padding:0}img{max-width:100%}
blockquote{border-left:3px solid #6366f1;padding:8px 16px;margin:12px 0}
table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;border:1px solid #ddd}
@media print{body{margin:0;padding:20px;max-width:none}}
</style></head><body>${renderedHtml}</body></html>`;
            const win = window.open('', '_blank');
            win.document.write(html);
            win.document.close();
            setTimeout(() => { win.print(); }, 500);
            addToast('Opening print dialog for PDF');
        }
    }, [activeTab, addToast]);

    const handleMenuAction = useCallback((action) => {
        if (action === 'toggleMenu') {
            setShowMenu(prev => !prev);
            return;
        }

        // For zoom actions, DON'T close menu
        if (action === 'zoomIn' || action === 'zoomOut') {
            setMenuAction(action);
            setTimeout(() => setMenuAction(null), 50);
            return;
        }

        // For everything else, close menu
        setShowMenu(false);

        if (action === 'exportMd') { exportAs('md'); return; }
        if (action === 'exportHtml') { exportAs('html'); return; }
        if (action === 'exportPdf') { exportAs('pdf'); return; }

        setMenuAction(action);
        setTimeout(() => setMenuAction(null), 50);
    }, [exportAs]);

    const handleOverlayClick = useCallback(() => setShowMenu(false), []);

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
            {sidebarOpen && (
                <>
                    <SidebarWrapper onOpenSettings={() => setShowSettings(true)} width={sidebarWidth} />
                    <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} />
                </>
            )}

            <div className="main-content">
                <TabBar onMenuAction={handleMenuAction} />
                <EditorPane menuActions={menuAction} />
                <BottomBar />
            </div>

            {showMenu && (
                <>
                    <div className="menu-overlay" onClick={handleOverlayClick} />
                    <ThreeDotsMenu onAction={handleMenuAction} activeTab={activeTab} canEdit={canEdit} />
                </>
            )}

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className="toast">{t.message}</div>
                ))}
            </div>
        </div>
    );
}

// Three dots dropdown menu component
function ThreeDotsMenu({ onAction, activeTab, canEdit }) {
    const [showExport, setShowExport] = useState(false);
    const { liveEdit, readOnly, focusMode } = useApp();

    return (
        <div className="three-dots-menu">
            {canEdit && (
                <button className="menu-item" onClick={() => onAction('save')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                    <span>Save</span>
                    <span className="menu-shortcut">⌘S</span>
                </button>
            )}
            <div className="menu-separator" />
            <button className="menu-item" onClick={() => onAction('copy')} disabled={!activeTab}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                <span>Copy as Plain Text</span>
            </button>
            <div className="menu-separator" />
            {/* Zoom row — clicking zoom buttons does NOT close menu */}
            <div className="menu-item zoom-row-full">
                <button className="zoom-btn-full" onClick={(e) => { e.stopPropagation(); onAction('zoomOut'); }} title="Zoom out">−</button>
                <button className="zoom-btn-full zoom-fit" onClick={(e) => { e.stopPropagation(); onAction('fitScreen'); }} title="Fit to screen">Fit</button>
                <button className="zoom-btn-full" onClick={(e) => { e.stopPropagation(); onAction('zoomIn'); }} title="Zoom in">+</button>
            </div>
            <div className="menu-separator" />
            {canEdit && (
                <button className={`menu-item${liveEdit ? ' menu-item-active' : ''}`} onClick={() => onAction('liveEdit')}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>
                    <span>{liveEdit ? 'Turn off Live Edit' : 'Live Edit'}</span>
                </button>
            )}
            <button className={`menu-item${readOnly ? ' menu-item-active' : ''}`} onClick={() => onAction('readOnly')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                <span>{readOnly ? 'Turn off Read Only' : 'Read Only'}</span>
            </button>
            <button className="menu-item" onClick={() => onAction('fullScreen')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                <span>Full Screen</span>
            </button>
            <div className="menu-separator" />
            <button className="menu-item" onClick={() => onAction('noteInfo')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span>Note Info</span>
            </button>
            <div className="menu-separator" />
            <div className="menu-item menu-item-with-submenu" onClick={() => setShowExport(!showExport)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                <span>Export</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto' }}>
                    <polyline points={showExport ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                </svg>
            </div>
            {showExport && (
                <div className="menu-submenu">
                    <button className="menu-item" onClick={() => onAction('exportMd')} disabled={!activeTab}>
                        <span>Markdown (.md)</span>
                    </button>
                    <button className="menu-item" onClick={() => onAction('exportHtml')} disabled={!activeTab}>
                        <span>HTML (.html)</span>
                    </button>
                    <button className="menu-item" onClick={() => onAction('exportPdf')} disabled={!activeTab}>
                        <span>PDF (Print)</span>
                    </button>
                </div>
            )}
            <button className="menu-item" disabled>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                <span>Share</span>
                <span className="menu-badge">Coming soon</span>
            </button>
        </div>
    );
}

function SidebarWrapper({ onOpenSettings, width }) {
    const { activeCollection, collections, switchCollection, loadCollections, loadTree, addToast, canEdit, tree, activeTab } = useApp();
    const { logout } = useAuth();
    const [showNewCollection, setShowNewCollection] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColDesc, setNewColDesc] = useState('');
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const fileInputRef = useRef(null);

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newColName.trim()) return;
        try {
            const { api } = await import('../api/client.js');
            const data = await api.createCollection(newColName.trim(), newColDesc.trim());
            await loadCollections();
            if (data.collection) await switchCollection(data.collection);
            addToast(`Created "${newColName.trim()}"`);
            setShowNewCollection(false);
            setNewColName('');
            setNewColDesc('');
        } catch (err) {
            addToast(err.message || 'Failed to create collection');
        }
    };

    const handleFileUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Use active tab's folder, fall back to first folder in tree
        let targetFolderId = activeTab?.folder_id;
        if (!targetFolderId) {
            const findFirstFolder = (nodes) => {
                for (const n of nodes) {
                    if (n.type === 'folder') return n.id;
                    if (n.children) { const found = findFirstFolder(n.children); if (found) return found; }
                }
                return null;
            };
            targetFolderId = findFirstFolder(tree);
        }
        if (!targetFolderId) { addToast('Create a folder first'); return; }
        const { api } = await import('../api/client.js');
        let uploaded = 0;
        for (const file of files) {
            try {
                const text = await file.text();
                const name = file.name.endsWith('.md') || file.name.endsWith('.txt') ? file.name : `${file.name}.md`;
                const result = await api.createFile(name, targetFolderId);
                if (result.file?.id) { await api.updateFile(result.file.id, { content: text }); uploaded++; }
            } catch (err) { addToast(`Failed to upload ${file.name}`); }
        }
        if (uploaded > 0) { addToast(`Uploaded ${uploaded} file(s)`); await loadTree(); }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const collectionControls = (
        <div className="sidebar-collection-controls">
            {canEdit && !showNewCollection && (
                <button className="sidebar-nav-item sidebar-nav-new-collection" onClick={() => setShowNewCollection(true)} title="New Collection">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                    <span>New Collection</span>
                </button>
            )}
            {canEdit && showNewCollection && (
                <form className="sidebar-new-col-form" onSubmit={handleCreateCollection}>
                    <input className="input" placeholder="Collection name" value={newColName} onChange={e => setNewColName(e.target.value)} autoFocus required style={{ marginBottom: 5 }} />
                    <input className="input" placeholder="Description (optional)" value={newColDesc} onChange={e => setNewColDesc(e.target.value)} style={{ marginBottom: 6 }} />
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 'var(--font-size-xs)' }} onClick={() => { setShowNewCollection(false); setNewColName(''); setNewColDesc(''); }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '3px 8px', fontSize: 'var(--font-size-xs)' }}>Create</button>
                    </div>
                </form>
            )}
            {/* Collection switcher button — hover shows "Switch collection" */}
            <button
                className="sidebar-nav-item sidebar-nav-collection collection-hover-switch"
                onClick={() => setShowCollectionModal(true)}
                title="Switch Collection"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                <span className="collection-default-text">{activeCollection?.name || 'No collection'}</span>
                <span className="collection-hover-text">Switch collection</span>
            </button>
        </div>
    );

    return (
        <>
            <div className="sidebar" style={{ width: `${width}px` }}>
                <Sidebar collectionControls={collectionControls} onUploadClick={() => fileInputRef.current?.click()} />
                <div className="sidebar-bottom-nav">
                    <button className="sidebar-nav-item" onClick={onOpenSettings} title="Settings">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                        <span>Settings</span>
                    </button>
                    <button className="sidebar-nav-item sidebar-nav-logout" onClick={logout} title="Logout">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        <span>Logout</span>
                    </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".md,.txt" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>

            {/* Collection Switcher Modal */}
            {showCollectionModal && (
                <div className="modal-overlay" onClick={() => setShowCollectionModal(false)} style={{ zIndex: 2500 }}>
                    <div className="modal collection-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Switch Collection</h2>
                            <button className="btn-icon" onClick={() => setShowCollectionModal(false)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="collection-modal-list">
                            {collections.map(col => (
                                <div
                                    key={col.id}
                                    className={`collection-modal-item${col.id === activeCollection?.id ? ' active' : ''}`}
                                    onClick={() => { switchCollection(col); setShowCollectionModal(false); }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{col.name}</div>
                                        {col.description && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{col.description}</div>}
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{col.file_count || 0} files · {col.folder_count || 0} folders</div>
                                    </div>
                                    {col.id === activeCollection?.id && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
