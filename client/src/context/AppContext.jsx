import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const { user, isAuthenticated } = useAuth();
    const [collections, setCollections] = useState([]);
    const [activeCollection, setActiveCollection] = useState(null);
    const [tree, setTree] = useState([]);
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [bookmarks, setBookmarks] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [editMode, setEditMode] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [autoSaveStatus, setAutoSaveStatus] = useState('');
    const [zoomLevel, setZoomLevel] = useState(100);
    const [liveEdit, setLiveEdit] = useState(false);
    const [readOnly, setReadOnly] = useState(false);
    const saveTimerRef = useRef({});

    const addToast = useCallback((message, duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const showAutoSaveStatus = useCallback((msg) => {
        setAutoSaveStatus(msg);
        setTimeout(() => setAutoSaveStatus(''), 2500);
    }, []);

    // Load collections
    const loadCollections = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await api.getCollections();
            setCollections(data.collections);
            if (!activeCollection && data.collections.length > 0) {
                setActiveCollection(data.collections[0]);
            }
        } catch (err) { console.error('Load collections:', err); }
    }, [isAuthenticated, activeCollection]);

    // Load tree for active collection
    const loadTree = useCallback(async () => {
        if (!activeCollection) return;
        try {
            const data = await api.getTree(activeCollection.id);
            setTree(data.tree);
        } catch (err) { console.error('Load tree:', err); }
    }, [activeCollection]);

    // Load bookmarks
    const loadBookmarks = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await api.getBookmarks();
            setBookmarks(data.bookmarks);
        } catch (err) { console.error('Load bookmarks:', err); }
    }, [isAuthenticated]);

    useEffect(() => { loadCollections(); }, [loadCollections]);
    useEffect(() => { loadTree(); }, [loadTree]);
    useEffect(() => { loadBookmarks(); }, [loadBookmarks]);

    // Tab management
    const openFile = useCallback(async (fileId, fileName) => {
        const existingTab = tabs.find(t => t.fileId === fileId);
        if (existingTab) {
            setActiveTabId(existingTab.id);
            return;
        }
        try {
            const data = await api.getFile(fileId);
            const f = data.file;
            const newTab = {
                id: `tab-${fileId}-${Date.now()}`,
                fileId: f.id,
                name: f.name,
                content: f.content,
                savedContent: f.content,
                modified: false,
                created_at: f.created_at,
                updated_at: f.updated_at,
                folder_name: f.folder_name || null,
                folder_id: f.folder_id
            };
            setTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
        } catch (err) {
            addToast('Failed to open file');
        }
    }, [tabs, addToast]);

    const closeTab = useCallback((tabId) => {
        setTabs(prev => {
            const idx = prev.findIndex(t => t.id === tabId);
            const newTabs = prev.filter(t => t.id !== tabId);
            if (activeTabId === tabId && newTabs.length > 0) {
                const newIdx = Math.min(idx, newTabs.length - 1);
                setActiveTabId(newTabs[newIdx].id);
            } else if (newTabs.length === 0) {
                setActiveTabId(null);
            }
            return newTabs;
        });
        if (saveTimerRef.current[tabId]) {
            clearTimeout(saveTimerRef.current[tabId]);
            delete saveTimerRef.current[tabId];
        }
    }, [activeTabId]);

    const updateTabContent = useCallback((tabId, content) => {
        setTabs(prev => prev.map(t =>
            t.id === tabId ? { ...t, content, modified: content !== t.savedContent } : t
        ));
        // Auto-save after 1 second of inactivity
        if (saveTimerRef.current[tabId]) clearTimeout(saveTimerRef.current[tabId]);
        saveTimerRef.current[tabId] = setTimeout(async () => {
            const tab = tabs.find(t => t.id === tabId) || {};
            try {
                showAutoSaveStatus('Saving...');
                await api.updateFile(tab.fileId, { content });
                setTabs(prev => prev.map(t =>
                    t.id === tabId ? { ...t, savedContent: content, modified: false } : t
                ));
                showAutoSaveStatus('Auto-saved');
            } catch (err) {
                console.error('Auto-save failed:', err);
                showAutoSaveStatus('Save failed');
            }
        }, 1000);
    }, [tabs, showAutoSaveStatus]);

    const saveActiveFile = useCallback(async () => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (!tab || !tab.modified) return;
        try {
            await api.updateFile(tab.fileId, { content: tab.content });
            setTabs(prev => prev.map(t =>
                t.id === activeTabId ? { ...t, savedContent: tab.content, modified: false } : t
            ));
            showAutoSaveStatus('Saved');
        } catch (err) {
            addToast('Failed to save file');
        }
    }, [tabs, activeTabId, addToast, showAutoSaveStatus]);

    const toggleBookmark = useCallback(async (fileId, folderId) => {
        try {
            await api.toggleBookmark(fileId || null, folderId || null);
            loadBookmarks();
        } catch (err) {
            addToast('Failed to toggle bookmark');
        }
    }, [loadBookmarks, addToast]);

    const switchCollection = useCallback(async (collection) => {
        for (const tab of tabs) {
            if (tab.modified) {
                try {
                    await api.updateFile(tab.fileId, { content: tab.content });
                } catch (err) {
                    console.error('Failed to save file before switching:', err);
                }
            }
        }
        setActiveCollection(collection);
        setTabs([]);
        setActiveTabId(null);
    }, [tabs]);

    const activeTab = tabs.find(t => t.id === activeTabId) || null;
    const canEdit = user && (user.role === 'admin' || user.role === 'user');

    return (
        <AppContext.Provider value={{
            collections, activeCollection, tree, tabs, activeTabId, activeTab, bookmarks,
            sidebarOpen, sidebarWidth, editMode, toasts, canEdit,
            autoSaveStatus, zoomLevel, liveEdit, readOnly,
            setSidebarOpen, setSidebarWidth, setEditMode, setActiveTabId,
            setZoomLevel, setLiveEdit, setReadOnly,
            loadCollections, loadTree, loadBookmarks,
            openFile, closeTab, updateTabContent, saveActiveFile,
            toggleBookmark, switchCollection, addToast, showAutoSaveStatus,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
