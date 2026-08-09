import { getDatabase } from '../db'

function nowISO(): string {
  return new Date().toISOString()
}

function computeDuration(startTime: string, endTime: string): number {
  return Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
}

function formatEntryWithTask(entry: any, db: any): any {
  if (!entry) return null
  const task = db.getSingle('SELECT name FROM tasks WHERE id = ?', [entry.task_id])
  return { ...entry, task_name: task?.name ?? null }
}

// ── Stop whatever is currently running (internal + exported) ──────────────────
export function stopRunningTimer(): any | null {
  const db = getDatabase()
  const running = db.getSingle(
    'SELECT * FROM time_entries WHERE end_time IS NULL LIMIT 1'
  )
  if (!running) return null
  const endTime = nowISO()
  const duration = computeDuration(running.start_time, endTime)
  db.run(
    'UPDATE time_entries SET end_time = ?, duration_seconds = ? WHERE id = ?',
    [endTime, duration, running.id]
  )
  db.save()
  const updated = db.getSingle('SELECT * FROM time_entries WHERE id = ?', [running.id])
  return formatEntryWithTask(updated, db)
}

// ── Start a timer for a task ──────────────────────────────────────────────────
export function startTimer(taskId: number, note?: string): any {
  const db = getDatabase()
  // Enforce one active timer at a time
  stopRunningTimer()
  const now = nowISO()
  const result = db.run(
    'INSERT INTO time_entries (task_id, start_time, end_time, duration_seconds, note, created_at) VALUES (?, ?, NULL, NULL, ?, ?)',
    [taskId, now, note ?? '', now]
  )
  db.save()
  const entry = db.getSingle('SELECT * FROM time_entries WHERE id = ?', [result.lastInsertRowid])
  return formatEntryWithTask(entry, db)
}

// ── Stop a specific entry by id ───────────────────────────────────────────────
export function stopTimer(entryId: number): any {
  const db = getDatabase()
  const entry = db.getSingle('SELECT * FROM time_entries WHERE id = ?', [entryId])
  if (!entry) return null
  const endTime = nowISO()
  const duration = computeDuration(entry.start_time, endTime)
  db.run(
    'UPDATE time_entries SET end_time = ?, duration_seconds = ? WHERE id = ?',
    [endTime, duration, entryId]
  )
  db.save()
  const updated = db.getSingle('SELECT * FROM time_entries WHERE id = ?', [entryId])
  return formatEntryWithTask(updated, db)
}

// ── Get the currently running timer (if any) ──────────────────────────────────
export function getRunningTimer(): any | null {
  const db = getDatabase()
  const entry = db.getSingle('SELECT * FROM time_entries WHERE end_time IS NULL LIMIT 1')
  return formatEntryWithTask(entry, db)
}

// ── Total seconds logged for a task, with optional date range ─────────────────
export function getTaskTime(taskId: number, range?: { start: string; end: string }): number {
  const db = getDatabase()
  let row: any
  if (range) {
    row = db.getSingle(
      'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM time_entries WHERE task_id = ? AND start_time >= ? AND start_time <= ? AND duration_seconds IS NOT NULL',
      [taskId, range.start, range.end]
    )
  } else {
    row = db.getSingle(
      'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM time_entries WHERE task_id = ? AND duration_seconds IS NOT NULL',
      [taskId]
    )
  }
  return row?.total ?? 0
}

// ── Total seconds logged for multiple tasks, in a single query ─────────────────
export function getTaskTimes(
  taskIds: number[],
  range?: { start: string; end: string }
): Array<[number, number]> {
  if (taskIds.length === 0) return []
  const db = getDatabase()
  const placeholders = taskIds.map(() => '?').join(',')

  const sql = range
    ? `SELECT task_id, COALESCE(SUM(duration_seconds), 0) as total
       FROM time_entries
       WHERE task_id IN (${placeholders}) AND start_time >= ? AND start_time <= ? AND duration_seconds IS NOT NULL
       GROUP BY task_id`
    : `SELECT task_id, COALESCE(SUM(duration_seconds), 0) as total
       FROM time_entries
       WHERE task_id IN (${placeholders}) AND duration_seconds IS NOT NULL
       GROUP BY task_id`

  const params = range ? [...taskIds, range.start, range.end] : [...taskIds]
  const rows = db.exec(sql, params)

  const byId = new Map<number, number>()
  for (const r of rows) {
    byId.set(Number(r.task_id), Number(r.total) || 0)
  }

  // Preserve caller ordering, defaulting missing tasks to 0
  return taskIds.map(id => [id, byId.get(id) ?? 0] as [number, number])
}

