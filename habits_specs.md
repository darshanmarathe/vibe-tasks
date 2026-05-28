# Habit Tracker — Specifications & Roadmap

> **Status:** v1 implemented (Release 1.5.0)
> **See:** `roadmap.md` for overall product roadmap

---

## Implemented (v1)

- Habit CRUD (name, description, frequency, reminder time, color, emoji)
- Daily check-off toggle
- Streak counter (current & longest consecutive days)
- Calendar heatmap (per-habit month grid with navigation)
- Weekly Review page (tasks, habits, notes, pomodoro summary)
- Desktop reminder notifications (configurable HH:MM per habit)

---

## Planned Features

### Short-term

| Feature | Description |
|---|---|
| **Year heatmap** | GitHub-style contribution grid showing the full year at a glance |
| **Stats panel** | Completion rate %, total logs, average streak, best/worst month per habit |
| **Habit categories** | Group habits into folders/categories (Health, Learning, Work, etc.) with collapsible sections |
| **Edit in-line** | Quick-edit habit name/emoji from the list without opening modal |
| **Drag to reorder** | Reorder habits by dragging them in the list |
| **Archive habits** | Archive old habits instead of deleting, hide from main list |

### Medium-term

| Feature | Description |
|---|---|
| **Advanced recurrence** | Specific days of week (MWF), custom intervals (every 3 days), monthly (on the 15th), Nth weekday |
| **Multiple check-ins** | Track quantity per day (e.g. "8 glasses of water" with a counter) with configurable target |
| **Skip / excuse days** | Mark a day as "excused" without breaking streak; auto-excuse weekends for weekday habits |
| **Streak freeze** | Earn freezes by consistency; auto-apply when you miss a day (like Duolingo) |
| **Habit journal** | Add a short note per check-in ("Felt tired today but did it") |
| **Completion charts** | Line/bar chart of completion % over 1m/3m/6m/1y; best/worst day of week analysis |
| **Habit templates** | Pre-built habit templates (e.g. "Morning routine", "Fitness starter") with suggested settings |
| **Reorderable habits in sidebar** | Expand "Habits" nav item to show habit list with quick-check from sidebar |

### Long-term

| Feature | Description |
|---|---|
| **Link habits to tasks** | Create a task from a habit log or auto-create recurring tasks from habits |
| **Habit goals** | Set target streak length (e.g. "30-day streak"), show progress bar |
| **Habit challenges** | Join time-bound challenges (e.g. "30 days of exercise") with community stats |
| **Smart reminders** | Adaptive reminder time based on past check-in patterns |
| **Streak notifications** | Celebrate milestones with confetti/stars (7, 14, 30, 60, 100, 365 days) |
| **Export habit data** | CSV/JSON export of all logs with completion data |
| **Focus mode integration** | Show due habits in Focus Mode overlay alongside current task |

---

## Database Schema (current)

```sql
CREATE TABLE habits (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  frequency     TEXT NOT NULL DEFAULT 'daily',   -- 'daily' | 'weekly'
  reminder_time TEXT,                            -- 'HH:MM' or null
  color         TEXT DEFAULT '#89b4fa',
  emoji         TEXT DEFAULT '✅',
  created_at    TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0
);

CREATE TABLE habit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id   INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,                -- 'YYYY-MM-DD'
  completed  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(habit_id, date)
);
```

### Migration path for planned features

- **Habit categories:** new `habit_categories` table (id, name, color, sort_order) + `category_id` FK on `habits`
- **Multiple check-ins:** add `target_count` (INTEGER DEFAULT 1), `count` (INTEGER DEFAULT 1) columns to `habit_logs`
- **Journal entries:** add `note` (TEXT) column to `habit_logs`
- **Streak freeze:** add `freezes_available` (INTEGER DEFAULT 0) column to `habits` + `excused` (INTEGER DEFAULT 0) column to `habit_logs`
- **Advanced recurrence:** add `recurrence_rules` (TEXT, JSON config) column to `habits`, keep `frequency` for backward compat
- **Archive:** add `archived` (INTEGER DEFAULT 0) column to `habits`

---

## UI Mockups (text)

```
┌─────────────────────────────────────────────────────────┐
│  ✅ Habits                          [📊 Review] [+ Add] │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 📖 Read 30 mins  Daily  🔥12d  Best: 30  [✓] ⋮ │   │
│  │ ┌────────────────────────────────────────┐        │   │
│  │ │ ◀  Jan 2026 ▶                         │        │   │
│  │ │ Su Mo Tu We Th Fr Sa                  │        │   │
│  │ │       1   2   3   4   5   6            │        │   │
│  │ │  7   8   9  10  11  12  13            │        │   │
│  │ │ 14  15  16  17  18  19  20            │        │   │
│  │ │ 21  22  23  24  25  26  27            │        │   │
│  │ │ 28  29  30  31                        │        │   │
│  │ └────────────────────────────────────────┘        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 💪 Exercise       Daily  🔥5d   Best: 14  [ ] ⋮ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Streak algorithm (current)

```
current streak = consecutive days counting backward from today/yesterday
longest streak = max consecutive days in entire log history

Current step: only completed=1 days count, 1-day gap resets to 0
Future: excused days bridge gaps without resetting
```
