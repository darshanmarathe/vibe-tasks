import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status } from '../types/models'

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-2 mb-1" style="color:var(--text-primary)">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1" style="color:var(--text-primary)">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1" style="color:var(--text-primary)">$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc" style="color:var(--text-secondary)">$1</li>')
  html = html.replace(/`(.+?)`/g, '<code class="text-xs px-1 rounded" style="background:var(--bg-hover);color:var(--accent)">$1</code>')
  html = html.replace(/\n/g, '<br>')
  return html
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [draggedTask, setDraggedTask] = useState<TaskWithRelations | null>(null)
  const [detailTask, setDetailTask] = useState<TaskWithRelations | null>(null)

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
                    onClick={() => setDetailTask(task)}
                    className="rounded-lg p-3 border cursor-pointer transition-colors"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.priorityColor || 'var(--text-muted)' }} />
                      <span className="text-xs font-medium" style={{ color: task.priorityColor || 'var(--text-secondary)' }}>{task.priorityName}</span>
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

      {/* Detail Modal */}
      {detailTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setDetailTask(null)}>
          <div className="rounded-xl p-6 border w-full max-w-lg max-h-[80vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{detailTask.name}</h2>
              <button onClick={() => setDetailTask(null)} className="text-sm" style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {detailTask.statusName}
              </span>
              <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: detailTask.priorityColor || 'var(--bg-hover)', color: '#1e1e2e' }}>
                {detailTask.priorityName}
              </span>
              <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {detailTask.projectName}
              </span>
              {detailTask.dueDate && (
                <span className="text-xs px-2 py-1 rounded-md" style={{
                  backgroundColor: 'var(--bg-hover)',
                  color: isOverdue(detailTask.dueDate) ? 'var(--danger)' : 'var(--text-secondary)',
                }}>
                  {isOverdue(detailTask.dueDate) ? '⚠ ' : ''}{formatDate(detailTask.dueDate)}
                </span>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Notes</h3>
              {detailTask.notes ? (
                <div className="rounded-lg border p-3 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(detailTask.notes) }} />
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notes.</p>
              )}
            </div>

            {/* Dependencies */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Predecessors</h3>
                {detailTask.predecessorNames ? (
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{detailTask.predecessorNames}</div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>None</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Successors</h3>
                {detailTask.successorNames ? (
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{detailTask.successorNames}</div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>None</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
