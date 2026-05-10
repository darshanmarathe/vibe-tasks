# <img src="assets/icon.svg" width="28" height="28" align="center"> Vibe Tasks

> A desktop task management application built with Electron, React, TypeScript, and SQLite.

Vibe Tasks helps you organize your work with a clean, intuitive interface featuring task lists, Kanban boards, dashboards with charts, and a Pomodoro timer — all running locally on your desktop.

## Features

- **Dashboard** — Summary cards, charts (bar + donut), and a calendar view showing task due dates
- **Task List** — Filterable table with Quick Add bar and inline editing modal
- **Kanban Board** — Drag-and-drop columns that dynamically reflect your custom statuses
- **Settings** — CRUD management for Users, Projects, Statuses, and Priorities
- **Pomodoro Timer** — Floating, draggable timer with configurable intervals, sound, and desktop notifications
- **Dark/Light Mode** — Theme toggle with persisted preference
- **Natural Language Dates** — Type `tomorrow`, `next week`, `in 3 days` in Quick Add to auto-set due dates
- **Customizable Database Location** — Choose where your SQLite database lives

## Screenshots

| Dashboard | Task List |
|---|---|
| ![Dashboard](screenshots/screenshot1.png) | ![Task List](screenshots/screenshot2.png) |

| Kanban Board | Settings |
|---|---|
| ![Kanban Board](screenshots/screenshot3.png) | ![Settings](screenshots/screenshot4.png) |

| Pomodoro Timer | Calendar & Task Detail |
|---|---|
| ![Pomodoro Timer](screenshots/screenshot5.png) | ![Calendar Detail](screenshots/screenshot6.png) |

| Dark Mode |
|---|
| ![Dark Mode](screenshots/screenshot7_Dark.png) |

## Tech Stack

| Layer | Tech |
|---|---|
| Desktop Shell | [Electron](https://www.electronjs.org/) |
| Frontend | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Bundler | [Vite 8](https://vitejs.dev/) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com/) |
| Database | [SQLite](https://sql.js.org/) (via sql.js) |
| Routing | [React Router 7](https://reactrouter.com/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18

### Install

```bash
npm install
```

### Run (development)

```bash
npm run dev
```

### Build

```bash
# Current platform
npm run build

# Platform-specific
npm run build:win
npm run build:win-portable
npm run build:mac
npm run build:linux

# All platforms
npm run build:all
```

## Project Structure

```
vibe-tasks/
├── electron/            # Electron main process
│   ├── main.ts          # Main process entry
│   ├── preload.ts       # Context bridge (IPC)
│   ├── preload.cjs      # Preload (CommonJS)
│   ├── pomodoro.html    # Pomodoro timer window
│   ├── pomodoroPreload.ts
│   └── database/        # SQLite + repositories
├── src/                 # React frontend
│   ├── App.tsx          # Router + layout
│   ├── main.tsx         # React entry
│   ├── components/      # Shared components
│   ├── pages/           # Page views
│   │   ├── Dashboard.tsx
│   │   ├── TaskList.tsx
│   │   ├── KanbanBoard.tsx
│   │   └── Settings/
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Utilities
│   └── contexts/        # React contexts (theme, etc.)
├── assets/              # Icons, sounds
├── screenshots/         # Screenshots for README
├── scripts/             # Build scripts
└── dist-electron/       # Built electron output
```

## Models

| Model | Fields |
|---|---|
| **User** | `id`, `name`, `email` |
| **Project** | `id`, `name`, `description` |
| **Task** | `id`, `name`, `description`, `statusId`, `priorityId`, `projectId`, `dueDate` |
| **Status** | `id`, `name`, `ord` |
| **Priority** | `id`, `name` |

## License

[MIT](LICENSE)

---

Built by [Darshan Marathe](https://github.com/anomalyco).
