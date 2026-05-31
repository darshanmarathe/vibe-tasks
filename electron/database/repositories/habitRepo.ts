import { getDatabase } from '../db'

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function getHabitWithStreaks(habit: any, db: any): any {
  const currentStreak = calculateCurrentStreak(habit.id, db)
  const longestStreak = calculateLongestStreak(habit.id, db)
  const today = todayISO()
  const loggedToday = !!db.getSingle(
    'SELECT id FROM habit_logs WHERE habit_id = ? AND date = ? AND completed = 1',
    [habit.id, today]
  )
  return { ...habit, currentStreak, longestStreak, loggedToday }
}

export function getHabits(): any[] {
  const db = getDatabase()
  const habits = db.exec('SELECT * FROM habits ORDER BY sort_order ASC, id ASC')
  return habits.map((h: any) => getHabitWithStreaks(h, db))
}

export function getHabit(id: number): any {
  const db = getDatabase()
  const habit = db.getSingle('SELECT * FROM habits WHERE id = ?', [id])
  if (!habit) return null
  return getHabitWithStreaks(habit, db)
}

export function createHabit(data: any): any {
  const db = getDatabase()
  const now = new Date().toISOString()
  const result = db.run(
    'INSERT INTO habits (name, description, frequency, reminder_time, color, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.description || '', data.frequency || 'daily', data.reminder_time || null, data.color || '#89b4fa', data.emoji || '✅', now]
  )
  db.save()
  const habit = db.getSingle('SELECT * FROM habits WHERE id = ?', [result.lastInsertRowid])
  if (!habit) return null
  return getHabitWithStreaks(habit, db)
}

export function updateHabit(id: number, data: any): any {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.frequency !== undefined) { fields.push('frequency = ?'); values.push(data.frequency) }
  if (data.reminder_time !== undefined) { fields.push('reminder_time = ?'); values.push(data.reminder_time) }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
  if (data.emoji !== undefined) { fields.push('emoji = ?'); values.push(data.emoji) }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order) }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  const habit = db.getSingle('SELECT * FROM habits WHERE id = ?', [id])
  return habit ? getHabitWithStreaks(habit, db) : null
}

export function deleteHabit(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM habits WHERE id = ?', [id])
  db.save()
}

export function logHabit(habitId: number, date: string, completed: boolean): any {
  const db = getDatabase()
  const existing = db.getSingle(
    'SELECT id, completed FROM habit_logs WHERE habit_id = ? AND date = ?',
    [habitId, date]
  )
  const now = new Date().toISOString()
  if (existing) {
    db.run('UPDATE habit_logs SET completed = ?, created_at = ? WHERE id = ?',
      [completed ? 1 : 0, now, existing.id])
  } else {
    db.run('INSERT INTO habit_logs (habit_id, date, completed, created_at) VALUES (?, ?, ?, ?)',
      [habitId, date, completed ? 1 : 0, now])
  }
  db.save()
  return getHabit(habitId)
}

export function getHabitLogs(habitId: number, startDate: string, endDate: string): any[] {
  const db = getDatabase()
  return db.exec(
    'SELECT * FROM habit_logs WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
    [habitId, startDate, endDate]
  )
}

export function getYearLogs(habitId: number, year: number): any[] {
  const db = getDatabase()
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  return db.exec(
    'SELECT date, completed FROM habit_logs WHERE habit_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
    [habitId, start, end]
  )
}

export function getHabitStats(habitId: number): any {
  const db = getDatabase()
  const currentStreak = calculateCurrentStreak(habitId, db)
  const longestStreak = calculateLongestStreak(habitId, db)
  const totalLogs = db.getSingle(
    'SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND completed = 1',
    [habitId]
  )
  const firstLog = db.getSingle(
    'SELECT date FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY date ASC LIMIT 1',
    [habitId]
  )
  let completionRate = 0
  if (firstLog) {
    const start = new Date(firstLog.date + 'T00:00:00')
    const days = Math.round((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    completionRate = days > 0 ? Math.round((totalLogs.count / days) * 100) : 0
  }
  return { currentStreak, longestStreak, totalLogs: totalLogs.count, completionRate }
}

export function getWeeklyReview(): any {
  const db = getDatabase()
  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  const doneStatus = db.getSingle("SELECT id FROM statuses WHERE LOWER(name) = 'done'")
  const doneStatusId = doneStatus ? doneStatus.id : null

  const totalTasks = db.getSingle('SELECT COUNT(*) as count FROM tasks')?.count || 0
  const completedTasks = doneStatusId
    ? (db.getSingle('SELECT COUNT(*) as count FROM tasks WHERE statusId = ?', [doneStatusId])?.count || 0)
    : 0

  const habitsTracked = db.getSingle(
    'SELECT COUNT(DISTINCT date) as count FROM habit_logs WHERE date >= ? AND completed = 1',
    [weekAgoStr]
  )?.count || 0

  const notesWritten = db.getSingle(
    "SELECT COUNT(*) as count FROM notes WHERE created_at >= ? AND is_trashed = 0",
    [weekAgo.toISOString()]
  )?.count || 0

  const pomodoroSessions = db.getSingle(
    'SELECT COUNT(*) as count FROM pomodoro_sessions WHERE completed_at >= ?',
    [weekAgo.toISOString()]
  )?.count || 0

  const journalDays = db.getSingle(
    'SELECT COUNT(DISTINCT date) as count FROM journal_entries WHERE date >= ?',
    [weekAgoStr]
  )?.count ?? 0

  return { totalTasks, completedTasks, habitsTracked, notesWritten, pomodoroSessions, journalDays, weekStart: weekAgoStr }
}

export function logPomodoroSession(durationMinutes: number): void {
  const db = getDatabase()
  db.run(
    'INSERT INTO pomodoro_sessions (completed_at, duration_minutes) VALUES (?, ?)',
    [new Date().toISOString(), durationMinutes]
  )
  db.save()
}

function calculateCurrentStreak(habitId: number, db: any): number {
  const logs = db.exec(
    'SELECT date FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY date DESC',
    [habitId]
  )
  if (logs.length === 0) return 0

  const today = new Date(todayISO() + 'T12:00:00')
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const firstLogDate = new Date(logs[0].date + 'T12:00:00')
  const diffFromToday = Math.round((today.getTime() - firstLogDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffFromToday > 1) return 0

  let streak = 1
  for (let i = 1; i < logs.length; i++) {
    const curr = new Date(logs[i].date + 'T12:00:00')
    const prev = new Date(logs[i - 1].date + 'T12:00:00')
    const diff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) { streak++ } else { break }
  }
  return streak
}

function calculateLongestStreak(habitId: number, db: any): number {
  const logs = db.exec(
    'SELECT date FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY date ASC',
    [habitId]
  )
  if (logs.length === 0) return 0

  let longest = 1
  let current = 1
  for (let i = 1; i < logs.length; i++) {
    const curr = new Date(logs[i].date + 'T12:00:00')
    const prev = new Date(logs[i - 1].date + 'T12:00:00')
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) { current++; longest = Math.max(longest, current) }
    else { current = 1 }
  }
  return Math.max(longest, current)
}
