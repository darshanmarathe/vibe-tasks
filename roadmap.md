# Vibe Tasks — Product Roadmap

> Personal productivity features planned for future releases.

---

## Release 1.4.0 — Mind Map & Visual Thinking

- **Mind Map** — Interactive node-based canvas for brainstorming
  - Create, drag, connect nodes with labels and colors
  - Export as PNG/SVG
  - Save mind maps as SQLite data (nodes, edges, positions)
  - Collapse/expand subtrees
- **Quick Capture** — Global hotkey (e.g. Ctrl+Shift+V) to pop a quick-note window
  - Captures into Inbox with timestamp
  - Auto-links to active task if one is selected

## Release 1.5.0 — Goals & OKRs

- **Goals (Objectives)** — High-level outcome with a deadline
  - Each goal contains multiple Key Results (measurable, 0–100%)
  - Key Results link to projects, tasks, or habits
- **Progress Dashboard** — View goal completion at a glance
  - Radar/spider chart for balanced progress

## Release 1.6.0 — Journal & Daily Log

- **Daily Journal** — One page per day with:
  - Mood rating (emoji picker)
  - What went well / what to improve
  - Quick notes section
  - Auto-populated: tasks completed, pomodoro count
- **On This Day** — Shows past journal entries from same date

## Release 1.7.0 — Calendar Sync & Recurring Tasks

- **Recurring Tasks** — Daily, weekly, monthly, custom interval
  - Auto-create next instance on completion
  - Skip weekends option
- **Calendar Integration** — Read-only or two-way sync
  - iCal/Outlook via ICS file import
  - Local calendar view with external events overlay
  - Drag external events into tasks

## Release 1.8.0 — Data Portability & Collaboration

- **Full Backup & Restore** — One-click export of entire DB
  - Auto-backup on configurable schedule
  - Restore from backup file
- **Export Formats** — Markdown, CSV, JSON, PDF (via print)
- **File Attachments** — Drag-and-drop files into tasks and notes
  - Stored in local media folder
  - Image preview inline in notes/editor
- **Share Tasks** — Share as a snapshot HTML file or text snippet

## Release 1.9.0 — Spaced Repetition (Flashcards)

- **Flashcards** — Create cards from notes or manually
  - Queue-based review (like Anki)
  - Supports text and code snippets
  - Daily review target with streak

## Release 1.10.0 — Advanced Analytics

- **Productivity Score** — Weighted metric based on:
  - Tasks completed vs overdue
  - Pomodoro focus time
  - Habit consistency
  - Journal frequency
- **Charts & Trends** — Line charts for:
  - Tasks completed per day/week/month
  - Pomodoro hours over time
  - Habit completion rate
  - Mood trends from journal

---

## Technical Debt & Infrastructure

| Item | Priority | Notes |
|---|---|---|
| Switch from sql.js to better-sqlite3 | Medium | Async-free, better performance, native module |
| Add database migrations system | High | Versioned SQL migrations with rollback |
| Move to Vite 9 when stable | Low | Already on Vite 8, minor migration |
| Add unit tests for repositories | High | Vitest + SQLite in-memory |
| Add end-to-end tests | Medium | Playwright for Electron |
| Type-safe IPC (electron-trpc or similar) | Medium | Full type safety across preload bridge |
| CI/CD pipeline with GitHub Actions | Low | Auto-build on tag push |

---

## Completed Features

| Release | Features |
|---|---|
| 1.0.0 | Task CRUD, Kanban, Dashboard, Settings (Users/Projects/Statuses/Priority) |
| 1.1.0 | Dark/Light mode, date detection, charts, calendar view, task edit modal |
| 1.1.2 | Tree grid, Markdown notes, task dependencies |
| 1.1.3 | Kanban card detail modal |
| 1.2.0 | Inbox edit, line chart, OS theme detection, archive, pomodoro improvements |
| 1.2.1 | Pie chart, Quick Add on dashboard, assigned to, completion %, email integration |
| 1.3.0 | Notes system (TipTap WYSIWYG), Kanban add task, archive confirm, search, build fixes |
| 1.5.0 | Habit Tracker (CRUD, streaks, heatmap, reminders), Weekly Review |
| 1.6.0 | Time Tracking (start/stop timer, per-task time, reports), Focus Mode overlay |

---

*Last updated: June 2026*
