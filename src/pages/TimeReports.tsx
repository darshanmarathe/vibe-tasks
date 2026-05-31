import { useEffect, useState, useCallback } from 'react'
import type { DailyReportEntry, WeeklyReportDay, TimeEntry } from '../types/models'
import { formatElapsed, formatElapsedShort } from '../components/TimerBadge'

type ViewMode = 'daily' | 'weekly'

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function weekStartISO(date: string): string {
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function TimeReports() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()))

  const [dailyData, setDailyData] = useState<DailyReportEntry[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyReportDay[]>([])
  const [loading, setLoading] = useState(false)

  // Edit entry state
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const loadDaily = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getDailyReport(date)
      setDailyData(data)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWeekly = useCallback(async (start: string) => {
    setLoading(true)
    try {
      const data = await window.electronAPI.getWeeklyReport(start)
      setWeeklyData(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'daily') loadDaily(selectedDate)
    else loadWeekly(weekStart)
  }, [viewMode, selectedDate, weekStart])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this time entry?')) return
    await window.electronAPI.deleteTimeEntry(id)
    if (viewMode === 'daily') loadDaily(selectedDate)
    else loadWeekly(weekStart)
  }

  const openEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEditNote(entry.note ?? '')
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    setEditStart(entry.start_time.slice(0, 16))
    setEditEnd(entry.end_time ? entry.end_time.slice(0, 16) : '')
  }

  const saveEdit = async () => {
    if (!editingEntry) return
    await window.electronAPI.updateTimeEntry(editingEntry.id, {
      note: editNote,
      start_time: editStart ? new Date(editStart).toISOString() : undefined,
      end_time: editEnd ? new Date(editEnd).toISOString() : undefined,
    })
    setEditingEntry(null)
    if (viewMode === 'daily') loadDaily(selectedDate)
    else loadWeekly(weekStart)
  }

  const exportCSV = () => {
    const rows: string[][] = [['Task', 'Start', 'End', 'Duration', 'Note']]
    if (viewMode === 'daily') {
      for (const group of dailyData) {
        for (const e of group.entries) {
          rows.push([
            group.taskName,
            e.start_time,
            e.end_time ?? '',
            e.duration_seconds != null ? formatElapsed(e.duration_seconds) : '',
            e.note ?? '',
          ])
        }
      }
    } else {
      for (const day of weeklyData) {
        for (const t of day.byTask) {
          rows.push([t.taskName, day.date, '', formatElapsedShort(t.totalSeconds), ''])
        }
      }
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-report-${viewMode === 'daily' ? selectedDate : weekStart}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dailyTotal = dailyData.reduce((s, g) => s + g.totalSeconds, 0)
  const weeklyTotal = weeklyData.reduce((s, d) => s + d.totalSeconds, 0)
  const weeklyMax = Math.max(...weeklyData.map(d => d.totalSeconds), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Time Reports</h1>
        <button
          onClick={exportCSV}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          Export CSV
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['daily', 'weekly'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-4 py-1.5 text-sm capitalize transition-colors"
              style={{
                backgroundColor: viewMode === mode ? 'var(--accent)' : 'var(--bg-secondary)',
                color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {viewMode === 'daily' ? (
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(weekStart + 'T12:00:00')
                d.setDate(d.getDate() - 7)
                setWeekStart(d.toISOString().split('T')[0])
              }}
              className="px-2 py-1 rounded text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              ◀
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Week of {formatDate(weekStart)}
            </span>
            <button
              onClick={() => {
                const d = new Date(weekStart + 'T12:00:00')
                d.setDate(d.getDate() + 7)
                setWeekStart(d.toISOString().split('T')[0])
              }}
              className="px-2 py-1 rounded text-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              ▶
            </button>
          </div>
        )}

        {!loading && (
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            Total: {formatElapsedShort(viewMode === 'daily' ? dailyTotal : weeklyTotal)}
          </span>
        )}
      </div>

      {loading && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      )}

      {/* Daily View */}
      {!loading && viewMode === 'daily' && (
        <div className="space-y-4">
          {dailyData.length === 0 ? (
            <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              No time entries for {formatDate(selectedDate)}.
            </div>
          ) : (
            dailyData.map(group => (
              <div key={group.taskId} className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{group.taskName}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{formatElapsedShort(group.totalSeconds)}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottomColor: 'var(--border)' }} className="border-b">
                      <th className="text-left py-2 px-4">Start</th>
                      <th className="text-left py-2 px-4">End</th>
                      <th className="text-left py-2 px-4">Duration</th>
                      <th className="text-left py-2 px-4">Note</th>
                      <th className="text-right py-2 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map(entry => (
                      <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2 px-4" style={{ color: 'var(--text-primary)' }}>{formatTime(entry.start_time)}</td>
                        <td className="py-2 px-4" style={{ color: 'var(--text-secondary)' }}>
                          {entry.end_time ? formatTime(entry.end_time) : <span style={{ color: 'var(--accent)' }}>Running…</span>}
                        </td>
                        <td className="py-2 px-4" style={{ color: 'var(--text-secondary)' }}>
                          {entry.duration_seconds != null ? formatElapsed(entry.duration_seconds) : '—'}
                        </td>
                        <td className="py-2 px-4" style={{ color: 'var(--text-muted)' }}>{entry.note || '—'}</td>
                        <td className="py-2 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(entry)}
                              className="text-xs"
                              style={{ color: 'var(--text-muted)' }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-xs"
                              style={{ color: 'var(--text-muted)' }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly View */}
      {!loading && viewMode === 'weekly' && (
        <div className="space-y-4">
          {/* Bar chart */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-end gap-2 h-24">
              {weeklyData.map(day => {
                const pct = weeklyMax > 0 ? (day.totalSeconds / weeklyMax) * 100 : 0
                const isToday = day.date === todayISO()
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {day.totalSeconds > 0 ? formatElapsedShort(day.totalSeconds) : ''}
                    </span>
                    <div className="w-full rounded-t" style={{
                      height: `${Math.max(pct, day.totalSeconds > 0 ? 4 : 0)}%`,
                      minHeight: day.totalSeconds > 0 ? '4px' : '0',
                      backgroundColor: isToday ? 'var(--accent)' : 'var(--text-muted)',
                      opacity: day.totalSeconds > 0 ? 1 : 0.2,
                    }} />
                    <span className="text-xs" style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Per-day breakdown */}
          {weeklyData.filter(d => d.totalSeconds > 0).length === 0 ? (
            <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              No time entries for this week.
            </div>
          ) : (
            weeklyData.filter(d => d.totalSeconds > 0).map(day => (
              <div key={day.date} className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(day.date)}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{formatElapsedShort(day.totalSeconds)}</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {day.byTask.map(t => (
                    <div key={t.taskId} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>{t.taskName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatElapsedShort(t.totalSeconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 border w-full max-w-md" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Time Entry</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Start Time</label>
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={e => setEditStart(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>End Time</label>
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={e => setEditEnd(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Note</label>
                <input
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
