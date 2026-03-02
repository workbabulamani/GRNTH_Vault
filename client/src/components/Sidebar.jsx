import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../api/client.js';
import FileTree from './FileTree.jsx';

// Improved logo with more distinctive design
const SutraBaseLogo = () => (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--accent-color)" />
                <stop offset="1" stopColor="color-mix(in srgb, var(--accent-color), #7c3aed 50%)" />
            </linearGradient>
        </defs>
        {/* Background rounded square */}
        <rect x="0" y="0" width="34" height="34" rx="9" fill="url(#logo-grad)" opacity="0.15" />
        {/* Document shape */}
        <rect x="8" y="6" width="14" height="18" rx="2.5" stroke="url(#logo-grad)" strokeWidth="1.6" fill="none" />
        {/* Folded corner */}
        <path d="M18 6v4h4" stroke="url(#logo-grad)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Text lines */}
        <line x1="10.5" y1="14" x2="18.5" y2="14" stroke="url(#logo-grad)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="10.5" y1="17" x2="16.5" y2="17" stroke="url(#logo-grad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <line x1="10.5" y1="20" x2="14.5" y2="20" stroke="url(#logo-grad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
        {/* Accent dot badge */}
        <circle cx="26" cy="26" r="6" fill="url(#logo-grad)" />
        <path d="M23.8 26L25.2 27.4L28.2 24.6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Sidebar() {
    const { activeCollection, tree, collections, loadCollections, switchCollection, addToast, setSidebarOpen, canEdit } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [showNewCollection, setShowNewCollection] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColDesc, setNewColDesc] = useState('');

    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);
        if (!query.trim() || !activeCollection) {
            setSearchResults([]);
            return;
        }
        try {
            // Search files from API
            const data = await api.searchFiles(activeCollection.id, query);
            const fileResults = (data.files || []).map(f => ({ ...f, resultType: 'file' }));

            // Search folders locally from tree (with path building)
            const folderResults = [];
            const searchFolders = (nodes, breadcrumb = '') => {
                for (const node of nodes) {
                    if (node.type === 'folder') {
                        const path = breadcrumb ? `${breadcrumb} › ${node.name}` : node.name;
                        if (node.name.toLowerCase().includes(query.toLowerCase())) {
                            folderResults.push({
                                id: node.id,
                                name: node.name,
                                folder_name: breadcrumb || activeCollection?.name || 'Root',
                                resultType: 'folder'
                            });
                        }
                        if (node.children) searchFolders(node.children, path);
                    }
                }
            };
            searchFolders(tree);

            setSearchResults([...folderResults, ...fileResults]);
        } catch (err) {
            console.error('Search error:', err);
        }
    }, [activeCollection, tree]);

    const handleCreateCollection = async (e) => {
        e.preventDefault();
        if (!newColName.trim()) return;
        try {
            const data = await api.createCollection(newColName.trim(), newColDesc.trim());
            await loadCollections();
            switchCollection(data.collection);
            setShowNewCollection(false);
            setNewColName('');
            setNewColDesc('');
            addToast(`Created "${newColName.trim()}"`);
        } catch (err) {
            addToast(err.message || 'Failed to create collection');
        }
    };

    return (
        <>
            {/* Header */}
            <div className="sidebar-header">
                <div className="app-title">
                    <span className="app-logo">
                        <SutraBaseLogo />
                    </span>
                    <span className="app-name">SutraBase</span>
                </div>
                <button className="btn-icon" onClick={() => setSidebarOpen(false)} title="Hide sidebar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                </button>
            </div>

            {/* Search */}
            <div className="sidebar-search">
                <div className="search-wrapper">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="input"
                        placeholder="Search files & folders..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setShowSearch(true)}
                        onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                    />
                </div>
            </div>

            {/* New Collection button (for admins/users only) */}
            {canEdit && (
                <div className="sidebar-new-collection">
                    {!showNewCollection ? (
                        <button
                            className="btn-new-collection"
                            onClick={() => setShowNewCollection(true)}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            New Collection
                        </button>
                    ) : (
                        <form className="new-collection-form" onSubmit={handleCreateCollection}>
                            <input
                                className="input"
                                placeholder="Collection name"
                                value={newColName}
                                onChange={e => setNewColName(e.target.value)}
                                autoFocus
                                required
                                style={{ marginBottom: 6 }}
                            />
                            <input
                                className="input"
                                placeholder="Description (optional)"
                                value={newColDesc}
                                onChange={e => setNewColDesc(e.target.value)}
                                style={{ marginBottom: 8 }}
                            />
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                    onClick={() => { setShowNewCollection(false); setNewColName(''); setNewColDesc(''); }}
                                >Cancel</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                >Create</button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Search Results or File Tree */}
            {showSearch && searchQuery && (
                <div className="sidebar-tree">
                    {searchResults.length === 0 ? (
                        <div style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                            No results for "{searchQuery}"
                        </div>
                    ) : (
                        <div className="search-results">
                            {searchResults.map(item => (
                                <SearchResult key={`${item.resultType}-${item.id}`} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            )}
            {(!showSearch || !searchQuery) && <FileTree />}
        </>
    );
}

function SearchResult({ item }) {
    const { openFile } = useApp();
    const isFolder = item.resultType === 'folder';

    return (
        <div
            className="search-result-item"
            onClick={() => !isFolder && openFile(item.id, item.name)}
            style={isFolder ? { cursor: 'default' } : {}}
        >
            <div className="result-icon-name">
                <span className="result-icon">
                    {isFolder ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-color)" opacity="0.8"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    )}
                </span>
                <span className="result-name">{item.name}</span>
            </div>
            <span className="result-path">
                {isFolder
                    ? <><span className="result-type-badge">folder</span> in {item.folder_name}</>
                    : <>in <strong>{item.folder_name || 'Unknown'}</strong></>
                }
            </span>
        </div>
    );
}
