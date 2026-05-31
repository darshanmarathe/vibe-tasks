# Time Tracking & Focus Mode — Implementation Plan

> **Target Release:** 1.6.0
> **Spec source:** `time_track_specs.md`
> **Roadmap entry:** Manual Time Tracking + Focus Mode

---

## Overview

Five phases, each independently shippable. Phases 1–2 are the core (data + UI timer). Phases 3–5 layer on top. Each step lists the exact file, what changes, and any gotchas to watch for.

---

## Phase 1 — Database & Backend CRUD

### Step 1.1 — `electron/database/repositories/timeRepo.ts` (new file)

Follow the exact pattern from `habitRepo.ts`: import `getDatabase`, use `db.exec / db.getSingle / db.run / db.save`.

Functions to implement:

| Function | Signature | Notes |
|---|---|---|
| `startTimer` | `(taskId: number, note?: string) => TimeEntry` | Insert row with `start_time = now`, `end_time = null`. Before inserting, call `stopRunningTimer()` to enforce one active timer at a time. |
| `stopTimer` | `(entryId: number) => TimeEntry` | Set `end_time = now`, compute `duration_seconds = end - start`. |
| `stopRunningTimer` | `() => TimeEntry \| null` | Finds any entry where `end_time IS NULL`, stops it. Used internally and exposed for "stop whatever is running". |
| `getRunningTimer` | `() => TimeEntry \| null` | `SELECT * FROM time_entries WHERE end_time IS NULL LIMIT 1` — join tasks table to get task name. |
| `getTaskTime` | `(taskId: number, range?: {start: string, end: string}) => number` | Returns total `duration_seconds` for a task, optionally filtered by date range. |
| `getDailyReport` | `(date: string) => DailyReport[]` | Group entries by task for a given ISO date. Returns `[{ taskId, taskName, totalSeconds, entries[] }]`. |
| `getWeeklyReport` | `(startDate: string) => WeeklyReport[]` | 7-day window from `startDate`. Returns `[{ date, totalSeconds, byTask[] }]`. |
| `getAllTimeEntries` | `(taskId: number) => TimeEntry[]` | All entries for a task, newest first. |
| `deleteEntry` | `(id: number) => void` | Hard delete. |
| `updateEntry` | `(id: number, data: Partial<TimeEntry>) => TimeEntry` | Allow editing `note`, `start_time`, `end_time`, recomputes `duration_seconds`. |

### Step 1.2 — `electron/database/db.ts`

Add `runTimeMigrations()` at the end of the `runHabitMigrations()` call chain (same pattern as `runMindMapMigrations` → `runHabitMigrations`).

```ts
function runTimeMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id          INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time       TEXT NOT NULL,
      end_time         TEXT,
      duration_seconds INTEGER,
      note             TEXT DEFAULT '',
      created_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_time_entries_task  ON time_entries(task_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start_time);
  `)
}
```

Call it at the bottom of `runHabitMigrations()` (or chain it from `runNoteMigrations` like the others).

> **Gotcha:** `db.exec` with `CREATE INDEX IF NOT EXISTS` is safe to run on every startup — no guard needed.

### Step 1.3 — `electron/main.ts`

Add import at top:
```ts
import * as timeRepo from './database/repositories/timeRepo'
```

Add IPC handlers inside `registerIpcHandlers()`, following the habits block pattern:

```ts
// Time Tracking
ipcMain.handle('time:start',       (_e, taskId, note)   => timeRepo.startTimer(taskId, note))
ipcMain.handle('time:stop',        (_e, entryId)        => timeRepo.stopTimer(entryId))
ipcMain.handle('time:stopRunning', ()                   => timeRepo.stopRunningTimer())
ipcMain.handle('time:running',     ()                   => timeRepo.getRunningTimer())
ipcMain.handle('time:taskTime',    (_e, taskId, range)  => timeRepo.getTaskTime(taskId, range))
ipcMain.handle('time:dailyReport', (_e, date)           => timeRepo.getDailyReport(date))
ipcMain.handle('time:weeklyReport',(_e, startDate)      => timeRepo.getWeeklyReport(startDate))
ipcMain.handle('time:entries',     (_e, taskId)         => timeRepo.getAllTimeEntries(taskId))
ipcMain.handle('time:delete',      (_e, id)             => timeRepo.deleteEntry(id))
ipcMain.handle('time:update',      (_e, id, data)       => timeRepo.updateEntry(id, data))
```

Also add `createFocusWindow()` here in Phase 3 (see below).

### Step 1.4 — `electron/preload.ts` + `electron/preload.cjs`

Add to the `contextBridge.exposeInMainWorld('electronAPI', { ... })` object:

```ts
// Time Tracking
startTimer:        (taskId: number, note?: string)                    => ipcRenderer.invoke('time:start', taskId, note),
stopTimer:         (entryId: number)                                  => ipcRenderer.invoke('time:stop', entryId),
stopRunningTimer:  ()                                                 => ipcRenderer.invoke('time:stopRunning'),
getRunningTimer:   ()                                                 => ipcRenderer.invoke('time:running'),
getTaskTime:       (taskId: number, range?: TimeRange)                => ipcRenderer.invoke('time:taskTime', taskId, range),
getDailyReport:    (date: string)                                     => ipcRenderer.invoke('time:dailyReport', date),
getWeeklyReport:   (startDate: string)                                => ipcRenderer.invoke('time:weeklyReport', startDate),
getTimeEntries:    (taskId: number)                                   => ipcRenderer.invoke('time:entries', taskId),
deleteTimeEntry:   (id: number)                                       => ipcRenderer.invoke('time:delete', id),
updateTimeEntry:   (id: number, data: Partial<TimeEntry>)             => ipcRenderer.invoke('time:update', id, data),

