import { useEffect, useState, useCallback } from 'react'
import type { Habit } from '../types/models'

const PRESET_COLORS = ['#89b4fa', '#a6e3a1', '#f9e2af', '#fab387', '#f38ba8', '#cba6f7', '#94e2d5', '#bac2de']
const EMOJI_OPTIONS = ['✅', '📖', '💪', '🎸', '🧘', '🏃', '🎨', '✍️', '💧', '🥗', '🧠', '🎯', '📝', '☕', '🌱', '🎵']

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({})
  const [calDate, setCalDate] = useState<Record<number, { year: number; month: number }>>({})
  const [showModal, setShowModal] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [yearLogs, setYearLogs] = useState<Record<number, Record<string, boolean>>>({})

  const loadData = useCallback(async () => {
    const h = await window.electronAPI.getHabits()
    setHabits(h)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleExpand = async (habitId: number) => {
    const expanded = !expandedMap[habitId]
    setExpandedMap(prev => ({ ...prev, [habitId]: expanded }))
    if (expanded && !yearLogs[habitId]) {
      const logs = await window.electronAPI.getHabitYearLogs(habitId, new Date().getFullYear())
      const map: Record<string, boolean> = {}
      logs.forEach(l => { map[l.date] = l.completed === 1 })
      setYearLogs(prev => ({ ...prev, [habitId]: map }))
    }
  }

  const toggleLog = async (habitId: number, loggedToday: boolean) => {
    await window.electronAPI.logHabit(habitId, todayISO(), !loggedToday)
    loadData()
  }

  const navigateCal = (habitId: number, direction: number) => {
    setCalDate(prev => {
      const cur = prev[habitId] || { year: new Date().getFullYear(), month: new Date().getMonth() }
      let { year, month } = cur
      month += direction
      if (month < 0) { month = 11; year-- }
      if (month > 11) { month = 0; year++ }
      return { ...prev, [habitId]: { year, month } }
    })
  }

  const handleSave = async (data: any) => {
    if (editHabit) {
      await window.electronAPI.updateHabit(editHabit.id, data)
    } else {
      await window.electronAPI.createHabit(data)
    }
    setShowModal(false)
    setEditHabit(null)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this habit? All logs will be lost.')) return
    await window.electronAPI.deleteHabit(id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          ✅ Habits
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.hash = '#/weekly-review'}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          >
            📊 Weekly Review
          </button>
          <button
            onClick={() => { setEditHabit(null); setShowModal(true) }}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: '#1e1e2e' }}
          >
            + Add Habit
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No habits yet. Add your first habit to start tracking!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              expanded={!!expandedMap[habit.id]}
              calDate={calDate[habit.id] || { year: new Date().getFullYear(), month: new Date().getMonth() }}
              yearLogs={yearLogs[habit.id] || {}}
              onToggleExpand={() => toggleExpand(habit.id)}
              onToggleLog={() => toggleLog(habit.id, habit.loggedToday)}
              onEdit={() => { setEditHabit(habit); setShowModal(true) }}
              onDelete={() => handleDelete(habit.id)}
              onNavigateCal={(dir) => navigateCal(habit.id, dir)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <HabitModal
          habit={editHabit}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditHabit(null) }}
        />
      )}
    </div>
  )
}

function HabitCard({ habit, expanded, calDate, yearLogs, onToggleExpand, onToggleLog, onEdit, onDelete, onNavigateCal }: {
  habit: Habit; expanded: boolean; calDate: { year: number; month: number }; yearLogs: Record<string, boolean>
  onToggleExpand: () => void; onToggleLog: () => void; onEdit: () => void; onDelete: () => void; onNavigateCal: (dir: number) => void
}) {
  const today = new Date()
  const todayStr = todayISO()
  const days = daysInMonth(calDate.year, calDate.month)
  const firstDay = firstDayOfMonth(calDate.year, calDate.month)
  const calCells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calCells.push(null)
  for (let d = 1; d <= days; d++) calCells.push(d)

  return (
    <div className="rounded-xl border overflow-hidden transition-all" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className="p-4 flex items-center gap-4">
        <span className="text-2xl">{habit.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{habit.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: habit.color + '30', color: habit.color }}>
              {habit.frequency === 'daily' ? 'Daily' : 'Weekly'}
            </span>
          </div>
          {habit.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{habit.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span>🔥</span>
              <span className="font-bold text-lg" style={{ color: habit.currentStreak > 0 ? '#f9e2af' : 'var(--text-muted)' }}>
                {habit.currentStreak}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>day{habit.currentStreak !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Best: {habit.longestStreak}</div>
          </div>
          <button
            onClick={onToggleLog}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all border-2"
            style={{
              backgroundColor: habit.loggedToday ? habit.color + '30' : 'transparent',
              borderColor: habit.loggedToday ? habit.color : 'var(--border)',
              color: habit.loggedToday ? habit.color : 'var(--text-muted)',
            }}
            title={habit.loggedToday ? 'Completed today' : 'Mark as done'}
          >
            {habit.loggedToday ? '✓' : '○'}
          </button>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onToggleExpand} className="p-2 rounded-lg text-sm transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg text-sm transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            ✏️
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg text-sm transition-colors" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            🗑️
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => onNavigateCal(-1)} className="p-1 rounded text-xs" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              ◀
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {MONTHS[calDate.month]} {calDate.year}
            </span>
            <button onClick={() => onNavigateCal(1)} className="p-1 rounded text-xs" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              ▶
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
            ))}
            {calCells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />
              const dateStr = `${calDate.year}-${String(calDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const completed = yearLogs[dateStr]
              const isToday = dateStr === todayStr
              return (
                <div
                  key={dateStr}
                  className="rounded text-xs flex items-center justify-center transition-colors"
                  style={{
                    width: '100%', aspectRatio: '1',
                    backgroundColor: completed ? habit.color + '60' : 'var(--bg-hover)',
                    color: completed ? habit.color : 'var(--text-muted)',
                    border: isToday ? `2px solid ${habit.color}` : '2px solid transparent',
                    fontWeight: isToday ? 700 : 400,
                    cursor: 'pointer',
                  }}
                  title={`${formatDate(dateStr)}: ${completed ? 'Completed' : 'Not completed'}`}
                >
                  {day}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-2 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Best streak: {habit.longestStreak} days</span>
          </div>
        </div>
      )}
    </div>
  )
}

function HabitModal({ habit, onSave, onClose }: {
  habit: Habit | null; onSave: (data: any) => void; onClose: () => void
}) {
  const [name, setName] = useState(habit?.name || '')
  const [description, setDescription] = useState(habit?.description || '')
  const [frequency, setFrequency] = useState(habit?.frequency || 'daily')
  const [reminderTime, setReminderTime] = useState(habit?.reminder_time || '')
  const [color, setColor] = useState(habit?.color || '#89b4fa')
  const [emoji, setEmoji] = useState(habit?.emoji || '✅')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim(),
      frequency,
      reminder_time: reminderTime || null,
      color,
      emoji,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-xl border w-full max-w-md mx-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{habit ? 'Edit Habit' : 'New Habit'}</h2>
          <button onClick={onClose} className="p-1 rounded text-sm" style={{ color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              placeholder="e.g. Read for 30 minutes"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <input
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Frequency</label>
              <select
                value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Reminder Time</label>
              <input
                type="time"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#fff' : 'transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all"
                  style={{
                    backgroundColor: emoji === e ? color + '40' : 'var(--bg-hover)',
                    border: emoji === e ? `2px solid ${color}` : '2px solid transparent',
                  }}
                >{e}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            >
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: '#1e1e2e' }}
            >
              {habit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
