# Vibe Tasks — Build Plan

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Desktop Shell | Electron |
| Frontend | React 18 + Vite |
| Database | better-sqlite3 (sync, fast, Electron-friendly) |
| IPC | Electron ipcMain / ipcRenderer |
| Styling | Tailwind CSS |
| UI Kit | Syncfusion React Components (Community License) |
| Build | electron-forge or electron-builder |

## 2. Project Structure

```
vibe-tasks/
├── electron/
│   ├── main.ts                  # Electron main process
│   ├── preload.ts               # Context bridge
│   └── database/
│       ├── db.ts                # SQLite connection + init
│       ├── schema.sql           # CREATE TABLE statements
│       └── repositories/
│           ├── userRepo.ts
│           ├── projectRepo.ts
│           ├── statusRepo.ts
│           ├── priorityRepo.ts
│           └── taskRepo.ts
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Router + Layout wrapper
│   ├── index.css                # Tailwind imports
│   ├── components/
│   │   ├── Layout.tsx           # Sidebar + Topbar shell
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── PomodoroTimer.tsx    # Floating draggable timer
│   │   └── KanbanCard.tsx       # Draggable task card
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── TaskList.tsx         # With Quick Add bar
│   │   ├── KanbanBoard.tsx
│   │   └── Settings/
│   │       ├── Settings.tsx     # Tab container
│   │       ├── UsersTab.tsx
│   │       ├── ProjectsTab.tsx
│   │       ├── StatusTab.tsx
│   │       └── PriorityTab.tsx
│   ├── hooks/
│   │   └── useDB.ts             # IPC wrapper
│   └── types/
│       └── models.ts            # TypeScript interfaces
├── assets/
│   └── bell.mp3                 # Pomodoro notification sound
├── package.json
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── forge.config.js
```

## 3. Database Schema

```sql
CREATE TABLE users (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL
);

CREATE TABLE projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT DEFAULT ''
);

CREATE TABLE statuses (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE priorities (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  statusId    INTEGER NOT NULL REFERENCES statuses(id),
  priorityId  INTEGER NOT NULL REFERENCES priorities(id),
  projectId   INTEGER NOT NULL REFERENCES projects(id)
);
```

Default seeds: 4 statuses (To Do, In Progress, Review, Done), 4 priorities (Low, Medium, High, Critical).

## 4. Implementation Phases

### Phase 1 — Project Scaffold
- [x] Initialize npm project
- [x] Install Electron, React, Vite, Tailwind
- [x] Configure electron-vite or Vite with Electron plugin
- [x] Configure Tailwind CSS
- [x] Create main process (main.ts, preload.ts)
- [x] Verify dev loop works

### Phase 2 — Database Layer
- [ ] Create db.ts — SQLite connection via better-sqlite3
- [ ] Write schema and seed data
- [ ] Create all 5 repositories (CRUD)
- [ ] Wire IPC handlers in main.ts

### Phase 3 — Layout & Routing
- [ ] Create Layout.tsx (sidebar + topbar)
- [ ] Create Sidebar.tsx with navigation links
- [ ] Set up React Router (Dashboard, Tasks, Kanban, Settings)
- [ ] Style with Tailwind

### Phase 4 — Pages
- [ ] Dashboard — summary cards, recent tasks
- [ ] TaskList — table, filters, Quick Add bar
- [ ] KanbanBoard — 4 columns, drag between statuses
- [ ] Settings — tabbed CRUD for Users, Projects, Status, Priority

### Phase 5 — Pomodoro Timer
- [ ] Create floating frameless BrowserWindow
- [ ] Configurable focus / break intervals
- [ ] Start, pause, stop controls
- [ ] Play notification sound (bell.mp3)
- [ ] Show desktop notification via Electron Notification API
- [ ] Persist settings

### Phase 6 — Syncfusion Integration
- [ ] Register for Syncfusion Community License
- [ ] Integrate Syncfusion DataGrid, Charts, Kanban components
- [ ] Replace custom tables with Syncfusion equivalents

## 5. Models (TypeScript)

```ts
interface User     { id: number; name: string; email: string }
interface Project  { id: number; name: string; description: string }
interface Status   { id: number; name: string }
interface Priority { id: number; name: string }
interface Task     { id: number; name: string; description: string; statusId: number; priorityId: number; projectId: number }
```

## 6. IPC API (preload exposes)

```
db:users:list
db:users:create  |  db:users:update  |  db:users:delete
db:projects:list | db:projects:create | db:projects:update | db:projects:delete
db:statuses:list | db:statuses:create | db:statuses:update | db:statuses:delete
db:priorities:list | db:priorities:create | db:priorities:update | db:priorities:delete
db:tasks:list    | db:tasks:create    | db:tasks:update    | db:tasks:delete
```
