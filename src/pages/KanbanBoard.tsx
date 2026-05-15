import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'

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
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Add task state
  const [addingToColumn, setAddingToColumn] = useState<number | null>(null)
  const [addName, setAddName] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addPriority, setAddPriority] = useState(0)
  const [addProject, setAddProject] = useState(0)
  const [addAssignedTo, setAddAssignedTo] = useState(0)
  const [addDueDate, setAddDueDate] = useState('')

  const loadData = useCallback(async () => {
    const [t, s, p, pr, u] = await Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getStatuses(),
      window.electronAPI.getPriorities(),
      window.electronAPI.getProjects(),
      window.electronAPI.getUsers(),
    ])
    setTasks(t)
    setStatuses(s)
    setPriorities(p)
    setProjects(pr)
    setUsers(u)
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
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    {columnTasks.length}
                  </span>
                  <button
                    onClick={() => {
                      setAddingToColumn(status.id)
                      setAddName(''); setAddDesc(''); setAddPriority(priorities[0]?.id || 0)
                      setAddProject(projects[0]?.id || 0); setAddAssignedTo(0); setAddDueDate('')
                    }}
                    className="text-xs px-2 py-0.5 rounded-full transition-colors"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    title="Add task"
                  >
                    +
                  </button>
                </div>
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
                    {task.assignedToName && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        👤 {task.assignedToName}
                        {task.assignedToEmail && (
                          <a href={`mailto:${task.assignedToEmail}?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                            onClick={e => e.stopPropagation()} className="ml-1" style={{ color: 'var(--accent)' }} title="Email assigned user">📧</a>
                        )}
                      </p>
                    )}
                    {task.dueDate && (
                      <p className="text-xs mt-1" style={{
                        color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-muted)',
                        fontWeight: isOverdue(task.dueDate) ? 600 : 400,
                      }}>
                        {isOverdue(task.dueDate) ? '⚠ ' : ''}{formatDate(task.dueDate)}
                      </p>
                    )}
                    {task.completionPercent > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{task.completionPercent}%</span>
                          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${task.completionPercent}%`, backgroundColor: task.completionPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
                          </div>
                        </div>
                      </div>
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

      {/* Add Task Modal */}
      {addingToColumn !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setAddingToColumn(null)}>
          <div className="rounded-xl p-6 border w-full max-w-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Task</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea value={addDesc} onChange={e => setAddDesc(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-y" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                  <select value={addPriority} onChange={e => setAddPriority(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Project</label>
                  <select value={addProject} onChange={e => setAddProject(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
                  <input type="date" value={addDueDate} onChange={e => setAddDueDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Assigned To</label>
                  <select value={addAssignedTo} onChange={e => setAddAssignedTo(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    <option value={0}>Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setAddingToColumn(null)} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={async () => {
                if (!addName.trim()) return
                await window.electronAPI.createTask({
                  name: addName.trim(),
                  description: addDesc,
                  notes: '',
                  dueDate: addDueDate || null,
                  statusId: addingToColumn,
                  priorityId: addPriority || priorities[0]?.id || 1,
                  projectId: addProject || projects[0]?.id || 1,
                  predecessorIds: '[]',
                  successorIds: '[]',
                  archived: 0,
                  assignedTo: addAssignedTo || null,
                  completionPercent: 0,
                })
                setAddingToColumn(null)
                loadData()
              }} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setDetailTask(null)}>
          <div className="rounded-xl p-6 border w-full max-w-lg max-h-[80vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{detailTask.name}</h2>
              <button onClick={() => setDetailTask(null)} className="text-sm" style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>

            {detailTask.description && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{detailTask.description}</p>
            )}

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
              {detailTask.assignedToName && (
                <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  👤 {detailTask.assignedToName}
                </span>
              )}
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

            {/* Completion */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Completion</label>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{detailTask.completionPercent}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" step="5" value={detailTask.completionPercent}
                  onChange={async (e) => {
                    const val = Number(e.target.value)
                    await window.electronAPI.updateTask(detailTask.id, { completionPercent: val })
                    setDetailTask({ ...detailTask, completionPercent: val })
                    loadData()
                  }}
                  className="w-full"
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>
              <div className="mt-1 h-2 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${detailTask.completionPercent}%`, backgroundColor: detailTask.completionPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              {detailTask.assignedToEmail && (
                <a href={`mailto:${detailTask.assignedToEmail}?subject=${encodeURIComponent(detailTask.name)}&body=${encodeURIComponent(detailTask.description || '')}`}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                  title="Email assigned user">📧 Email</a>
              )}
              <button
                onClick={async (e) => { e.stopPropagation(); if (!window.confirm('Archive this task?')) return; await window.electronAPI.archiveTask(detailTask.id); setDetailTask(null); loadData() }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              >
                📦 Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
