# Sutra Knowledge Base

A lightweight, self-hosted Markdown knowledge base with a modern UI. Built for teams and individuals who want an Obsidian-like experience that runs anywhere — on your own server, in Docker, or locally.

## Features

- **Markdown Editor** — Split-view editor with live preview and syntax highlighting
- **Collections** — Organize your knowledge into separate collections
- **File & Folder Management** — Create, rename, delete, and search files and folders
- **Code Blocks** — Syntax highlighting for 190+ languages with one-click copy
- **Multiple Themes** — Dark, Light, GitHub, Nord, Solarized, High Contrast
- **Focus Mode** — Distraction-free fullscreen writing
- **View Only Mode** — Hide the editor for a clean reading experience
- **Zoom Controls** — Zoom in/out and fit-to-window for comfortable reading
- **Scroll Sync** — Editor and preview scroll in sync
- **Auto-Save** — Changes are saved automatically after 1 second of inactivity
- **Image Paste** — Paste images directly into the editor
- **Task Lists** — Interactive checkbox support in markdown
- **Bookmarks** — Bookmark files and folders for quick access
- **RBAC** — Role-based access control (admin, user, viewer)
- **Self-Hosted** — Your data stays on your server

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (for running without Docker)
- [Docker](https://www.docker.com/) and Docker Compose (for running with Docker)

---

### Running with Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/SutraKnowledgeBase.git
   cd SutraKnowledgeBase
   ```

2. **Configure environment** (optional)

   Edit `docker-compose.yml` to change the admin credentials and JWT secret:

   ```yaml
   environment:
     - JWT_SECRET=your-strong-secret-here
     - ADMIN_EMAIL=admin@example.com
     - ADMIN_PASSWORD=your-secure-password
   ```

3. **Start the application**

   ```bash
   docker compose up -d
   ```

4. **Access the app**

   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Stop the application**

   ```bash
   docker compose down
   ```

> **Data Persistence:** The `data/` and `uploads/` directories are mounted as Docker volumes, so your files and database persist across container restarts.

---

### Running without Docker

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/SutraKnowledgeBase.git
   cd SutraKnowledgeBase
   ```

2. **Install server dependencies**

   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Install client dependencies and build**

   ```bash
   cd client
   npm install
   npm run build
   cd ..
   ```

4. **Copy the client build to the server**

   ```bash
   cp -r client/dist/* server/public/
   ```

5. **Configure environment**

   Create a `.env` file in the project root (or edit the existing one):

   ```env
   JWT_SECRET=your-strong-secret-here
   PORT=3001
   DB_PATH=./data/md_viewer.db
   UPLOAD_DIR=./uploads/images
   ADMIN_EMAIL=admin@admin.com
   ADMIN_PASSWORD=admin123
   ```

6. **Start the server**

   ```bash
   cd server
   node index.js
   ```

7. **Access the app**

   Open [http://localhost:3001](http://localhost:3001) in your browser.

---

### Development Mode

For active development with hot-reloading:

1. **Start the server** (from the project root):

   ```bash
   cd server
   npm install
   node index.js
   ```

2. **Start the client dev server** (in a separate terminal):

   ```bash
   cd client
   npm install
   npm run dev
   ```

3. The client dev server will run on [http://localhost:5173](http://localhost:5173) with hot module replacement. API requests are proxied to the server on port 3001.

---

## Tech Stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| Frontend | React, Vite, CodeMirror 6      |
| Styling  | Vanilla CSS (custom design system) |
| Backend  | Node.js, Express               |
| Database | SQLite (via better-sqlite3)     |
| Auth     | JWT (JSON Web Tokens)          |
| Markdown | markdown-it, highlight.js      |

## License

MIT
