# Sutra Knowledge Base — Project Context

## Overview
A lightweight, self-hosted Markdown knowledge base (Obsidian-like). React + Vite frontend, Node.js/Express backend, SQLite database.

## Architecture

```
SutraKnowledgeBase/
├── client/                    # Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.jsx         # CodeMirror 6 editor (forwardRef, scroll sync, auto-pairs)
│   │   │   ├── EditorPane.jsx     # Split view / Live Edit / Read Only, toolbar, zoom, focus mode
│   │   │   ├── Preview.jsx        # Renders markdown to HTML via markdown.js
│   │   │   ├── Sidebar.jsx        # App logo, search, accepts collectionControls + onUploadClick props
│   │   │   ├── FileTree.jsx       # Recursive folder/file tree with context menus, upload button
│   │   │   ├── Layout.jsx         # Top-level layout: SidebarWrapper (collection mgmt, upload handler)
│   │   │   ├── BottomBar.jsx      # Word/char count only
│   │   │   ├── TabBar.jsx         # Open file tabs
│   │   │   └── SettingsModal.jsx  # Theme, accent color, font size, admin-only Users tab, Save & Close
│   │   ├── context/
│   │   │   ├── AppContext.jsx     # Global state: collections, tabs, tree, bookmarks, auto-save
│   │   │   ├── AuthContext.jsx    # JWT auth state
│   │   │   └── ThemeContext.jsx   # Theme switching (7 themes)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── utils/
│   │   │   └── markdown.js        # markdown-it config, highlight.js, smart link handling, task lists
│   │   ├── api/
│   │   │   └── client.js          # API client (fetch wrapper)
│   │   └── index.css              # ~2080 lines, full design system with 7 theme variants
│   └── vite.config.js             # Proxy /api → localhost:3001
├── server/
│   ├── index.js                   # Express server, serves static + API
│   ├── db.js                      # SQLite schema & setup
│   ├── routes/                    # API routes (auth, collections, files, folders, bookmarks, search, upload)
│   └── middleware/                # JWT auth middleware
├── docker-compose.yml
├── Dockerfile                     # Uses node:20-slim (NOT alpine) for better-sqlite3 compatibility
├── .env                           # JWT_SECRET, PORT=3001, DB_PATH, UPLOAD_DIR
└── README.md
```

## Key Design Decisions
- **Editor:** CodeMirror 6 with `forwardRef` exposing `scrollToPercent()` for scroll sync
- **Scroll sync:** Percentage-based bidirectional sync between editor and preview
- **Zoom:** CSS `zoom` property on `.editor-pane` container (not fontSize)
- **Live Edit:** Block-level WYSIWYG — fenced code blocks and tables grouped as single editable blocks, regular lines editable individually
- **Auto-pairs:** Single `makeAutoPairKeymap()` for brackets/quotes
- **Fenced code blocks:** Light themes use light backgrounds, dark themes use dark. Compact padding (8px 16px).
- **Link handling:** External → `target=_blank`, anchors → scroll, internal → `data-internal-link`
- **Search:** Server returns `{ files: [] }`, client reads `data.files`. Exact filename match (case-insensitive) first, then partial.
- **Collections:** Collection controls rendered between file action buttons and file tree in sidebar
- **Settings:** 780px wide, auto-height (no scroll), Users tab admin-only, Save & Close button
- **Upload:** Files upload to the active tab's folder (falls back to first folder if no file open)
- **File metadata:** GET /api/files/:id joins folders table to include `folder_name`, `created_at`, `updated_at`
- **Docker:** Uses `node:20-slim` (glibc/Debian) — NOT Alpine (musl) — for native module compatibility
- **CSS:** Vanilla CSS, 7+ themes via `[data-theme]` attribute, CSS custom properties throughout

## Sidebar Order
Logo → Search → File/Folder/Upload buttons → New Collection → Collection dropdown → File tree → (bottom) Settings + Logout

## Toolbar Order (top of editor)
Save → (spacer) → Unsaved indicator → Zoom Out/Level/In/Fit → separator → Live Edit → Read Only → Focus Mode

## Running in Development
```bash
# Terminal 1 — backend (port 3001)
cd server && npm run dev

# Terminal 2 — frontend with hot reload (port 5173, proxies API to 3001)
cd client && npm run dev

# Open http://localhost:5173
# Login: admin@admin.com / admin123
```

## Known Issues / Future Work
- Chunk size warning on build (highlight.js is large — could use dynamic imports)
- Internal file links (`data-internal-link`) need click handler in Preview.jsx to open files in-app
- Scroll sync is percentage-based (not section/heading-aware like Obsidian)
- No markdown heading IDs generated yet for anchor link scrolling (`#section`)

## Recent Changes (March 2026 — Round 2)
1. Docker fix: Alpine → node:20-slim for better-sqlite3 compatibility
2. File upload (.md/.txt) via sidebar upload button
3. Scroll sync (percentage-based, bidirectional)
4. Zoom fix: CSS zoom property instead of fontSize
5. "View Only" → "Read Only" with icon-label gap
6. Live Edit mode (block-level WYSIWYG editing)
7. Search: exact filename match, no content search
8. Removed redundant edit/view toggle button
9. Sidebar reorder: collection controls between actions and file tree
10. Settings modal: wider, admin-only Users tab, Save & Close button

## Recent Changes (March 2026 — Round 3)
1. Upload targets active file's folder (not first folder)
2. Note Info sidebar shows Created and Modified dates from database
3. Live Edit: fenced code blocks and tables grouped as single editable blocks (not line-by-line)
4. Search fixed: client was reading `data.results` but server returns `data.files`
5. Settings modal auto-sizes without internal scrolling (780px wide, auto height)
6. Fenced code block padding reduced from 16px to 8px 16px for compact look
7. GET /api/files/:id now joins folders table to return `folder_name`
8. `openFile` stores full metadata (`created_at`, `updated_at`, `folder_name`, `folder_id`) in tab
9. Collection hover text swaps to "Switch collection", removed down arrow
10. Toggle buttons (Live Edit, Read Only) show active/lit state and toggled labels
11. Production build crash fixed (temporal dead zone: `exportAs` declared after `handleMenuAction`)

## Recent Changes (March 2026 — Round 4)
1. Bookmark stars removed from folders (files only)
2. Upload redesigned: UploadModal with drag-drop zone, folder selector dropdown, "Complete Upload" button
3. Expand/Collapse All now includes Bookmarks section
4. Deleting a file closes its open tab and removes content
5. Collection rename added to Switch Collection modal (inline edit)
6. Download All Data requires user-supplied encryption key (POST, extensionless encrypted file)
7. Restore from File: upload encrypted backup + key to restore data
8. TOC filters "Table of Contents" heading; right sidebar (NoteInfoSidebar) resizable via drag handle
9. Empty state page when no collections exist
10. Auto Save toggle in three-dots menu (on/off, manual save when off)
11. Collection button always shows "Switch collection" text
12. Bottom bar shows current collection name centered, uppercase, bold
13. Restore from backup available to all users (admin + user), not admin-only
14. Timezone dropdown in Settings > General (stored in localStorage)
15. Session timeout: JWT changed from 7d to 30m, client checks expiry every 60s and auto-logs out
