import { getDatabase } from '../db'
import * as timeRepo from './timeRepo'

export type JournalSummaryCriteria = {
  includeMood: boolean
  includeWentWell: boolean
  includeToImprove: boolean
  includeWins: boolean
  includeLosses: boolean
  includeQuickNotes: boolean
  includeTasksCompleted: boolean
  includePomodoros: boolean
  includeHabits: boolean
  includeFocusTime: boolean
  includeNotesWritten: boolean
}

function nowISO(): string {
  return new Date().toISOString()
}

function dayBounds(date: string) {
  return {
    dayStart: `${date}T00:00:00.000Z`,
    dayEnd: `${date}T23:59:59.999Z`,
  }
}

function formatEntry(row: any) {
  if (!row) return null
  return {
    id: row.id,
    date: row.date,
    mood: row.mood ?? null,
    wentWell: row.went_well ?? '',
    toImprove: row.to_improve ?? '',
    wins: row.wins ?? '',
    losses: row.losses ?? '',
    quickNotes: row.quick_notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function datesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const endD = new Date(end + 'T12:00:00')
  while (d <= endD) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function splitLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

export function getEntry(date: string) {
  const db = getDatabase()
  const row = db.getSingle('SELECT * FROM journal_entries WHERE date = ?', [date])
  return formatEntry(row)
}

export function upsertEntry(date: string, data: {
  mood?: number | null
  wentWell?: string
  toImprove?: string
  wins?: string
  losses?: string
  quickNotes?: string
}) {
  const db = getDatabase()
  const now = nowISO()
  const existing = db.getSingle('SELECT id FROM journal_entries WHERE date = ?', [date])

  if (existing) {
    const fields: string[] = ['updated_at = ?']
    const values: any[] = [now]
    if (data.mood !== undefined) { fields.push('mood = ?'); values.push(data.mood) }
    if (data.wentWell !== undefined) { fields.push('went_well = ?'); values.push(data.wentWell) }
    if (data.toImprove !== undefined) { fields.push('to_improve = ?'); values.push(data.toImprove) }
    if (data.wins !== undefined) { fields.push('wins = ?'); values.push(data.wins) }
    if (data.losses !== undefined) { fields.push('losses = ?'); values.push(data.losses) }
    if (data.quickNotes !== undefined) { fields.push('quick_notes = ?'); values.push(data.quickNotes) }
    values.push(date)
    db.run(`UPDATE journal_entries SET ${fields.join(', ')} WHERE date = ?`, values)
  } else {
    db.run(
      `INSERT INTO journal_entries (date, mood, went_well, to_improve, wins, losses, quick_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        date,
        data.mood ?? null,
        data.wentWell ?? '',
        data.toImprove ?? '',
        data.wins ?? '',
        data.losses ?? '',
        data.quickNotes ?? '',
        now,
        now,
      ]
    )
  }

  db.save()
  return getEntry(date)
}

export function deleteEntry(date: string): void {
  const db = getDatabase()
  db.run('DELETE FROM journal_entries WHERE date = ?', [date])
  db.save()
}

export function getEntriesInRange(start: string, end: string) {
  const db = getDatabase()
  const rows = db.exec(
    'SELECT * FROM journal_entries WHERE date >= ? AND date <= ? ORDER BY date DESC',
    [start, end]
  )
  return rows.map(formatEntry)
}

export function getOnThisDay(month: number, day: number, excludeDate?: string) {
  const db = getDatabase()
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const currentYear = new Date().getFullYear()

  let rows = db.exec(
    "SELECT * FROM journal_entries WHERE substr(date, 6, 5) = ? ORDER BY date DESC",
    [mmdd]
  )

  if (excludeDate) {
    rows = rows.filter((r: any) => r.date !== excludeDate)
  }

  return rows.map((row: any) => {
    const entryYear = parseInt(row.date.split('-')[0], 10)
    return {
      date: row.date,
      mood: row.mood ?? null,
      wentWell: row.went_well ?? '',
      yearsAgo: currentYear - entryYear,
    }
  })
}

export function getDailyStats(date: string) {
  const db = getDatabase()
  const { dayStart, dayEnd } = dayBounds(date)

  const tasksCompletedList = db.exec(
    `SELECT id, name FROM tasks
     WHERE completed_at >= ? AND completed_at <= ? AND archived = 0
     ORDER BY completed_at DESC`,
    [dayStart, dayEnd]
  )

  const pomodoroSessions = db.getSingle(
    'SELECT COUNT(*) as count FROM pomodoro_sessions WHERE completed_at >= ? AND completed_at <= ?',
    [dayStart, dayEnd]
  )?.count || 0

  const habitsTotal = db.getSingle('SELECT COUNT(*) as count FROM habits')?.count || 0
  const habitsCompleted = db.getSingle(
    'SELECT COUNT(*) as count FROM habit_logs WHERE date = ? AND completed = 1',
    [date]
  )?.count || 0

  const notesWritten = db.getSingle(
    'SELECT COUNT(*) as count FROM notes WHERE created_at >= ? AND created_at <= ? AND is_trashed = 0',
    [dayStart, dayEnd]
  )?.count || 0

  const dailyReport = timeRepo.getDailyReport(date)
  const focusTimeSeconds = dailyReport.reduce((sum, g) => sum + g.totalSeconds, 0)

  return {
    date,
    tasksCompleted: tasksCompletedList.length,
    tasksCompletedList: tasksCompletedList.map((t: any) => ({ id: t.id, name: t.name })),
    pomodoroSessions,
    habitsCompleted,
    habitsTotal,
    focusTimeSeconds,
    notesWritten,
  }
}

export function countJournalDaysSince(sinceDate: string): number {
  const db = getDatabase()
  return db.getSingle(
    'SELECT COUNT(DISTINCT date) as count FROM journal_entries WHERE date >= ?',
    [sinceDate]
  )?.count || 0
}

function entryHasIncludedContent(entry: ReturnType<typeof formatEntry>, criteria: JournalSummaryCriteria): boolean {
  if (!entry) return false
  if (criteria.includeMood && entry.mood != null) return true
  if (criteria.includeWentWell && entry.wentWell.trim()) return true
  if (criteria.includeToImprove && entry.toImprove.trim()) return true
  if (criteria.includeWins && entry.wins.trim()) return true
  if (criteria.includeLosses && entry.losses.trim()) return true
  if (criteria.includeQuickNotes && entry.quickNotes.trim()) return true
  return false
}

function statsHasIncludedContent(stats: ReturnType<typeof getDailyStats>, criteria: JournalSummaryCriteria): boolean {
  if (criteria.includeTasksCompleted && stats.tasksCompleted > 0) return true
  if (criteria.includePomodoros && stats.pomodoroSessions > 0) return true
  if (criteria.includeHabits && stats.habitsCompleted > 0) return true
  if (criteria.includeFocusTime && stats.focusTimeSeconds > 0) return true
  if (criteria.includeNotesWritten && stats.notesWritten > 0) return true
  return false
}

export function getSummaryReport(start: string, end: string, criteria: JournalSummaryCriteria) {
  const entryMap = new Map(
    getEntriesInRange(start, end).map(e => [e!.date, e!])
  )

  const needsStats = criteria.includeTasksCompleted || criteria.includePomodoros
    || criteria.includeHabits || criteria.includeFocusTime || criteria.includeNotesWritten

  let daysJournaled = 0
  let moodSum = 0
  let moodCount = 0
  let totalPomodoroSessions = 0
  let totalTasksCompleted = 0
  let totalFocusTimeSeconds = 0
  let totalNotesWritten = 0
  let totalHabitsCompleted = 0
  const allWins: { date: string; text: string }[] = []
  const allLosses: { date: string; text: string }[] = []
  const days: {
    date: string
    entry: ReturnType<typeof formatEntry>
    stats: ReturnType<typeof getDailyStats> | null
  }[] = []

  for (const date of datesInRange(start, end)) {
    const entry = entryMap.get(date) ?? null
    const stats = needsStats ? getDailyStats(date) : null

    if (entry) daysJournaled++

    if (entry?.mood != null) {
      moodSum += entry.mood
      moodCount++
    }

    if (entry && criteria.includeWins && entry.wins.trim()) {
      for (const line of splitLines(entry.wins)) {
        allWins.push({ date, text: line })
      }
    }
    if (entry && criteria.includeLosses && entry.losses.trim()) {
      for (const line of splitLines(entry.losses)) {
        allLosses.push({ date, text: line })
      }
    }

    if (stats) {
      totalPomodoroSessions += stats.pomodoroSessions
      totalTasksCompleted += stats.tasksCompleted
      totalFocusTimeSeconds += stats.focusTimeSeconds
      totalNotesWritten += stats.notesWritten
      totalHabitsCompleted += stats.habitsCompleted
    }

    const hasEntry = entryHasIncludedContent(entry, criteria)
    const hasStats = stats ? statsHasIncludedContent(stats, criteria) : false
    if (!hasEntry && !hasStats) continue

    days.push({ date, entry, stats })
  }

  return {
    startDate: start,
    endDate: end,
    daysJournaled,
    averageMood: moodCount > 0 ? Math.round((moodSum / moodCount) * 10) / 10 : null,
    totalPomodoroSessions,
    totalTasksCompleted,
    totalFocusTimeSeconds,
    totalNotesWritten,
    totalHabitsCompleted,
    allWins,
    allLosses,
    days,
  }
}
