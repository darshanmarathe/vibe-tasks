import { useEffect, useState, useCallback } from 'react'
import type { WeeklyReview } from '../types/models'

export default function WeeklyReviewPage() {
  const [data, setData] = useState<WeeklyReview | null>(null)

  const loadData = useCallback(async () => {
    const d = await window.electronAPI.getWeeklyReview()
    setData(d)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          📊 Weekly Review
        </h1>
        <button
          onClick={() => window.location.hash = '#/habits'}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        >
          ← Back to Habits
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            icon="📋"
            label="Tasks Completed"
            value={data.completedTasks}
            total={data.totalTasks}
            color="var(--success)"
          />
          <StatCard
            icon="✅"
            label="Habits Tracked"
            value={data.habitsTracked}
            suffix="days"
            color="var(--accent)"
          />
          <StatCard
            icon="📝"
            label="Notes Written"
            value={data.notesWritten}
            suffix="notes"
            color="var(--warning)"
          />
          <StatCard
            icon="⏱"
            label="Pomodoro Sessions"
            value={data.pomodoroSessions}
            suffix="sessions"
            color="var(--critical)"
          />
          <StatCard
            icon="📔"
            label="Journal Days"
            value={data.journalDays}
            suffix="days"
            color="var(--accent-hover)"
          />
        </div>
      )}

      {data && (
        <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Summary</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Since <strong>{new Date(data.weekStart + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</strong>:
          </p>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>• {data.completedTasks} of {data.totalTasks} tasks completed</li>
            <li>• Tracked habits on {data.habitsTracked} different days</li>
            <li>• Wrote {data.notesWritten} new notes</li>
            <li>• Completed {data.pomodoroSessions} pomodoro sessions</li>
            <li>• Journaled on {data.journalDays} days</li>
          </ul>
        </div>
      )}

      {!data && (
        <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, total, suffix, color }: {
  icon: string; label: string; value: number; total?: number; suffix?: string; color: string
}) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>
            {value}
            {total !== undefined && <span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}> / {total}</span>}
            {suffix && <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}> {suffix}</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
