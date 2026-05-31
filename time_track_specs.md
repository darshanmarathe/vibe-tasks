# Time Tracking & Focus Mode — Specifications & Roadmap

> **Status:** Planning phase (Release 1.6.0)
> **See:** `roadmap.md` for overall product roadmap

---

## Overview

Two tightly coupled features:

1. **Manual Time Tracking** — Start/stop a timer per task, log duration, show reports
  1. Show Projects Dropdown 
  2. Based on selected Project show list of tasks
2. **Focus Mode** — Distraction-free overlay that keeps you on-task, integrates with both time tracking and the existing Pomodoro timer

---

## Database Schema

```sql
CREATE TABLE time_entries (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id           INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  start_time        TEXT NOT NULL,              -- ISO 8601
  end_time          TEXT,                       -- null = still running
  duration_seconds  INTEGER,                    -- null = still running
  note              TEXT DEFAULT '',
  created_at        TEXT NOT NULL
);

-- For daily/weekly rollups, we can query on the fly. No extra table needed.
```

### Indexes

```sql
CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_start ON time_entries(start_time);
```

---

## Implementation Plan

### Phase 1 — Time Entry CRUD

| Step | Files | What |
|---|---|---|
| 1.1 | `electron/database/repositories/timeRepo.ts` | `startTimer(taskId, note?)`, `stopTimer(entryId)`, `getRunningTimer()`, `getTaskTime(taskId, range?)`, `getDailyReport(date)`, `getWeeklyReport(startDate)`, `getAllTimeEntries(taskId)`, `deleteEntry(id)`, `updateEntry(id, data)` |
| 1.2 | `electron/database/db.ts` | Add `runTimeMigrations()` — create `time_entries` table + indexes |
| 1.3 | `electron/main.ts` | Add IPC handlers: `time:start`, `time:stop`, `time:running`, `time:taskTime`, `time:dailyReport`, `time:weeklyReport`, `time:entries`, `time:delete`, `time:update` |
| 1.4 | `electron/preload.ts` + `electron/preload.cjs` | Expose above IPC channels |
| 1.5 | `src/types/models.ts` | Add `TimeEntry` interface + `ElectronAPI` methods |
| 1.6 | `src/pages/TimeReports.tsx` | Page showing daily/weekly time reports with a table of entries, total per task, total per day |

### Phase 2 — Inline Timer on Tasks

| Step | Files | What |
|---|---|---|
| 2.1 | `src/pages/TaskList.tsx` | Add a timer button per task row (▶/⏹). Clicking ▶ starts a timer for that task, clicking ⏹ stops it. When a timer is running, show a live MM:SS counter on the task row and in the bottom bar. |
| 2.2 | `src/components/TimerBadge.tsx` | Reusable live timer component. Shows elapsed time, updates every second. Can be embedded in task rows and the global bottom bar. |
| 2.3 | `src/components/Layout.tsx` | Add a global timer bar at the bottom (collapsible). Shows currently running task name + elapsed time + stop button. Persistent across pages. |
| 2.4 | `src/contexts/TimerContext.tsx` | Global React context that holds the current timer state (running task id, start time, elapsed). Provides `startTimer(taskId)`, `stopTimer()`, `elapsed` (live-updating). All pages subscribe to this. |

### Phase 3 — Focus Mode Overlay

| Step | Files | What |
|---|---|---|
| 3.1 | `electron/focus.html` | Separate overlay window (similar to pomodoro.html). Shows: task name, elapsed time (large), pause/stop buttons, progress bar toward a configurable daily goal. Always-on-top, click-through background. |
| 3.2 | `electron/focusPreload.ts` + `.cjs` | Minimal preload: `getTheme`, `onThemeChanged`, `close`, `minimize`, `stopTimer`, `pauseTimer` |
| 3.3 | `electron/main.ts` | Add `createFocusWindow()` (like `createPomodoroWindow()`). Handle `focus:toggle`, `focus:updateTask` IPC to change what task is shown. |
| 3.4 | `src/components/Layout.tsx` | Add Focus Mode button next to Pomodoro button in sidebar footer. Clicking opens the focus overlay. |
| 3.5 | Integration | When focus mode opens, grab the currently running timer task (or prompt to pick one). Show it in the overlay. If no task is selected, prompt to select a task from a quick-pick list. |

### Phase 4 — Pomodoro Integration

| Step | Files | What |
|---|---|---|
| 4.1 | `electron/pomodoro.html` | After each focus session completes, auto-stop the running time tracker and log the duration to `time_entries`. Show focus mode stats (total focus time today) in the pomodoro overlay. |
| 4.2 | `electron/main.ts` | Wire pomodoro session completion to `time:stop` + `time:pomodoroLog` to auto-track pomodoro focus periods as time entries linked to the active task. |

### Phase 5 — Dashboard Integration

| Step | Files | What |
|---|---|---|
| 5.1 | `src/pages/Dashboard.tsx` | Add "Today's Focus Time" card showing total tracked + pomodoro time today. Add a small bar showing time per task today. |
| 5.2 | `src/pages/TimeReports.tsx` | Full reports page with: daily view (entries grouped by task), weekly view (bars per day), date range picker, export to CSV. |

---

## UI Mockups

### Timer button on task row
```
┌──────────────────────────────────────────────────────────────┐
│ 📋 Review PR #42        Due Today     🔥 1h 23m    [▶] [✏️] │
└──────────────────────────────────────────────────────────────┘
```

### Global timer bar at bottom
```
┌──────────────────────────────────────────────────────────────┐
│ ▶ Running: Review PR #42  ·  1h 23m 45s          [⏹] [⏸] │
└──────────────────────────────────────────────────────────────┘
```

### Focus Mode overlay (separate window, always-on-top)
```
┌──────────────────┐
│ ✕   —           │
│                  │
│   🎯            │
│                  │
│  Review PR #42  │
│                  │
│  01:23:45       │
│                  │
│ ████████░░ 72%  │
│  of 2h goal     │
│                  │
│  [⏸]  [⏹]      │
└──────────────────┘
```

---

## Future Ideas

| Feature | Description |
|---|---|
| **Manual time entry** | Add a past time entry manually (forgot to start the timer) |
| **Auto-suggest task** | When opening focus mode, suggest the task that was most recently worked on or is due soon |
| **Daily goal alerts** | Notification when you hit your daily focus time goal |
| **Week comparison** | Chart showing focus hours per day compared to previous week |
| **Calendar integration** | Show time entries on the calendar view alongside tasks |
| **Billable toggle** | Mark entries as billable with hourly rate, show invoice-ready report |
| **Idle detection** | Pause the timer if the system goes idle / lockscreen |
| **Pomodoro + focus merge** | Show pomodoro countdown inside the focus overlay; start a pomodoro session when focus mode opens |

---

## Existing Patterns to Follow

- **Overlay window:** See `electron/pomodoro.html` + `electron/pomodoroPreload.ts` — the Focus Mode overlay follows the exact same pattern (BrowserWindow, contextBridge, preload)
- **DB repo pattern:** See `habitRepo.ts` — CRUD with `getDatabase().exec/run/getSingle/save`
- **IPC pattern:** See `electron/main.ts` — `ipcMain.handle('channel', handler)` + `preload.ts` bridge
- **UI pattern:** See `TaskList.tsx` — data loading with `useCallback`/`useEffect`, inline actions, modal for edits
- **React context:** See `ThemeContext.tsx` — create `TimerContext.tsx` with `useContext` for global timer state
