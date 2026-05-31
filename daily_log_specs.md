# Journal & Daily Log — Specifications & Roadmap

> **Status:** Shipped (Release 1.6.2)
> **See:** [`roadmap.md`](roadmap.md) for overall product roadmap

---

## Log

> Handoff log for AI/human continuations. Update after each work session.

### 2026-05-31 — Phases 1–4 implemented

**Done:**
- **Phase 1 — Backend:** `journal_entries` table + migration in [`electron/database/db.ts`](electron/database/db.ts) (`runJournalMigrations()`). Full repo at [`electron/database/repositories/journalRepo.ts`](electron/database/repositories/journalRepo.ts): `getEntry`, `upsertEntry`, `deleteEntry`, `getEntriesInRange`, `getOnThisDay`, `getDailyStats`, `countJournalDaysSince`.
- **Phase 1 — IPC:** Handlers in [`electron/main.ts`](electron/main.ts): `journal:get`, `journal:upsert`, `journal:delete`, `journal:range`, `journal:onThisDay`, `journal:dailyStats`. Exposed in [`electron/preload.ts`](electron/preload.ts) + [`electron/preload.cjs`](electron/preload.cjs).
- **Phase 1 — Types:** `JournalEntry`, `JournalDailyStats`, `OnThisDayEntry` + `ElectronAPI` methods in [`src/types/models.ts`](src/types/models.ts). `WeeklyReview.journalDays` added.
- **Phase 2 — UI:** [`src/pages/DailyJournal.tsx`](src/pages/DailyJournal.tsx) (date nav, debounced auto-save, localStorage `vibe-journal-date`), [`src/components/MoodPicker.tsx`](src/components/MoodPicker.tsx), [`src/components/JournalStatsPanel.tsx`](src/components/JournalStatsPanel.tsx).
- **Phase 3 — On This Day:** [`src/components/OnThisDayPanel.tsx`](src/components/OnThisDayPanel.tsx) + `getOnThisDay()` in repo (MM-DD match, excludes current date).
- **Phase 4 — Integration:** Sidebar + route (`/journal`), Dashboard “Today’s Journal” card, Weekly Review `journalDays` stat (query in [`habitRepo.getWeeklyReview()`](electron/database/repositories/habitRepo.ts)).

**Not done (Phase 5 — stretch):**
- Journal history heatmap / mood trend chart
- Export journal range to Markdown

**Notes for next session:**
- Auto-stats use UTC day bounds (`dateT00:00:00.000Z` … `dateT23:59:59.999Z`) — same as time tracking; local-time adjustment may be needed later.
- `upsertEntry` only writes when user has content (mood or any text field); empty days stay without a DB row.
- `preload.cjs` is hand-maintained — keep in sync with `preload.ts` when adding IPC.
- Release checklist below is partially complete; manual QA still needed.

### 2026-05-31 — Version bump 1.6.2

**Done:**
- `package.json` / `package-lock.json` → `1.6.2`
- [`roadmap.md`](roadmap.md): Journal moved to completed features; planned 1.6.0 section removed
- [`specs.md`](specs.md): Release 1.6.2 changelog added

### 2026-05-31 — Wins, Losses & Summary Report

**Done:**
- Added `wins` and `losses` columns to `journal_entries` (migration + fresh schema in [`electron/database/db.ts`](electron/database/db.ts)).
- Updated [`journalRepo.ts`](electron/database/repositories/journalRepo.ts): `wins`/`losses` in CRUD; new `getSummaryReport(start, end, criteria)`.
- New [`src/components/JournalSummaryReport.tsx`](src/components/JournalSummaryReport.tsx): date range, quick presets (7d/30d/month), 11 inclusion criteria checkboxes, overview cards, consolidated wins/losses lists, daily breakdown, Markdown export.
- [`DailyJournal.tsx`](src/pages/DailyJournal.tsx): Wins & Losses fields (one per line); tab switcher **Daily Entry | Summary Report**.
- IPC: `journal:summaryReport` → `getJournalSummaryReport` in preload + types.

**Notes:**
- Wins/losses are multi-line text; summary report splits on newlines for aggregated lists.
- Summary only includes days that match at least one selected criterion.

---

## Overview

Two tightly coupled features:

1. **Daily Journal** — One page per calendar day where the user reflects on their day:
   - Mood rating (emoji picker, 1–5 scale)
   - What went well / what to improve (free-text sections)
   - Quick notes section (plain text or lightweight markdown)
   - Auto-populated sidebar: tasks completed today, pomodoro sessions, optional habit/time stats
2. **On This Day** — Surfaces past journal entries from the same month-and-day in previous years (e.g. May 31 entries from 2024, 2025, …)

---

## Database Schema

One row per calendar day. Stats (tasks, pomodoros) are **computed on read**, not duplicated in the table.

