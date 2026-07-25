# Gantt Chart Implementation Plan

## Overview
Add a full-featured Gantt chart view to Vibe Tasks using `frappe-gantt`, including `startDate`/`durationDays` fields on tasks, dependency arrows, drag-to-resize/move, zoom levels, and a today marker. Bars are color-coded by priority.

---

## Phase 1: Data Model

### 1.1 Database Migration — `electron/database/db.ts`
Add two new columns using the existing `ALTER TABLE` + `PRAGMA table_info()` pattern:
- `startDate TEXT` (nullable, ISO date string)
- `durationDays INTEGER DEFAULT 1` (nullable, defaults to 1 day)

### 1.2 TypeScript Types — `src/types/models.ts`
Add to the `Task` interface:
```ts
startDate: string | null
durationDays: number | null
```

### 1.3 Task Repository — `electron/database/repositories/taskRepo.ts`
- `createTask()`: Add `startDate` and `durationDays` to INSERT statement
- `updateTask()`: Add conditional SET clauses for both fields

### 1.4 Task Edit Modal — `src/components/TaskEditModal.tsx`
- Add "Start Date" date picker field (alongside existing "Due Date")
- Add "Duration (days)" numeric input field
- Wire both fields to task update IPC call

---

## Phase 2: Install Dependency

```bash
npm install frappe-gantt
```

---

## Phase 3: Gantt Chart Page

### 3.1 New Page — `src/pages/GanttChart.tsx`
- Fetch all tasks via `window.electronAPI.getTasks()`
- Transform tasks into frappe-gantt format:
  - `start` = `task.startDate` (fallback: `task.dueDate` or `task.created_at`)
  - `end` = `task.dueDate` (fallback: `start + durationDays`)
  - `dependencies` = `task.predecessorIds` (JSON array)
  - `progress` = `task.completionPercent`
  - Color by priority using `priorityColor`
- View modes: Day, Week, Month, Quarter, Year
- Today marker (built-in to frappe-gantt)
- Click task bar → opens TaskEditModal
- Drag/resize task bar → persists new dates via IPC
- Filter by project and status (multi-select dropdowns)

### 3.2 Route — `src/App.tsx`
Add route: `/gantt` → `<GanttChart />`

### 3.3 Sidebar — `src/components/Layout.tsx`
Add nav item: `{ path: '/gantt', label: 'Gantt', icon: '📊' }` in the core group

---

## Files Modified

| File | Change |
|---|---|
| `gnatt.md` | This plan |
| `electron/database/db.ts` | Add `startDate` + `durationDays` migration |
| `src/types/models.ts` | Add 2 fields to `Task` interface |
| `electron/database/repositories/taskRepo.ts` | Add fields to createTask/updateTask |
| `src/components/TaskEditModal.tsx` | Add Start Date + Duration form fields |
| `src/pages/GanttChart.tsx` | **New** — Gantt chart page |
| `src/App.tsx` | Add `/gantt` route |
| `src/components/Layout.tsx` | Add Gantt sidebar entry |
| `package.json` | New dependency: `frappe-gantt` |

---

## Decisions
- **Color coding**: By priority (uses existing `priorityColor`)
- **Library**: `frappe-gantt` (lightweight, supports drag/drop, dependencies, zoom)
- **Data model**: New `startDate` + `durationDays` fields (nullable, backward-compatible)
