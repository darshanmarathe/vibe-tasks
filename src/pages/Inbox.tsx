import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status, Priority } from '../types/models'

export default function Inbox() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [filterStatus, setFilterStatus] = useState(0)
  const [filterPriority, setFilterPriority] = useState(0)

  const loadData = useCallback(async () => {
    const [t, s, p] = await Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getStatuses(),
      window.electronAPI.getPriorities(),
    ])
    setTasks(t)
    setStatuses(s)
    setPriorities(p)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const twoDaysFromNow = new Date(today)
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

  function isInNext2Days(dueDate: string | null) {
    if (!dueDate) return false
    const d = new Date(dueDate)
    d.setHours(0, 0, 0, 0)
    return d >= today && d <= twoDaysFromNow
  }

  function isOverdue(dueDate: string | null) {
    if (!dueDate) return false
    return new Date(dueDate) < today
  }

  const filteredTasks = tasks.filter(t => {
    if (filterStatus && t.statusId !== filterStatus) return false
    if (filterPriority && t.priorityId !== filterPriority) return false
    return true
  })

  const upcomingTasks = filteredTasks.filter(t => isInNext2Days(t.dueDate))
  const otherTasks = filteredTasks.filter(t => !isInNext2Days(t.dueDate))

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteTask(id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inbox</h1>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <option value={0}>All Statuses</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <option value={0}>All Priorities</option>
          {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Upcoming — Next 2 Days */}
      {upcomingTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--warning)' }}>⏰</span>
            Due in Next 2 Days
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {upcomingTasks.length}
            </span>
          </h2>
          <div className="grid gap-2">
            {upcomingTasks.map(task => (
              <div
                key={task.id}
                className="rounded-xl border p-4 flex items-center gap-4"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderLeft: `4px solid ${task.priorityColor || 'var(--text-muted)'}` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.name}</p>
                  <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>{task.statusName}</span>
                    <span style={{ color: task.priorityColor }}>{task.priorityName}</span>
                    <span>{task.projectName}</span>
                    {task.dueDate && (
                      <span style={{ color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: isOverdue(task.dueDate) ? 600 : 400 }}>
                        {new Date(task.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-xs shrink-0"
                  style={{ color: 'var(--danger)' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          All Tasks
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            {otherTasks.length}
          </span>
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderBottomColor: 'var(--border)' }} className="border-b">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Priority</th>
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-left py-3 px-4">Due</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {otherTasks.map(task => (
                <tr
                  key={task.id}
                  className="border-b"
                  style={{ borderColor: 'var(--border)', borderLeft: `3px solid ${task.priorityColor || 'var(--text-muted)'}` }}
                >
                  <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{task.name}</td>
                  <td className="py-3 px-4">{task.statusName}</td>
                  <td className="py-3 px-4 font-medium" style={{ color: task.priorityColor || 'var(--text-secondary)' }}>
                    {task.priorityName}
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{task.projectName}</td>
                  <td className="py-3 px-4">
                    {task.dueDate ? (
                      <span style={{
                        color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-secondary)',
                        fontWeight: isOverdue(task.dueDate) ? 600 : 400,
                      }}>
                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-xs"
                      style={{ color: 'var(--danger)' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {otherTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No tasks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}