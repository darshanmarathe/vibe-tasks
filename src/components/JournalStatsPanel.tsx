import type { JournalDailyStats } from '../types/models'
import { formatElapsedShort } from './TimerBadge'

interface JournalStatsPanelProps {
  stats: JournalDailyStats | null
}

export default function JournalStatsPanel({ stats }: JournalStatsPanelProps) {
  if (!stats) {
    return (
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading stats…</p>
      </div>
    )
  }

  const rows = [
    { icon: '✅', label: 'Tasks completed', value: String(stats.tasksCompleted) },
    { icon: '⏱', label: 'Pomodoro sessions', value: String(stats.pomodoroSessions) },
    {
      icon: '✅',
      label: 'Habits done',
      value: stats.habitsTotal > 0 ? `${stats.habitsCompleted}/${stats.habitsTotal}` : '—',
    },
    {
      icon: '🕐',
      label: 'Focus time',
      value: stats.focusTimeSeconds > 0 ? formatElapsedShort(stats.focusTimeSeconds) : '—',
    },
    { icon: '📝', label: 'Notes written', value: String(stats.notesWritten) },
  ]

  return (
    <div className="rounded-xl p-4 border space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Today&apos;s Stats</h3>
      <ul className="space-y-2">
        {rows.map(row => (
          <li key={row.label} className="flex items-center gap-2 text-sm">
            <span>{row.icon}</span>
            <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
          </li>
        ))}
      </ul>
      {stats.tasksCompletedList.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Completed tasks</p>
          <ul className="space-y-1">
            {stats.tasksCompletedList.slice(0, 5).map(t => (
              <li key={t.id} className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{t.name}</li>
            ))}
            {stats.tasksCompletedList.length > 5 && (
              <li className="text-xs" style={{ color: 'var(--text-muted)' }}>
                +{stats.tasksCompletedList.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