```sql
CREATE TABLE journal_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT NOT NULL UNIQUE,           -- YYYY-MM-DD (local calendar day)
  mood          INTEGER,                        -- 1–5, null = not set
  went_well     TEXT DEFAULT '',
  to_improve    TEXT DEFAULT '',
  quick_notes   TEXT DEFAULT '',
  created_at    TEXT NOT NULL,                  -- ISO 8601
  updated_at    TEXT NOT NULL                   -- ISO 8601
);
```

### Indexes

```sql
CREATE INDEX idx_journal_entries_date ON journal_entries(date);
```

### Auto-populated stats (query-only, not stored)

| Stat | Source | Query pattern |
|---|---|---|
| Tasks completed | `tasks.completed_at` | `WHERE completed_at >= dayStart AND completed_at <= dayEnd` |
| Pomodoro sessions | `pomodoro_sessions` | `WHERE completed_at >= dayStart AND completed_at <= dayEnd` |
| Habits completed | `habit_logs` | `WHERE date = ? AND completed = 1` |
| Focus time | `time_entries` | Reuse `timeRepo.getDailyReport(date)` total seconds |
| Notes written | `notes` | `WHERE created_at >= dayStart AND created_at <= dayEnd AND is_trashed = 0` |

**Date boundary convention:** Match existing repos — `dayStart = ${date}T00:00:00.000Z`, `dayEnd = ${date}T23:59:59.999Z`. Document in repo if local-time adjustment is needed later.

---

## Implementation Plan

### Phase 1 — Journal Entry CRUD

| Step | Files | What |
|---|---|---|
| 1.1 | `electron/database/repositories/journalRepo.ts` | `getEntry(date)`, `upsertEntry(date, data)`, `deleteEntry(date)`, `getEntriesInRange(start, end)`, `getOnThisDay(month, day)`, `getDailyStats(date)` |
| 1.2 | `electron/database/db.ts` | Add `runJournalMigrations()` — create `journal_entries` table + index; call from `runMigrations()` after `runTimeMigrations()` |
| 1.3 | `electron/main.ts` | IPC handlers: `journal:get`, `journal:upsert`, `journal:delete`, `journal:range`, `journal:onThisDay`, `journal:dailyStats` |
| 1.4 | `electron/preload.ts` + `electron/preload.cjs` | Expose above IPC channels |
| 1.5 | `src/types/models.ts` | Add `JournalEntry`, `JournalDailyStats`, `OnThisDayEntry` interfaces + `ElectronAPI` methods |

**`journalRepo.ts` function sketch:**

```typescript
getEntry(date: string): JournalEntry | null
upsertEntry(date: string, data: Partial<JournalEntry>): JournalEntry
deleteEntry(date: string): void
getEntriesInRange(start: string, end: string): JournalEntry[]
getOnThisDay(month: number, day: number): JournalEntry[]   // MM-DD match across years
getDailyStats(date: string): JournalDailyStats            // aggregates from tasks, pomodoro, habits, time, notes
```

### Phase 2 — Daily Journal Page

| Step | Files | What |
|---|---|---|
| 2.1 | `src/pages/DailyJournal.tsx` | Main journal page: date navigator (prev/next/today), mood emoji picker, three text areas, save-on-blur or debounced auto-save |
| 2.2 | `src/components/MoodPicker.tsx` | Reusable emoji row: 😫 😕 😐 🙂 😄 mapped to moods 1–5; highlight selected |
| 2.3 | `src/components/JournalStatsPanel.tsx` | Read-only sidebar/card showing auto-populated daily stats with links to related pages |
| 2.4 | `src/components/Layout.tsx` | Add nav item under **Reports**: `{ path: '/journal', label: 'Journal', icon: '📔' }` |
| 2.5 | `src/App.tsx` | Route: `/journal` → `<DailyJournal />` |

**Page behavior:**
- Default to today's date on first visit
- Persist last-viewed date in `localStorage` (`vibe-journal-date`) so returning users land where they left off
- Empty day = show blank form; first keystroke creates row via `upsertEntry`
- Show subtle "Saved" indicator after successful upsert

### Phase 3 — On This Day

| Step | Files | What |
|---|---|---|
| 3.1 | `journalRepo.getOnThisDay()` | `SELECT * FROM journal_entries WHERE substr(date, 6, 5) = 'MM-DD' AND date != ? ORDER BY date DESC` |
| 3.2 | `src/components/OnThisDayPanel.tsx` | Collapsible panel below the journal form; lists past years' entries with mood, excerpt of `went_well`, link to jump to that date |
| 3.3 | `DailyJournal.tsx` | Mount `OnThisDayPanel` when `getOnThisDay()` returns ≥1 past entry; hide when none exist |

### Phase 4 — Dashboard & Review Integration

| Step | Files | What |
|---|---|---|
| 4.1 | `src/pages/Dashboard.tsx` | "Today's Journal" card: mood emoji if set, one-line preview of `went_well`, CTA to open journal |
| 4.2 | `src/pages/WeeklyReview.tsx` | Add stat: days journaled this week (`COUNT(DISTINCT date)` from `journal_entries` in range) |
| 4.3 | `habitRepo.getWeeklyReview()` or `journalRepo` | Extend weekly review backend to include `journalDays` count |