// Focus Mode
toggleFocus:       ()                                                 => ipcRenderer.invoke('focus:toggle'),
```

> **Gotcha:** `preload.cjs` is the compiled output — it must be kept in sync with `preload.ts` manually (or via the build step). Check `scripts/build.mjs` to confirm whether `.cjs` is auto-generated or hand-maintained.

### Step 1.5 — `src/types/models.ts`

Add new interfaces and extend `ElectronAPI`:

```ts
export interface TimeEntry {
  id: number
  task_id: number
  task_name?: string        // joined from tasks table
  start_time: string        // ISO 8601
  end_time: string | null
  duration_seconds: number | null
  note: string
  created_at: string
}

export interface TimeRange {
  start: string
  end: string
}

export interface DailyReportEntry {
  taskId: number
  taskName: string
  totalSeconds: number
  entries: TimeEntry[]
}

export interface WeeklyReportDay {
  date: string
  totalSeconds: number
  byTask: { taskId: number; taskName: string; totalSeconds: number }[]
}
```

Add to `ElectronAPI`:
```ts
// Time Tracking
startTimer:       (taskId: number, note?: string)                  => Promise<TimeEntry>
stopTimer:        (entryId: number)                                => Promise<TimeEntry>
stopRunningTimer: ()                                               => Promise<TimeEntry | null>
getRunningTimer:  ()                                               => Promise<TimeEntry | null>
getTaskTime:      (taskId: number, range?: TimeRange)              => Promise<number>
getDailyReport:   (date: string)                                   => Promise<DailyReportEntry[]>
getWeeklyReport:  (startDate: string)                              => Promise<WeeklyReportDay[]>
getTimeEntries:   (taskId: number)                                 => Promise<TimeEntry[]>
deleteTimeEntry:  (id: number)                                     => Promise<void>
updateTimeEntry:  (id: number, data: Partial<TimeEntry>)           => Promise<TimeEntry>

