import { useEffect, useState, useCallback } from 'react'
import TaskEditModal from '../components/TaskEditModal'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'
import { formatElapsedShort, TimerBadge } from '../components/TimerBadge'
import { useTimer } from '../contexts/TimerContext'

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
  const [filterStatuses, setFilterStatuses] = useState<Set<number>>(new Set())
  const [filterPriorities, setFilterPriorities] = useState<Set<number>>(new Set())
  const [filterProjects, setFilterProjects] = useState<Set<number>>(new Set())
  const [filterOverdue, setFilterOverdue] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [taskTimes, setTaskTimes] = useState<Map<number, number>>(new Map())
  const { runningEntry, elapsed, startTimer, stopTimer } = useTimer()

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
    const times = await Promise.all(
      t.map((task: TaskWithRelations) => window.electronAPI.getTaskTime(task.id).then(secs => [task.id, secs] as [number, number]))
    )
    setTaskTimes(new Map(times))
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
    if (filterStatuses.size > 0 && !filterStatuses.has(t.statusId)) return false
    if (filterPriorities.size > 0 && !filterPriorities.has(t.priorityId)) return false
    if (filterProjects.size > 0 && !filterProjects.has(t.projectId)) return false
    if (filterOverdue && !isOverdue(t.dueDate)) return false
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
      {openDropdown && <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />}
      <div className="flex gap-3 relative z-20">
        {/* Status multi-select */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            className="border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            {filterStatuses.size === 0 ? 'All Statuses' : `${filterStatuses.size} selected`}
          </button>
          {openDropdown === 'status' && (
            <div className="absolute top-full left-0 mt-1 rounded-lg border p-2 min-w-[180px] shadow-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              {statuses.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <input type="checkbox" checked={filterStatuses.has(s.id)}
                    onChange={() => toggleSet(setFilterStatuses, s.id)}
                    className="rounded" style={{ accentColor: 'var(--accent)' }} />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Priority multi-select */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
            className="border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            {filterPriorities.size === 0 ? 'All Priorities' : `${filterPriorities.size} selected`}
          </button>
          {openDropdown === 'priority' && (
            <div className="absolute top-full left-0 mt-1 rounded-lg border p-2 min-w-[180px] shadow-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              {priorities.map(p => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <input type="checkbox" checked={filterPriorities.has(p.id)}
                    onChange={() => toggleSet(setFilterPriorities, p.id)}
                    className="rounded" style={{ accentColor: 'var(--accent)' }} />
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Project multi-select */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'project' ? null : 'project')}
            className="border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            {filterProjects.size === 0 ? 'All Projects' : `${filterProjects.size} selected`}
          </button>
          {openDropdown === 'project' && (
            <div className="absolute top-full left-0 mt-1 rounded-lg border p-2 min-w-[180px] shadow-lg"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <input type="checkbox" checked={filterProjects.has(p.id)}
                    onChange={() => toggleSet(setFilterProjects, p.id)}
                    className="rounded" style={{ accentColor: 'var(--accent)' }} />
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setFilterOverdue(v => !v)}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: filterOverdue ? 'var(--danger)' : 'var(--bg-hover)',
            color: filterOverdue ? '#fff' : 'var(--text-secondary)',
          }}>
          {filterOverdue ? '✓ Overdue' : 'Overdue'}
        </button>
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
                    {(taskTimes.get(task.id) ?? 0) > 0 && (
                      <span style={{ color: 'var(--text-muted)' }}>🔥 {formatElapsedShort(taskTimes.get(task.id)!)}</span>
                    )}
                  </div>
                </div>
                {task.assignedToEmail ? (
                  <a href={`mailto:${task.assignedToEmail}?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                    onClick={e => e.stopPropagation()} className="text-xs shrink-0" style={{ color: 'var(--accent)' }} title="Email assigned user">📧</a>
                ) : (
                  <a href={`mailto:?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                    onClick={e => e.stopPropagation()} className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }} title="Email task">📧</a>
                )}
                {runningEntry?.task_id === task.id ? (
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <TimerBadge elapsed={elapsed} />
                    <button onClick={() => stopTimer()} className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--danger)', backgroundColor: 'var(--bg-hover)' }} title="Stop timer">⏹</button>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); startTimer(task.id) }} className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')} title="Start timer">▶</button>
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
                <th className="text-left py-3 px-4">Time</th>
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
                  <td className="py-3 px-4">
                    {(taskTimes.get(task.id) ?? 0) > 0 ? (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🔥 {formatElapsedShort(taskTimes.get(task.id)!)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      {task.assignedToEmail ? (
                        <a href={`mailto:${task.assignedToEmail}?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                          onClick={e => e.stopPropagation()} className="text-xs" style={{ color: 'var(--accent)' }} title="Email assigned user">📧</a>
                      ) : (
                        <a href={`mailto:?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                          onClick={e => e.stopPropagation()} className="text-xs" style={{ color: 'var(--text-muted)' }} title="Email task">📧</a>
                      )}
                      {runningEntry?.task_id === task.id ? (
                        <div className="flex items-center gap-1">
                          <TimerBadge elapsed={elapsed} />
                          <button onClick={() => stopTimer()} className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--danger)', backgroundColor: 'var(--bg-hover)' }} title="Stop timer">⏹</button>
                        </div>
                      ) : (
                        <button onClick={() => startTimer(task.id)} className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')} title="Start timer">▶</button>
                      )}
                      <button onClick={() => handleArchive(task.id)} className="text-xs" style={{ color: 'var(--text-muted)' }} title="Archive">📦</button>
                    </div>
                  </td>
                </tr>
              ))}
              {otherTasks.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskEditModal
        editingTask={editingTask}
        editName={editName} setEditName={setEditName}
        editDesc={editDesc} setEditDesc={setEditDesc}
        editStatus={editStatus} setEditStatus={setEditStatus}
        editPriority={editPriority} setEditPriority={setEditPriority}
        editProject={editProject} setEditProject={setEditProject}
        editAssignedTo={editAssignedTo} setEditAssignedTo={setEditAssignedTo}
        editDueDate={editDueDate} setEditDueDate={setEditDueDate}
        editNotes={editNotes} setEditNotes={setEditNotes}
        editCompletionPercent={editCompletionPercent} setEditCompletionPercent={setEditCompletionPercent}
        showMarkdownPreview={showMarkdownPreview} setShowMarkdownPreview={setShowMarkdownPreview}
        statuses={statuses} priorities={priorities} projects={projects} users={users}
        onClose={closeEdit} onSave={saveEdit}
        renderMarkdown={renderMarkdown}
      />
    </div>
  )
}