### Phase 5 — History & Mood Trends (stretch)

| Step | Files | What |
|---|---|---|
| 5.1 | `DailyJournal.tsx` | Mini calendar heatmap or month list showing days with entries (reuse habit heatmap pattern from `Habits.tsx`) |
| 5.2 | `src/pages/DailyJournal.tsx` or sub-view | Mood trend line chart for last 30 days (reuse Recharts from Dashboard) |
| 5.3 | Export | Export journal range to Markdown (one file per day or single combined file) |

---

## UI Mockups

### Daily Journal page
```
┌─────────────────────────────────────────────────────────────────────────┐
│  📔 Daily Journal          ◀  Sun, May 31, 2026  ▶    [Today]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  How was your day?   😫  😕  😐  🙂  😄                                 │
│                                                                         │
│  What went well                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Shipped the splash screen. Good focus session in the morning.    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  What to improve                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Spent too long in meetings. Need to block deep-work earlier.     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Quick notes                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Remember to follow up with Alex about the API spec.              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
├──────────────────────────────┬──────────────────────────────────────────┤
│  On This Day                 │  Today's Stats                         │
│  ─────────────               │  ─────────────                         │
│  May 31, 2025  🙂            │  ✅ 4 tasks completed                  │
│  "Launched v1.5 habits…"     │  ⏱  6 pomodoro sessions                │
│                              │  ✅ 3/5 habits done                    │
│  May 31, 2024  😐            │  🕐 2h 15m focus time                  │
│  "Slow day, caught up on…"   │  📝 2 notes written                    │
└──────────────────────────────┴──────────────────────────────────────────┘
```

### Dashboard card
```
┌──────────────────────────────────────┐
│  📔 Today's Journal                  │
│  Mood: 🙂   ·   Saved 6:42 PM        │
│  "Shipped the splash screen…"        │
│                        [Open Journal]│
└──────────────────────────────────────┘
```

---

## TypeScript Interfaces

```typescript
export interface JournalEntry {
  id: number
  date: string              // YYYY-MM-DD
  mood: number | null       // 1–5
  wentWell: string
  toImprove: string
  quickNotes: string
  createdAt: string
  updatedAt: string
}

export interface JournalDailyStats {
  date: string
  tasksCompleted: number
  tasksCompletedList: { id: number; name: string }[]
  pomodoroSessions: number
  habitsCompleted: number
  habitsTotal: number
  focusTimeSeconds: number
  notesWritten: number
}

export interface OnThisDayEntry {
  date: string
  mood: number | null
  wentWell: string
  yearsAgo: number
}
```

---

## Future Ideas

| Feature | Description |
|---|---|
| **Journal prompts** | Rotating daily prompts ("What are you grateful for?", "What did you learn?") |
| **Link to tasks** | `@mention` tasks in quick notes; show linked tasks in stats panel |
| **End-of-day reminder** | Optional notification at configurable time if today's journal is empty |
| **Weekly journal summary** | AI-free template summarizing the week's moods and themes |
| **Photo attachment** | One image per day stored in local media folder (depends on 1.8.0 attachments infra) |
| **Export to PDF** | Print-friendly daily log for archival |
| **Mood correlation** | Surface insights: mood vs pomodoros, mood vs habit completion (feeds 1.10.0 analytics) |

---

## Existing Patterns to Follow

- **DB repo pattern:** See [`habitRepo.ts`](electron/database/repositories/habitRepo.ts) — CRUD with `getDatabase().exec/run/getSingle/save`, date keyed as `YYYY-MM-DD`
- **Daily aggregation:** See [`timeRepo.getDailyReport()`](electron/database/repositories/timeRepo.ts) — day-boundary queries with ISO range strings
- **Weekly stats:** See [`habitRepo.getWeeklyReview()`](electron/database/repositories/habitRepo.ts) — cross-table counts for review pages
- **IPC pattern:** See [`electron/main.ts`](electron/main.ts) — `ipcMain.handle('journal:action', handler)` + [`preload.ts`](electron/preload.ts) bridge
- **Page wiring:** See [`Layout.tsx`](src/components/Layout.tsx) nav groups + [`App.tsx`](src/App.tsx) routes
- **UI pattern:** See [`WeeklyReview.tsx`](src/pages/WeeklyReview.tsx) — load stats via `useCallback`/`useEffect`, stat cards with CSS vars
- **Heatmap UI:** See [`Habits.tsx`](src/pages/Habits.tsx) — calendar grid for streak/history visualization (Phase 5)

---

## Release Checklist

- [x] Migration runs cleanly on existing databases (no data loss)
- [ ] Journal CRUD covered manually: create, edit, delete, date navigation
- [ ] Auto-stats match manual counts for tasks/pomodoros on a test day
- [ ] On This Day shows prior-year entries and hides when none exist
- [x] Dashboard card reflects today's entry
- [x] Sidebar nav + route registered
- [x] `ElectronAPI` types match preload surface
