import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations } from '../types/models'

export default function Archived() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const loadData = useCallback(async () => {
    const t = await window.electronAPI.getArchivedTasks()
    setTasks(t)
    setSelected(new Set())
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleUnarchive = async (id: number) => {
    await window.electronAPI.unarchiveTask(id)
    loadData()
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map(t => t.id)))
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} archived task(s)? This cannot be undone.`)) return
    for (const id of selected) await window.electronAPI.deleteTask(id)
    loadData()
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    const date = new Date(d)
    const today = new Date()
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Archived Tasks
          {tasks.length > 0 && (
            <span className="text-sm ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {tasks.length}
            </span>
          )}
        </h1>
        {selected.size > 0 && (
          <button onClick={handleDeleteSelected} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
            Delete Selected ({selected.size})
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No archived tasks.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderBottomColor: 'var(--border)' }} className="border-b">
                <th className="text-left py-3 px-4 w-10">
                  <input type="checkbox" checked={selected.size === tasks.length} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Priority</th>
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-left py-3 px-4">Assigned To</th>
                <th className="text-left py-3 px-4">Due Date</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 px-4">
                    <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} className="rounded" />
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{task.name}</td>
                  <td className="py-3 px-4">{task.statusName}</td>
                  <td className="py-3 px-4 font-medium" style={{ color: task.priorityColor || 'var(--text-secondary)' }}>{task.priorityName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{task.projectName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{task.assignedToName || '—'}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                    {task.dueDate ? formatDate(task.dueDate) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => handleUnarchive(task.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