// Focus Mode
toggleFocus:      ()                                               => Promise<void>
```

---

## Phase 2 — Inline Timer on Tasks + Global Timer Bar

### Step 2.4 — `src/contexts/TimerContext.tsx` (new file, do this first)

Model after `ThemeContext.tsx`. Provides global timer state to all pages.

```ts
interface TimerContextType {
  runningEntry: TimeEntry | null      // null = no timer active
  elapsed: number                     // seconds since start_time, live-updating
  startTimer: (taskId: number, taskName: string) => Promise<void>
  stopTimer: () => Promise<void>
}
```

Implementation notes:
- On mount, call `window.electronAPI.getRunningTimer()` to rehydrate state (app restart recovery).
- Use `setInterval(1000)` to increment `elapsed` when `runningEntry` is not null.
- `startTimer` calls `window.electronAPI.startTimer(taskId)`, then sets `runningEntry` from the response.
- `stopTimer` calls `window.electronAPI.stopRunningTimer()`, then clears state.
- Wrap `App.tsx` with `<TimerProvider>` (same pattern as `<ThemeProvider>`).

### Step 2.2 — `src/components/TimerBadge.tsx` (new file)

Reusable component. Props: `elapsed: number` (seconds). Renders `HH:MM:SS` or `MM:SS` depending on magnitude. Updates are driven by the parent — this component is purely presentational.

```tsx
// Example output: "1:23:45" or "23:45"
function formatElapsed(seconds: number): string { ... }
export function TimerBadge({ elapsed }: { elapsed: number }) { ... }
```

### Step 2.1 — `src/pages/TaskList.tsx`

- Import `useTimer` from `TimerContext`.
- On each task row, add a timer button:
  - If `runningEntry?.task_id === task.id` → show ⏹ (stop) button + `<TimerBadge elapsed={elapsed} />`.
  - Otherwise → show ▶ (start) button.
- Clicking ▶ calls `timerCtx.startTimer(task.id, task.name)`.
- Clicking ⏹ calls `timerCtx.stopTimer()`.
- Also show total logged time per task (fetch once on load via `getTaskTime`), displayed as a small badge like `🔥 1h 23m`.

> **Gotcha:** `TaskList.tsx` already has a lot going on. Keep the timer button additions minimal — a small icon button column, not a full redesign.

### Step 2.3 — `src/components/Layout.tsx`

- Import `useTimer`.
- At the bottom of the sidebar (near the Pomodoro button), add a collapsible global timer bar.
- When `runningEntry !== null`, show:
  ```
  ▶ Running: <task name>  ·  <TimerBadge>     [⏹] [Focus]
  ```
- When no timer is running, the bar is hidden (or shows a subtle "No timer running" placeholder).
- The `[Focus]` button calls `window.electronAPI.toggleFocus()` (Phase 3).

---

## Phase 3 — Focus Mode Overlay

### Step 3.2 — `electron/focusPreload.ts` (new file)

Mirror `pomodoroPreload.ts` exactly, but expose focus-specific channels:

```ts
contextBridge.exposeInMainWorld('electronAPI', {
  getTheme:       ()                          => ipcRenderer.invoke('theme:get'),
  onThemeChanged: (cb: (t: string) => void)   => ipcRenderer.on('theme:changed', (_e, t) => cb(t)),
  close:          ()                          => ipcRenderer.invoke('focus:close'),
  minimize:       ()                          => ipcRenderer.invoke('focus:minimize'),
  stopTimer:      ()                          => ipcRenderer.invoke('time:stopRunning'),
  getRunning:     ()                          => ipcRenderer.invoke('time:running'),
  onTimerUpdate:  (cb: (entry: any) => void)  => ipcRenderer.on('focus:timerUpdate', (_e, e) => cb(e)),
})
```

Also create `electron/focusPreload.cjs` — compiled version (same build step as `pomodoroPreload.cjs`).

### Step 3.1 — `electron/focus.html` (new file)

Self-contained HTML page (no React, same as `pomodoro.html`). Structure:

```
┌──────────────────┐
│ [✕]  [—]        │  ← close / minimize
│                  │
│       🎯         │
│                  │
│  <task name>     │
│                  │
│  01:23:45        │  ← large monospace elapsed
│                  │
│ ████████░░  72%  │  ← progress bar toward daily goal
│  of 2h goal      │
│                  │
│   [⏸]   [⏹]    │
└──────────────────┘
```

- On load: call `electronAPI.getRunning()` to get the active task + start time.
- Tick every second to update elapsed display.
- Daily goal is hardcoded at 2h initially (configurable in Phase 5 / Settings).
- Theme: call `electronAPI.getTheme()` on load, listen to `onThemeChanged`.
- `[⏹]` calls `electronAPI.stopTimer()` then `electronAPI.close()`.

### Step 3.3 — `electron/main.ts` additions

Add `focusWindow` variable and `createFocusWindow()` alongside `createPomodoroWindow()`:

```ts
let focusWindow: BrowserWindow | null = null

