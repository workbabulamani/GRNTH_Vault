import { useCallback, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Editor from './Editor.jsx';
import Preview from './Preview.jsx';

export default function EditorPane() {
    const { activeTab, editMode, setEditMode, updateTabContent, canEdit, sidebarOpen, setSidebarOpen, saveActiveFile } = useApp();
    const [focusMode, setFocusMode] = useState(false);
    const sidebarWasOpenRef = useRef(true);

    // Keyboard shortcut: Ctrl+S to save, Ctrl+Shift+F for focus mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveActiveFile();
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                toggleFocusMode();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveActiveFile]); // eslint-disable-line react-hooks/exhaustive-deps

    // Listen for exiting fullscreen externally (Esc key pressed while in fullscreen)
    useEffect(() => {
        const handleFSChange = () => {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                setFocusMode(false);
                setSidebarOpen(sidebarWasOpenRef.current);
            }
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        document.addEventListener('webkitfullscreenchange', handleFSChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFSChange);
            document.removeEventListener('webkitfullscreenchange', handleFSChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleFocusMode = useCallback(() => {
        setFocusMode(prev => {
            const entering = !prev;
            if (entering) {
                // Save sidebar state and collapse it
                sidebarWasOpenRef.current = sidebarOpen;
                setSidebarOpen(false);
                // Request fullscreen directly (must be in user gesture)
                const el = document.documentElement;
                if (el.requestFullscreen) {
                    el.requestFullscreen().catch(() => { });
                } else if (el.webkitRequestFullscreen) {
                    el.webkitRequestFullscreen();
                }
            } else {
                // Exit fullscreen
                if (document.fullscreenElement) {
                    document.exitFullscreen?.().catch(() => { });
                } else if (document.webkitFullscreenElement) {
                    document.webkitExitFullscreen?.();
                }
                // Restore sidebar
                setSidebarOpen(sidebarWasOpenRef.current);
            }
            return entering;
        });
    }, [sidebarOpen, setSidebarOpen]);

    const handleContentChange = useCallback((content) => {
        if (activeTab) {
            updateTabContent(activeTab.id, content);
        }
    }, [activeTab, updateTabContent]);

    if (!activeTab) {
        return (
            <div className="empty-state">
                <div className="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, color: 'var(--accent-color)' }}>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                </div>
                <h3>No file open</h3>
                <p>Select a file from the sidebar or create a new one to get started.</p>
            </div>
        );
    }

    const showEditor = canEdit && editMode;

    return (
        <>
            {/* Toolbar */}
            <div className="editor-toolbar">
                <div className="toolbar-group">
                    {canEdit && (
                        <button
                            className={`btn-icon${editMode ? ' active' : ''}`}
                            onClick={() => setEditMode(!editMode)}
                            title={editMode ? 'Switch to view mode' : 'Switch to edit mode'}
                        >
                            {editMode ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    )}
                    {canEdit && editMode && (
                        <button className="btn-icon" onClick={saveActiveFile} title="Save (Ctrl+S)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="spacer" />
                <span className="file-path">{activeTab.name}</span>
                {activeTab.modified && <span className="save-indicator">Unsaved</span>}
                <button
                    className={`btn-icon${focusMode ? ' active' : ''}`}
                    onClick={toggleFocusMode}
                    title={focusMode ? 'Exit focus mode (Ctrl+Shift+F)' : 'Focus mode (Ctrl+Shift+F)'}
                >
                    {focusMode ? (
                        // Exit focus mode — compress arrows pointing inward
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 3v3a2 2 0 01-2 2H3" />
                            <path d="M21 8h-3a2 2 0 01-2-2V3" />
                            <path d="M3 16h3a2 2 0 012 2v3" />
                            <path d="M16 21v-3a2 2 0 012-2h3" />
                        </svg>
                    ) : (
                        // Enter focus mode — expand arrows pointing outward
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Editor/Preview Area */}
            <div className="editor-pane">
                {showEditor ? (
                    <>
                        <div className="editor-side">
                            <Editor
                                key={activeTab.fileId}
                                content={activeTab.content}
                                onChange={handleContentChange}
                            />
                        </div>
                        <div className="preview-side">
                            <Preview content={activeTab.content} />
                        </div>
                    </>
                ) : (
                    <div className="preview-side" style={{ borderLeft: 'none', flex: 1 }}>
                        <Preview content={activeTab.content} />
                    </div>
                )}
            </div>
        </>
    );
}
