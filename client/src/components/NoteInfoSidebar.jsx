import { useMemo } from 'react';
import { renderMarkdown } from '../utils/markdown.js';

export default function NoteInfoSidebar({ content, fileName, fileData, onClose, onHeadingClick }) {
    // Extract headings from markdown content
    const headings = useMemo(() => {
        if (!content) return [];
        const lines = content.split('\n');
        const result = [];
        let inCodeBlock = false;
        for (const line of lines) {
            if (line.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                continue;
            }
            if (inCodeBlock) continue;
            const match = line.match(/^(#{1,6})\s+(.+)/);
            if (match) {
                result.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    id: match[2].trim().toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, ''),
                });
            }
        }
        return result;
    }, [content]);

    const tags = useMemo(() => {
        if (!content) return [];
        const tagSet = new Set();
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('#')) continue;
            const matches = line.match(/(?:^|\s)#([a-zA-Z][\w-]*)/g);
            if (matches) {
                matches.forEach(m => tagSet.add(m.trim().slice(1)));
            }
        }
        return [...tagSet];
    }, [content]);

    const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
    const charCount = content ? content.length : 0;
    const lineCount = content ? content.split('\n').length : 0;

    return (
        <div className="note-info-sidebar">
            <div className="note-info-header">
                <h3>Note Info</h3>
                <button className="btn-icon" onClick={onClose} title="Close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Scrollable body */}
            <div className="note-info-body">
                {/* Metadata first */}
                <div className="note-info-section">
                    <h4>Metadata</h4>
                    <div className="note-info-meta">
                        <div className="meta-row"><span className="meta-label">File</span><span className="meta-value">{fileName || '—'}</span></div>
                        {fileData?.folder_name && <div className="meta-row"><span className="meta-label">Location</span><span className="meta-value">{fileData.folder_name}</span></div>}
                        {fileData?.created_at && <div className="meta-row"><span className="meta-label">Created</span><span className="meta-value">{new Date(fileData.created_at).toLocaleDateString()}</span></div>}
                        {fileData?.updated_at && <div className="meta-row"><span className="meta-label">Modified</span><span className="meta-value">{new Date(fileData.updated_at).toLocaleDateString()}</span></div>}
                        <div className="meta-row"><span className="meta-label">Words</span><span className="meta-value">{wordCount.toLocaleString()}</span></div>
                        <div className="meta-row"><span className="meta-label">Characters</span><span className="meta-value">{charCount.toLocaleString()}</span></div>
                        <div className="meta-row"><span className="meta-label">Lines</span><span className="meta-value">{lineCount.toLocaleString()}</span></div>
                    </div>
                </div>

                {/* Table of Contents */}
                <div className="note-info-section">
                    <h4>Table of Contents</h4>
                    {headings.length === 0 ? (
                        <p className="note-info-empty">No headings found</p>
                    ) : (
                        <ul className="note-info-toc">
                            {headings.map((h, i) => (
                                <li
                                    key={i}
                                    className={`toc-item toc-level-${h.level}`}
                                    onClick={() => onHeadingClick?.(h.id)}
                                >
                                    {h.text}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Tags */}
                <div className="note-info-section">
                    <h4>Tags</h4>
                    {tags.length === 0 ? (
                        <p className="note-info-empty">No tags found</p>
                    ) : (
                        <div className="note-info-tags">
                            {tags.map(tag => (
                                <span key={tag} className="tag-badge">#{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
