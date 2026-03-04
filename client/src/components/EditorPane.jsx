import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Editor from './Editor.jsx';
import Preview from './Preview.jsx';
import NoteInfoSidebar from './NoteInfoSidebar.jsx';
import { renderMarkdown } from '../utils/markdown.js';

export default function EditorPane({ showMenu, onCloseMenu, menuActions }) {
    const { activeTab, editMode, setEditMode, updateTabContent, canEdit, sidebarOpen, setSidebarOpen, saveActiveFile, zoomLevel, setZoomLevel, liveEdit, setLiveEdit, readOnly, setReadOnly } = useApp();
    const [focusMode, setFocusMode] = useState(false);
    const [showNoteInfo, setShowNoteInfo] = useState(false);
    const sidebarWasOpenRef = useRef(true);
    const editorRef = useRef(null);
    const previewRef = useRef(null);
    const isSyncingRef = useRef(false);

    // Keyboard shortcuts
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
    }, [saveActiveFile]); // eslint-disable-line

    // Listen for exiting fullscreen
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
    }, []); // eslint-disable-line

    // Handle three-dots menu actions
    useEffect(() => {
        if (!menuActions) return;
        const action = menuActions;
        switch (action) {
            case 'copy':
                if (activeTab?.content) {
                    navigator.clipboard.writeText(activeTab.content);
                }
                break;
            case 'zoomIn': setZoomLevel(prev => Math.min(prev + 10, 200)); break;
            case 'zoomOut': setZoomLevel(prev => Math.max(prev - 10, 50)); break;
            case 'fitScreen': setZoomLevel(100); break;
            case 'liveEdit':
                setLiveEdit(!liveEdit);
                if (!liveEdit) { setReadOnly(false); setEditMode(true); }
                break;
            case 'readOnly':
                setReadOnly(!readOnly);
                if (!readOnly) setLiveEdit(false);
                break;
            case 'fullScreen': toggleFocusMode(); break;
            case 'noteInfo': setShowNoteInfo(!showNoteInfo); break;
            case 'save': saveActiveFile(); break;
            default: break;
        }
    }, [menuActions]); // eslint-disable-line

    const toggleFocusMode = useCallback(() => {
        setFocusMode(prev => {
            const entering = !prev;
            if (entering) {
                sidebarWasOpenRef.current = sidebarOpen;
                setSidebarOpen(false);
                const el = document.documentElement;
                (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el).catch(() => { });
            } else {
                (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch(() => { });
                setSidebarOpen(sidebarWasOpenRef.current);
            }
            return entering;
        });
    }, [sidebarOpen, setSidebarOpen]);

    const handleContentChange = useCallback((content) => {
        if (activeTab) updateTabContent(activeTab.id, content);
    }, [activeTab, updateTabContent]);

    // Scroll sync: editor -> preview
    const handleEditorScroll = useCallback((pct) => {
        if (isSyncingRef.current) return;
        const previewEl = previewRef.current;
        if (!previewEl) return;
        isSyncingRef.current = true;

        const editorView = editorRef.current?.getView?.();
        if (editorView) {
            const topLine = editorView.state.doc.lineAt(
                editorView.lineBlockAtHeight(editorView.scrollDOM.scrollTop).from
            ).number;

            const sourceLine = previewEl.querySelector(`[data-source-line="${topLine - 1}"]`);
            if (sourceLine) {
                sourceLine.scrollIntoView({ block: 'start', behavior: 'auto' });
                requestAnimationFrame(() => { isSyncingRef.current = false; });
                return;
            }

            const allSourceLines = previewEl.querySelectorAll('[data-source-line]');
            let closest = null;
            let closestDist = Infinity;
            allSourceLines.forEach(el => {
                const line = parseInt(el.getAttribute('data-source-line'));
                const dist = Math.abs(line - (topLine - 1));
                if (dist < closestDist) { closestDist = dist; closest = el; }
            });
            if (closest) {
                closest.scrollIntoView({ block: 'start', behavior: 'auto' });
                requestAnimationFrame(() => { isSyncingRef.current = false; });
                return;
            }
        }

        const maxScroll = previewEl.scrollHeight - previewEl.clientHeight;
        previewEl.scrollTop = maxScroll * pct;
        requestAnimationFrame(() => { isSyncingRef.current = false; });
    }, []);

    // Scroll sync: preview -> editor
    const handlePreviewScroll = useCallback((e) => {
        if (isSyncingRef.current) return;
        const el = e.target;
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll <= 0) return;
        const pct = el.scrollTop / maxScroll;
        isSyncingRef.current = true;
        editorRef.current?.scrollToPercent(pct);
        requestAnimationFrame(() => { isSyncingRef.current = false; });
    }, []);

    // Heading click handler for NoteInfoSidebar
    const handleHeadingClick = useCallback((id) => {
        const previewEl = previewRef.current;
        if (!previewEl) return;
        const heading = previewEl.querySelector(`#${CSS.escape(id)}`);
        if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

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

    const showEditor = canEdit && editMode && !readOnly && !liveEdit;

    return (
        <div className="editor-outer-wrapper">
            <div className="editor-pane" style={{ zoom: zoomLevel / 100 }}>
                {liveEdit ? (
                    <div className="preview-side live-edit-pane" style={{ borderLeft: 'none', flex: 1 }}>
                        <LiveEditPane content={activeTab.content} onChange={handleContentChange} />
                    </div>
                ) : showEditor ? (
                    <>
                        <div className="editor-side">
                            <Editor
                                ref={editorRef}
                                key={activeTab.fileId}
                                content={activeTab.content}
                                onChange={handleContentChange}
                                onScroll={handleEditorScroll}
                            />
                        </div>
                        <div className="preview-side" ref={previewRef} onScroll={handlePreviewScroll}>
                            <Preview content={activeTab.content} />
                        </div>
                    </>
                ) : (
                    <div className="preview-side" style={{ borderLeft: 'none', flex: 1 }} ref={previewRef}>
                        <Preview content={activeTab.content} />
                    </div>
                )}
            </div>

            {showNoteInfo && (
                <NoteInfoSidebar
                    content={activeTab.content}
                    fileName={activeTab.name}
                    fileData={activeTab}
                    onClose={() => setShowNoteInfo(false)}
                    onHeadingClick={handleHeadingClick}
                />
            )}
        </div>
    );
}

// Export menu state helpers for Layout to use
export function getMenuItems(activeTab, canEdit, liveEdit, readOnly, zoomLevel) {
    return [
        { id: 'save', label: 'Save', shortcut: '⌘S', icon: 'save', disabled: !canEdit || !activeTab, show: canEdit },
        { type: 'separator' },
        { id: 'copy', label: 'Copy as Plain Text', icon: 'copy', disabled: !activeTab },
        { type: 'separator' },
        { id: 'zoomRow', label: 'Zoom', type: 'zoom', zoomLevel },
        { type: 'separator' },
        { id: 'liveEdit', label: 'Live Edit', icon: 'edit', active: liveEdit, show: canEdit },
        { id: 'readOnly', label: 'Read Only', icon: 'eye', active: readOnly },
        { id: 'fullScreen', label: 'Full Screen', icon: 'maximize' },
        { type: 'separator' },
        { id: 'noteInfo', label: 'Note Info', icon: 'info' },
        { type: 'separator' },
        { id: 'export', label: 'Export', icon: 'download', disabled: !activeTab },
        { id: 'share', label: 'Share', icon: 'share', disabled: true },
    ];
}

// --- Live Edit Pane ---
// Groups fenced code blocks and tables as single editable blocks
function LiveEditPane({ content, onChange }) {
    const [editingBlockIdx, setEditingBlockIdx] = useState(null);
    const [editText, setEditText] = useState('');
    const textareaRef = useRef(null);

    // Parse content into blocks: regular lines, code blocks, tables
    const blocks = useMemo(() => {
        const lines = (content || '').split('\n');
        const result = [];
        let i = 0;
        while (i < lines.length) {
            // Fenced code block
            if (lines[i].trim().startsWith('```')) {
                const blockStart = i;
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    i++;
                }
                if (i < lines.length) i++; // include closing ```
                result.push({ type: 'code', lines: lines.slice(blockStart, i), startLine: blockStart });
            }
            // Table block (consecutive lines starting with |)
            else if (lines[i].trim().startsWith('|')) {
                const blockStart = i;
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    i++;
                }
                result.push({ type: 'table', lines: lines.slice(blockStart, i), startLine: blockStart });
            }
            // Regular line
            else {
                result.push({ type: 'line', lines: [lines[i]], startLine: i });
                i++;
            }
        }
        return result;
    }, [content]);

    const handleBlockClick = (blockIdx) => {
        const block = blocks[blockIdx];
        setEditingBlockIdx(blockIdx);
        setEditText(block.lines.join('\n'));
        setTimeout(() => {
            const ta = textareaRef.current;
            if (ta) {
                ta.focus();
                ta.style.height = 'auto';
                ta.style.height = ta.scrollHeight + 'px';
            }
        }, 0);
    };

    const commitEdit = useCallback(() => {
        if (editingBlockIdx === null) return;
        const block = blocks[editingBlockIdx];
        const allLines = (content || '').split('\n');
        const editedLines = editText.split('\n');
        allLines.splice(block.startLine, block.lines.length, ...editedLines);
        onChange(allLines.join('\n'));
        setEditingBlockIdx(null);
    }, [editingBlockIdx, editText, blocks, content, onChange]);

    const handleKeyDown = (e) => {
        if (editingBlockIdx === null) return;
        const block = blocks[editingBlockIdx];

        // For multi-line blocks (code/table), Enter should just insert newline
        if (block.type === 'code' || block.type === 'table') {
            if (e.key === 'Escape') {
                e.preventDefault();
                commitEdit();
            }
            // Let Enter work naturally for multi-line editing
            // Auto-close ``` if user types ``` at the start
            return;
        }

        // Single-line behavior
        if (e.key === 'Enter') {
            e.preventDefault();
            // Check if the user just typed ```, auto-close it
            const trimmed = editText.trim();
            if (trimmed.startsWith('```') && !trimmed.endsWith('```')) {
                setEditText(editText + '\n\n```');
                setTimeout(() => {
                    const ta = textareaRef.current;
                    if (ta) {
                        ta.style.height = 'auto';
                        ta.style.height = ta.scrollHeight + 'px';
                        // Move cursor between the backticks
                        const pos = editText.length + 1;
                        ta.setSelectionRange(pos, pos);
                    }
                }, 0);
                return;
            }
            commitEdit();
            // Move to next block
            if (editingBlockIdx < blocks.length - 1) {
                handleBlockClick(editingBlockIdx + 1);
            } else {
                // Add a new line at end
                const allLines = (content || '').split('\n');
                allLines.push('');
                onChange(allLines.join('\n'));
                setTimeout(() => {
                    setEditingBlockIdx(blocks.length);
                    setEditText('');
                    setTimeout(() => {
                        const ta = textareaRef.current;
                        if (ta) { ta.focus(); ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
                    }, 0);
                }, 50);
            }
        } else if (e.key === 'Escape') {
            setEditingBlockIdx(null);
        } else if (e.key === 'ArrowUp' && editingBlockIdx > 0) {
            e.preventDefault();
            commitEdit();
            handleBlockClick(editingBlockIdx - 1);
        } else if (e.key === 'ArrowDown' && editingBlockIdx < blocks.length - 1) {
            e.preventDefault();
            commitEdit();
            handleBlockClick(editingBlockIdx + 1);
        }
    };

    const handleTextareaChange = (e) => {
        setEditText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const renderBlock = (block) => {
        const text = block.lines.join('\n');
        if (block.type === 'code' || block.type === 'table') {
            return renderMarkdown(text);
        }
        const line = block.lines[0];
        if (!line.trim()) return '<br>';
        return renderMarkdown(line).replace(/^<p>/, '').replace(/<\/p>\n?$/, '');
    };

    return (
        <div className="live-edit-content md-preview">
            {blocks.map((block, idx) => (
                editingBlockIdx === idx ? (
                    <div key={idx} className={`live-edit-line editing${block.type !== 'line' ? ' multi-line' : ''}`}>
                        <textarea
                            ref={textareaRef}
                            className="live-edit-textarea"
                            value={editText}
                            onChange={handleTextareaChange}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                            rows={block.type !== 'line' ? Math.max(3, block.lines.length) : 1}
                        />
                    </div>
                ) : (
                    <div
                        key={idx}
                        className={`live-edit-line rendered${block.type !== 'line' ? ' block-element' : ''}${!block.lines[0].trim() && block.type === 'line' ? ' empty-line' : ''}`}
                        onClick={() => handleBlockClick(idx)}
                        dangerouslySetInnerHTML={{ __html: renderBlock(block) }}
                    />
                )
            ))}
        </div>
    );
}
