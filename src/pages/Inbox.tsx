import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'

type SortKey = 'name' | 'statusName' | 'priorityName' | 'projectName' | 'dueDate'
type SortDir = 'asc' | 'desc'

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-2 mb-1" style="color:var(--text-primary)">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1" style="color:var(--text-primary)">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1" style="color:var(--text-primary)">$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/`(.+?)`/g, '<code class="text-xs px-1 rounded" style="background:var(--bg-hover);color:var(--accent)">$1</code>')
  html = html.replace(/\n/g, '<br>')
  return html
}

export default function Inbox() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filterStatus, setFilterStatus] = useState(0)
  const [filterPriority, setFilterPriority] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Edit state
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState(0)
  const [editPriority, setEditPriority] = useState(0)
  const [editProject, setEditProject] = useState(0)
  const [editAssignedTo, setEditAssignedTo] = useState(0)
  const [editCompletionPercent, setEditCompletionPercent] = useState(0)
  const [editDueDate, setEditDueDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)

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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const twoDaysFromNow = new Date(today)
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

  function isInNext2Days(dueDate: string | null) {
    if (!dueDate) return false
    const d = new Date(dueDate); d.setHours(0, 0, 0, 0)
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
  let otherTasks = filteredTasks.filter(t => !isInNext2Days(t.dueDate))

  // Sort
  otherTasks = [...otherTasks].sort((a, b) => {
    let aVal = (a as any)[sortKey] || ''
    let bVal = (b as any)[sortKey] || ''
    if (sortKey === 'dueDate') {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      aVal = a.dueDate; bVal = b.dueDate
    }
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const handleArchive = async (id: number) => {
    if (!window.confirm('Archive this task?')) return
    await window.electronAPI.archiveTask(id)
    loadData()
  }

  const openEdit = (task: TaskWithRelations) => {
    setEditingTask(task)
    setEditName(task.name)
    setEditDesc(task.description || '')
    setEditStatus(task.statusId)
    setEditPriority(task.priorityId)
    setEditProject(task.projectId)
    setEditAssignedTo(task.assignedTo || 0)
    setEditCompletionPercent(task.completionPercent ?? 0)
    setEditDueDate(task.dueDate || '')
    setEditNotes(task.notes || '')
    setShowMarkdownPreview(false)
  }

  const closeEdit = () => setEditingTask(null)

  const saveEdit = async () => {
    if (!editingTask || !editName.trim()) return
    await window.electronAPI.updateTask(editingTask.id, {
      name: editName.trim(),
      description: editDesc,
      statusId: editStatus,
      priorityId: editPriority,
      projectId: editProject,
      assignedTo: editAssignedTo || null,
      completionPercent: editCompletionPercent,
      dueDate: editDueDate || null,
      notes: editNotes,
    })
    closeEdit()
    loadData()
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    const date = new Date(d)
    const dt = new Date()
    const tmrw = new Date(dt); tmrw.setDate(tmrw.getDate() + 1)
    if (date.toDateString() === dt.toDateString()) return 'Today'
    if (date.toDateString() === tmrw.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inbox</h1>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value={0}>All Statuses</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value={0}>All Priorities</option>
          {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--warning)' }}>⏰</span> Due in Next 2 Days
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{upcomingTasks.length}</span>
          </h2>
          <div className="grid gap-2">
            {upcomingTasks.map(task => (
              <div key={task.id} className="rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderLeft: `4px solid ${task.priorityColor || 'var(--text-muted)'}` }}
                onClick={() => openEdit(task)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.name}</p>
                  <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>{task.statusName}</span>
                    <span style={{ color: task.priorityColor }}>{task.priorityName}</span>
                    <span>{task.projectName}</span>
                    {task.assignedToName && <span>👤 {task.assignedToName}</span>}
                    {task.dueDate && <span style={{ color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-secondary)' }}>{formatDate(task.dueDate)}</span>}
                    <span>{task.completionPercent}%</span>
                  </div>
                </div>
                {task.assignedToEmail ? (
                  <a href={`mailto:${task.assignedToEmail}?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                    onClick={e => e.stopPropagation()} className="text-xs shrink-0" style={{ color: 'var(--accent)' }} title="Email assigned user">📧</a>
                ) : (
                  <a href={`mailto:?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                    onClick={e => e.stopPropagation()} className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }} title="Email task">📧</a>
                )}
                <button onClick={e => { e.stopPropagation(); handleArchive(task.id) }} className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }} title="Archive">📦</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          All Tasks
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{otherTasks.length}</span>
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderBottomColor: 'var(--border)' }} className="border-b">
                <th className="text-left py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('name')} style={{ color: sortKey === 'name' ? 'var(--accent)' : 'inherit' }}>Name{sortArrow('name')}</th>
                <th className="text-left py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('statusName')} style={{ color: sortKey === 'statusName' ? 'var(--accent)' : 'inherit' }}>Status{sortArrow('statusName')}</th>
                <th className="text-left py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('priorityName')} style={{ color: sortKey === 'priorityName' ? 'var(--accent)' : 'inherit' }}>Priority{sortArrow('priorityName')}</th>
                  <th className="text-left py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('projectName')} style={{ color: sortKey === 'projectName' ? 'var(--accent)' : 'inherit' }}>Project{sortArrow('projectName')}</th>
                <th className="text-left py-3 px-4">Assigned To</th>
                <th className="text-left py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('dueDate')} style={{ color: sortKey === 'dueDate' ? 'var(--accent)' : 'inherit' }}>Due{sortArrow('dueDate')}</th>
                <th className="text-left py-3 px-4">%</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {otherTasks.map(task => (
                <tr key={task.id} className="border-b cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--border)', borderLeft: `3px solid ${task.priorityColor || 'var(--text-muted)'}` }}
                  onClick={() => openEdit(task)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{task.name}</td>
                  <td className="py-3 px-4">{task.statusName}</td>
                  <td className="py-3 px-4 font-medium" style={{ color: task.priorityColor || 'var(--text-secondary)' }}>{task.priorityName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{task.projectName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{task.assignedToName || '—'}</td>
                  <td className="py-3 px-4">
                    {task.dueDate ? <span style={{ color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: isOverdue(task.dueDate) ? 600 : 400 }}>{formatDate(task.dueDate)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.completionPercent}%</span>
                      <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <div className="h-full rounded-full" style={{ width: `${task.completionPercent}%`, backgroundColor: task.completionPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {task.assignedToEmail ? (
                      <a href={`mailto:${task.assignedToEmail}?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                        onClick={e => e.stopPropagation()} className="text-xs" style={{ color: 'var(--accent)' }} title="Email assigned user">📧</a>
                    ) : (
                      <a href={`mailto:?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                        onClick={e => e.stopPropagation()} className="text-xs" style={{ color: 'var(--text-muted)' }} title="Email task">📧</a>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleArchive(task.id) }} className="text-xs" style={{ color: 'var(--text-muted)' }} title="Archive">📦</button>
                  </td>
                </tr>
              ))}
              {otherTasks.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 border w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Task</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-y" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                  <select value={editPriority} onChange={e => setEditPriority(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Project</label>
                  <select value={editProject} onChange={e => setEditProject(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
                  <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Assigned To</label>
                  <select value={editAssignedTo} onChange={e => setEditAssignedTo(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    <option value={0}>Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Notes (Markdown)</label>
                  <button onClick={() => setShowMarkdownPreview(!showMarkdownPreview)} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: showMarkdownPreview ? 'var(--accent)' : 'var(--bg-hover)', color: showMarkdownPreview ? '#fff' : 'var(--text-secondary)' }}>
                    {showMarkdownPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>
                {showMarkdownPreview ? (
                  <div className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(editNotes) }} />
                ) : (
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Write notes in Markdown..." className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeEdit} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}