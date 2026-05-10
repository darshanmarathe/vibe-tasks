import { useEffect, useState } from 'react'
import type { TaskWithRelations, Status } from '../types/models'

export default function Dashboard() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getStatuses(),
    ]).then(([t, s]) => {
      setTasks(t)
      setStatuses(s)
    })
  }, [])

  const byStatus = (name: string) => tasks.filter(t => t.statusName === name).length
  const byPriority = (name: string) => tasks.filter(t => t.priorityName === name).length
  const totalTasks = tasks.length
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString())).length

  const formatDate = (d: string | null) => {
    if (!d) return ''
    const date = new Date(d)
    const today = new Date()
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const isOverdue = (d: string | null) => {
    if (!d) return false
    return new Date(d) < new Date(new Date().toDateString())
  }

  // Calendar helpers
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const tasksByDate: Record<string, TaskWithRelations[]> = {}
  tasks.filter(t => t.dueDate).forEach(t => {
    if (!tasksByDate[t.dueDate!]) tasksByDate[t.dueDate!] = []
    tasksByDate[t.dueDate!].push(t)
  })

  const statusColors = ['var(--accent)', 'var(--warning)', 'var(--high)', 'var(--success)']
  const maxStatusCount = Math.max(1, ...statuses.map(s => byStatus(s.name)))

  const priorityColors: Record<string, string> = {
    Critical: 'var(--critical)', High: 'var(--high)', Medium: 'var(--medium)', Low: 'var(--low)',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Tasks', value: totalTasks, color: 'var(--text-primary)' },
          { label: 'Overdue', value: overdueTasks, color: 'var(--danger)' },
          ...statuses.map(s => ({ label: s.name, value: byStatus(s.name), color: 'var(--text-primary)' })),
        ].map(card => (
          <div key={card.label} className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Bar chart - Tasks by Status */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tasks by Status</h2>
          <svg width="100%" height="180" viewBox="0 0 400 180">
            {statuses.map((s, i) => {
              const count = byStatus(s.name)
              const barWidth = count / maxStatusCount * 280
              return (
                <g key={s.id}>
                  <text x="0" y={i * 36 + 24} fontSize="12" fill="var(--text-secondary)">{s.name}</text>
                  <rect x="100" y={i * 36 + 10} width={Math.max(barWidth, 4)} height="20" rx="4" fill={statusColors[i % statusColors.length]} opacity="0.8" />
                  <text x={100 + Math.max(barWidth, 4) + 6} y={i * 36 + 24} fontSize="12" fill="var(--text-primary)" fontWeight="600">{count}</text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Pie/Donut chart - Tasks by Priority */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tasks by Priority</h2>
          {(() => {
            const priorities = ['Critical', 'High', 'Medium', 'Low']
            const total = Math.max(totalTasks, 1)
            let cumulativePercent = 0
            const slices = priorities.map((p, i) => {
              const count = byPriority(p)
              const percent = count / total * 100
              const startAngle = cumulativePercent / 100 * 360
              cumulativePercent += percent
              const endAngle = cumulativePercent / 100 * 360
              const startRad = (startAngle - 90) * Math.PI / 180
              const endRad = (endAngle - 90) * Math.PI / 180
              const x1 = 90 + 70 * Math.cos(startRad)
              const y1 = 90 + 70 * Math.sin(startRad)
              const x2 = 90 + 70 * Math.cos(endRad)
              const y2 = 90 + 70 * Math.sin(endRad)
              const largeArc = percent > 50 ? 1 : 0
              const path = percent > 0
                ? `M90,90 L${x1},${y1} A70,70 0 ${largeArc} 1 ${x2},${y2} Z`
                : ''
              return { label: p, count, color: priorityColors[p as keyof typeof priorityColors] || 'var(--text-muted)', path }
            })

            return (
              <div className="flex items-center gap-6">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {slices.filter(s => s.path).map((s, i) => (
                    <path key={i} d={s.path} fill={s.color} opacity="0.8" />
                  ))}
                  <circle cx="90" cy="90" r="35" fill="var(--bg-secondary)" />
                  <text x="90" y="95" textAnchor="middle" fontSize="22" fontWeight="bold" fill="var(--text-primary)">{totalTasks}</text>
                </svg>
                <div className="space-y-2">
                  {slices.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Calendar view — 50/50 split */}
      {(() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDayOfWeek = new Date(year, month, 1).getDay()
        const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

        const tasksByDate: Record<string, TaskWithRelations[]> = {}
        tasks.filter(t => t.dueDate).forEach(t => {
          if (!tasksByDate[t.dueDate!]) tasksByDate[t.dueDate!] = []
          tasksByDate[t.dueDate!].push(t)
        })

        const selectedTasks = selectedDate ? tasksByDate[selectedDate] || [] : []

        return (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex gap-6">
              {/* Left 50% — Calendar */}
              <div className="w-1/2">
                <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{monthName}</h2>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-xs py-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{d}</div>
                  ))}
                  {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayTasks = tasksByDate[dateStr] || []
                    const isToday = day === now.getDate()
                    const isSelected = dateStr === selectedDate
                    const hasOverdue = dayTasks.some(t => isOverdue(t.dueDate))

                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                        className="rounded-lg p-1.5 text-xs relative cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'var(--accent)' : isToday ? 'var(--bg-hover)' : 'transparent',
                          border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                        }}
                      >
                        <span style={{
                          color: isSelected ? '#fff' : isToday ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: isToday ? 700 : 400,
                        }}>
                          {day}
                        </span>
                        {dayTasks.length > 0 && (
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {dayTasks.slice(0, 3).map(t => (
                              <span key={t.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : hasOverdue ? 'var(--danger)' : 'var(--accent)' }} />
                            ))}
                            {dayTasks.length > 3 && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{dayTasks.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right 50% — Selected day tasks */}
              <div className="w-1/2 border-l pl-6" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
                    : 'Select a day'}
                </h2>
                {selectedTasks.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedDate ? 'No tasks due this day.' : 'Click a date on the calendar to see tasks.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedTasks.map(task => (
                      <div key={task.id} className="rounded-lg p-3 border text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{task.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap" style={{
                            backgroundColor: task.priorityName === 'Critical' ? 'var(--critical)' :
                              task.priorityName === 'High' ? 'var(--high)' :
                              task.priorityName === 'Medium' ? 'var(--medium)' : 'var(--low)',
                            color: '#1e1e2e',
                          }}>
                            {task.priorityName}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{task.statusName}</span>
                          <span>{task.projectName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Recent tasks */}
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Recent Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No tasks yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Priority</th>
                <th className="text-left py-2">Project</th>
                <th className="text-left py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 8).map(task => (
                <tr key={task.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2" style={{ color: 'var(--text-primary)' }}>{task.name}</td>
                  <td className="py-2">{task.statusName}</td>
                  <td className="py-2">{task.priorityName}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{task.projectName}</td>
                  <td className="py-2" style={{
                    color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-secondary)',
                    fontWeight: isOverdue(task.dueDate) ? 600 : 400,
                  }}>
                    {formatDate(task.dueDate) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
