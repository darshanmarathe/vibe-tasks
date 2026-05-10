import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status } from '../types/models'

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [draggedTask, setDraggedTask] = useState<TaskWithRelations | null>(null)

  const loadData = useCallback(async () => {
    const [t, s] = await Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getStatuses(),
    ])
    setTasks(t)
    setStatuses(s)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDragStart = (task: TaskWithRelations) => {
    setDraggedTask(task)
  }

  const handleDrop = async (statusId: number) => {
    if (!draggedTask || draggedTask.statusId === statusId) return
    await window.electronAPI.updateTask(draggedTask.id, { statusId })
    setDraggedTask(null)
    loadData()
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'var(--critical)'
      case 'High': return 'var(--high)'
      case 'Medium': return 'var(--medium)'
      case 'Low': return 'var(--low)'
      default: return 'var(--text-secondary)'
    }
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

  const isOverdue = (d: string | null) => {
    if (!d) return false
    return new Date(d) < new Date(new Date().toDateString())
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Kanban Board</h1>

      <div className="flex gap-4 h-[calc(100vh-160px)] overflow-x-auto">
        {statuses.map(status => {
          const columnTasks = tasks.filter(t => t.statusId === status.id)

          return (
            <div
              key={status.id}
              className="flex-1 min-w-[250px] rounded-xl border flex flex-col"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              onDragOver={e => { e.preventDefault() }}
              onDrop={() => handleDrop(status.id)}
            >
              <div className="px-4 py-3 border-b font-semibold text-sm flex items-center justify-between" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <span>{status.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {columnTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    className="rounded-lg p-3 border cursor-grab active:cursor-grabbing transition-colors"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColor(task.priorityName) }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{task.priorityName}</span>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.name}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{task.projectName}</p>
                    {task.dueDate && (
                      <p className="text-xs mt-1" style={{
                        color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-muted)',
                        fontWeight: isOverdue(task.dueDate) ? 600 : 400,
                      }}>
                        {isOverdue(task.dueDate) ? '⚠ ' : ''}{formatDate(task.dueDate)}
                      </p>
                    )}
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