// ── Daily report: entries grouped by task for a given date (YYYY-MM-DD) ───────
export function getDailyReport(date: string): any[] {
  const db = getDatabase()
  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd   = `${date}T23:59:59.999Z`

  // Get all completed entries for the day
  const entries = db.exec(
    `SELECT te.*, t.name as task_name
     FROM time_entries te
     JOIN tasks t ON t.id = te.task_id
     WHERE te.start_time >= ? AND te.start_time <= ? AND te.duration_seconds IS NOT NULL
     ORDER BY te.start_time ASC`,
    [dayStart, dayEnd]
  )

  // Group by task
  const byTask = new Map<number, any>()
  for (const e of entries) {
    if (!byTask.has(e.task_id)) {
      byTask.set(e.task_id, { taskId: e.task_id, taskName: e.task_name, totalSeconds: 0, entries: [] })
    }
    const group = byTask.get(e.task_id)!
    group.totalSeconds += e.duration_seconds
    group.entries.push(e)
  }
  return Array.from(byTask.values())
}

// ── Weekly report: 7-day window from startDate ────────────────────────────────
export function getWeeklyReport(startDate: string): any[] {
  const db = getDatabase()
  const result: any[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayStart = `${dateStr}T00:00:00.000Z`
    const dayEnd   = `${dateStr}T23:59:59.999Z`

    const entries = db.exec(
      `SELECT te.task_id, t.name as task_name, COALESCE(SUM(te.duration_seconds), 0) as totalSeconds
       FROM time_entries te
       JOIN tasks t ON t.id = te.task_id
       WHERE te.start_time >= ? AND te.start_time <= ? AND te.duration_seconds IS NOT NULL
       GROUP BY te.task_id`,
      [dayStart, dayEnd]
    )

    const totalSeconds = entries.reduce((sum: number, e: any) => sum + e.totalSeconds, 0)
    result.push({
      date: dateStr,
      totalSeconds,
      byTask: entries.map((e: any) => ({
        taskId: e.task_id,
        taskName: e.task_name,
        totalSeconds: e.totalSeconds,
      })),
    })
  }
  return result
}

// ── All entries for a task, newest first ─────────────────────────────────────
export function getAllTimeEntries(taskId: number): any[] {
  const db = getDatabase()
  return db.exec(
    `SELECT te.*, t.name as task_name
     FROM time_entries te
     JOIN tasks t ON t.id = te.task_id
     WHERE te.task_id = ?
     ORDER BY te.start_time DESC`,
    [taskId]
  )
}

// ── Delete an entry ───────────────────────────────────────────────────────────
export function deleteEntry(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM time_entries WHERE id = ?', [id])
  db.save()
}

// ── Update an entry (note, start_time, end_time); recomputes duration ─────────
export function updateEntry(id: number, data: Partial<{
  note: string
  start_time: string
  end_time: string
}>): any {
  const db = getDatabase()
  const existing = db.getSingle('SELECT * FROM time_entries WHERE id = ?', [id])
  if (!existing) return null

  const fields: string[] = []
  const values: any[] = []

  if (data.note !== undefined)       { fields.push('note = ?');       values.push(data.note) }
  if (data.start_time !== undefined) { fields.push('start_time = ?'); values.push(data.start_time) }
  if (data.end_time !== undefined)   { fields.push('end_time = ?');   values.push(data.end_time) }

  // Recompute duration if both times are known after update
  const newStart = data.start_time ?? existing.start_time
  const newEnd   = data.end_time   ?? existing.end_time
  if (newStart && newEnd) {
    const duration = computeDuration(newStart, newEnd)
    fields.push('duration_seconds = ?')
    values.push(duration)
  }

  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE time_entries SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }

  const updated = db.getSingle('SELECT * FROM time_entries WHERE id = ?', [id])
  return formatEntryWithTask(updated, db)
}

// ── Total focus seconds across all tasks for a given date ─────────────────────
export function getTotalFocusToday(date: string): number {
  const db = getDatabase()
  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd   = `${date}T23:59:59.999Z`
  const row = db.getSingle(
    'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM time_entries WHERE start_time >= ? AND start_time <= ? AND duration_seconds IS NOT NULL',
    [dayStart, dayEnd]
  )
  return row?.total ?? 0
}