function createFocusWindow() {
  if (focusWindow) { focusWindow.focus(); return }
  focusWindow = new BrowserWindow({
    width: 220,
    height: 360,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath('focusPreload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const focusPath = app.isPackaged
    ? path.join(process.resourcesPath, 'electron', 'focus.html')
    : path.join(app.getAppPath(), 'electron', 'focus.html')
  focusWindow.loadFile(focusPath)
  focusWindow.on('closed', () => { focusWindow = null })
}
```

Add IPC handlers:
```ts
ipcMain.handle('focus:toggle',   () => { focusWindow ? focusWindow.close() : createFocusWindow() })
ipcMain.handle('focus:close',    () => { focusWindow?.close() })
ipcMain.handle('focus:minimize', () => { focusWindow?.minimize() })
```

When a timer starts/stops (in `time:start` / `time:stop` handlers), push an update to the focus window if it's open:
```ts
focusWindow?.webContents.send('focus:timerUpdate', entry)
```

### Step 3.4 — `src/components/Layout.tsx`

The `[Focus]` button added in Step 2.3 is already wired to `toggleFocus()`. No additional changes needed here beyond what Phase 2 adds.

---

## Phase 4 — Pomodoro Integration

### Step 4.2 — `electron/main.ts`

In the `pomodoro:notify` handler (or wherever pomodoro session completion is signalled), add:

```ts
// When a pomodoro work session completes, auto-stop the running timer
// and log the duration as a time entry linked to the active task.
ipcMain.handle('pomodoro:sessionComplete', async (_e, durationMinutes) => {
  habitRepo.logPomodoroSession(durationMinutes)
  const running = timeRepo.getRunningTimer()
  if (running) {
    timeRepo.stopTimer(running.id)
  }
})
```

> **Note:** The pomodoro overlay currently calls `habits:pomodoroLog` directly. Swap that call to `pomodoro:sessionComplete` so both the habit log and the time entry are written atomically.

### Step 4.1 — `electron/pomodoro.html`

After a work session completes, display a small "Focus time logged" confirmation showing total focus time today. Fetch via `electronAPI.getDailyReport(today)` (needs to be added to `pomodoroPreload.ts`).

Add to `pomodoroPreload.ts`:
```ts
getDailyReport: (date: string) => ipcRenderer.invoke('time:dailyReport', date),
```

---

## Phase 5 — Dashboard & Reports Page

### Step 5.1 — `src/pages/Dashboard.tsx`

Add a "Today's Focus Time" card alongside the existing stats cards:
- Fetch `getDailyReport(today)` on load.
- Show total seconds formatted as `Xh Ym`.
- Show a small horizontal bar breakdown by task (top 3 tasks, others collapsed).

### Step 5.2 — `src/pages/TimeReports.tsx` (new file)

Full reports page. Sections:

1. **Date picker** — defaults to current week. Toggle between Daily / Weekly view.
2. **Daily view** — table of entries grouped by task. Columns: Task, Start, End, Duration, Note, Actions (edit/delete).
3. **Weekly view** — 7 bars (one per day), each bar shows total time. Below: table of tasks with time per day.
4. **Export** — "Export CSV" button. Generates a flat CSV of all entries in the selected range.

Add the route in `App.tsx` (check existing router setup) and add a nav link in `Layout.tsx` sidebar.

---

## Build & Preload Compilation

Check `scripts/build.mjs` — the `.cjs` preload files are likely compiled from `.ts` sources. Confirm the build script handles:
- `electron/focusPreload.ts` → `electron/focusPreload.cjs`
- `dist-electron/focusPreload.cjs` (packaged output)
- `electron/focus.html` → `dist-electron/focus.html`

If the build script uses `esbuild` to compile preloads, add `focusPreload.ts` to the entry points list.

---

## Implementation Order (Recommended)

```
1.2 db.ts migration          ← unblocks everything
1.1 timeRepo.ts              ← core data layer
1.3 main.ts IPC handlers     ← wires backend
1.4 preload.ts + .cjs        ← exposes to renderer
1.5 models.ts types          ← TypeScript safety
2.4 TimerContext.tsx         ← global state before any UI
2.2 TimerBadge.tsx           ← reusable component
2.1 TaskList.tsx timer btns  ← first visible feature
2.3 Layout.tsx global bar    ← persistent timer bar
3.2 focusPreload.ts/.cjs     ← overlay bridge
3.1 focus.html               ← overlay UI
3.3 main.ts focus window     ← overlay window management
3.4 Layout.tsx focus button  ← already done in 2.3
4.2 main.ts pomodoro wire    ← auto-log on session end
4.1 pomodoro.html stats      ← show focus time in overlay
5.1 Dashboard.tsx card       ← today's focus time
5.2 TimeReports.tsx          ← full reports page
```

---

## Key Patterns to Follow

| Pattern | Where to copy from |
|---|---|
| DB repo (exec/run/getSingle/save) | `habitRepo.ts` |
| Migration chaining | `db.ts` → `runHabitMigrations` |
| IPC handler registration | `main.ts` → habits block |
| Preload bridge | `preload.ts` → habits section |
| Overlay window (always-on-top, frameless) | `createPomodoroWindow()` in `main.ts` |
| Overlay preload | `pomodoroPreload.ts` |
| React context | `ThemeContext.tsx` |
| Type interfaces + ElectronAPI extension | `models.ts` |

---

## Open Questions / Decisions Needed

| # | Question | Default assumption |
|---|---|---|
| 1 | Should starting a new timer auto-stop the previous one, or prompt the user? | Auto-stop (silent) |
| 2 | Daily focus goal — hardcoded 2h or user-configurable in Settings? | Hardcoded 2h for now, Settings tab in a follow-up |
| 3 | Focus window position — remember last position or always center? | Always top-right corner (like pomodoro) |
| 4 | Are `preload.cjs` files hand-maintained or build-generated? | Check `scripts/build.mjs` before touching them |
| 5 | Should `TimeReports` be a top-level nav item or nested under a "Reports" section? | Top-level nav item for now |
| 6 | Pause timer — is a "paused" state needed, or is stop/start sufficient? | Stop/start only for v1 (no pause state in DB) |

---

## How to Use the Time Tracking Feature

### Starting a Timer

1. Go to the **Tasks** page (`/tasks`)
2. Find the task you want to track time on
3. Click the **▶** button on the right side of the task row
4. The button turns into **⏹** and a live `MM:SS` counter appears next to it
5. The **global timer bar** appears at the bottom of the sidebar showing the running task name and elapsed time

> Only one timer can run at a time. Starting a new timer automatically stops the previous one.

---

### Stopping a Timer

You can stop the running timer from three places:

| Where | How |
|---|---|
| Task row (Tasks page) | Click the **⏹** button on the active task row |
| Sidebar timer bar | Click the **⏹** button in the bottom timer bar |
| Focus Mode overlay | Click the **⏹** button in the overlay window |

When stopped, the duration is saved to the database and the timer resets.

---

### Viewing Logged Time on Tasks

Each task row shows a **🔥 Xh Ym** badge next to the action buttons when time has been logged for that task. This is the total time ever logged, not just today.

---

### Focus Mode

Focus Mode opens a small always-on-top overlay window that keeps your current task visible while you work in other apps.

**To open Focus Mode:**
- Click the **🎯** button in the sidebar timer bar (only visible when a timer is running)

**The overlay shows:**
- The name of the task being timed
- A large live elapsed time counter (`HH:MM:SS`)
- A progress bar showing how far you are toward your **2-hour daily focus goal**
- A **⏹ Stop** button to stop the timer

**To close Focus Mode:**
- Click the **✕** button in the overlay title bar
- Or stop the timer with **⏹** (the overlay stays open until you close it manually)

> If no timer is running when you open Focus Mode, the overlay shows "No timer running" and prompts you to start one from the Tasks page.

---

### Time Reports Page

Navigate to **Time Reports** (`/time-reports`) in the sidebar to see all your logged time.

#### Daily View
- Shows all time entries for a selected date, grouped by task
- Each group shows: Start time, End time, Duration, Note
- Use the **date picker** to jump to any day
- Edit or delete individual entries with the ✏️ / 🗑️ buttons

#### Weekly View
- Shows a **bar chart** of total focus time per day for the selected week
- Below the chart: a breakdown of time per task for each day
- Use the **◀ ▶** arrows to navigate between weeks

#### Editing a Time Entry
1. Click **✏️** on any entry in the Daily view
2. Adjust the Start time, End time, or Note
3. Click **Save** — duration is automatically recomputed

#### Exporting to CSV
- Click **Export CSV** in the top-right corner
- Downloads a flat CSV file with columns: Task, Start, End, Duration, Note
- The export covers whatever date range is currently shown (daily or weekly)

---

### Dashboard — Today's Focus Time

The **Dashboard** page shows a **⏱ Today's Focus Time** card that displays:
- Total focus time logged today (e.g. `1h 23m`)
- A horizontal bar breakdown of the top 3 tasks worked on today

This updates each time you visit the Dashboard.

---

### Pomodoro Integration

When a **Pomodoro focus session** completes (the 25-minute timer runs out):
- The session is automatically logged to your habit tracker (as before)
- If a time tracker is running, it is **automatically stopped** and the duration is saved

This means you can run the Pomodoro timer and the task timer together — the Pomodoro session end acts as a natural stopping point for your time entry.

---

### App Restart Recovery

If you close and reopen the app while a timer is running, the timer **automatically resumes** from where it left off. The elapsed time is recalculated from the original `start_time` stored in the database.

---

### Quick Reference

| Action | Where |
|---|---|
| Start timer | Tasks page → ▶ button on task row |
| Stop timer | Task row ⏹, sidebar bar ⏹, or Focus overlay ⏹ |
| See live elapsed time | Task row badge + sidebar timer bar |
| Open Focus Mode | Sidebar timer bar → 🎯 button |
| View daily report | Time Reports page → Daily tab |
| View weekly report | Time Reports page → Weekly tab |
| Edit a time entry | Time Reports → Daily view → ✏️ |
| Delete a time entry | Time Reports → Daily view → 🗑️ |
| Export to CSV | Time Reports → Export CSV button |
| Today's total focus | Dashboard → ⏱ Today's Focus Time card |
