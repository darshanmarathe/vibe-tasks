import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'
import { parseDateFromText } from '../utils/dateParser'
import { useTimer } from '../contexts/TimerContext'
import { TimerBadge, formatElapsedShort } from '../components/TimerBadge'

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const { runningEntry, elapsed, startTimer, stopTimer } = useTimer()
  const [taskTimes, setTaskTimes] = useState<Map<number, number>>(new Map())
  const [quickName, setQuickName] = useState('')
  const [quickStatus, setQuickStatus] = useState(0)
  const [quickPriority, setQuickPriority] = useState(0)
  const [quickProject, setQuickProject] = useState(0)
  const [quickAssignedTo, setQuickAssignedTo] = useState(0)
  const [parsedDueDate, setParsedDueDate] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState(0)
  const [filterPriority, setFilterPriority] = useState(0)
  const [filterProject, setFilterProject] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())

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
  const [editPredecessorIds, setEditPredecessorIds] = useState<number[]>([])
  const [editSuccessorIds, setEditSuccessorIds] = useState<number[]>([])
  const [showDepPicker, setShowDepPicker] = useState<'predecessor' | 'successor' | null>(null)
  const [depSearch, setDepSearch] = useState('')

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
    if (quickStatus === 0 && s.length > 0) setQuickStatus(s[0].id)
    if (quickPriority === 0 && p.length > 0) setQuickPriority(p[1]?.id ?? p[0].id)
    if (quickProject === 0 && pr.length > 0) setQuickProject(pr[0].id)
  }, [])

  const loadTaskTimes = useCallback(async (taskList: TaskWithRelations[]) => {
    const entries = await Promise.all(
      taskList.map(t => window.electronAPI.getTaskTime(t.id).then(secs => [t.id, secs] as [number, number]))
    )
    setTaskTimes(new Map(entries))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (tasks.length > 0) loadTaskTimes(tasks)
  }, [tasks.length])

  const handleNameChange = (val: string) => {
    setQuickName(val)
    const result = parseDateFromText(val)
    setParsedDueDate(result.dueDate)
  }

  const handleQuickAdd = async () => {
    if (!quickName.trim()) return
    const { cleaned, dueDate } = parseDateFromText(quickName)
    const sid = quickStatus || statuses[0]?.id || 1
    const pid = quickPriority || priorities[0]?.id || 1
    const prid = quickProject || projects[0]?.id || 1
    await window.electronAPI.createTask({
      name: cleaned,
      description: '',
      notes: '',
      dueDate: dueDate,
      statusId: sid,
      priorityId: pid,
      projectId: prid,
      predecessorIds: '[]',
      successorIds: '[]',
      archived: 0,
      assignedTo: quickAssignedTo || null,
      completionPercent: 0,
    })
    setQuickName('')
    setParsedDueDate(null)
    loadData()
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
    setEditPredecessorIds(JSON.parse(task.predecessorIds || '[]'))
    setEditSuccessorIds(JSON.parse(task.successorIds || '[]'))
    setShowMarkdownPreview(false)
  }

  const closeEdit = () => {
    setEditingTask(null)
    setShowDepPicker(null)
  }

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
      predecessorIds: JSON.stringify(editPredecessorIds),
      successorIds: JSON.stringify(editSuccessorIds),
    })
    closeEdit()
    loadData()
  }

  const filteredTasks = tasks.filter(t => {
    if (filterStatus && t.statusId !== filterStatus) return false
    if (filterPriority && t.priorityId !== filterPriority) return false
    if (filterProject && t.projectId !== filterProject) return false
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Group tasks by project
  const tasksByProject = new Map<number, { projectName: string; tasks: TaskWithRelations[] }>()
  for (const task of filteredTasks) {
    if (!tasksByProject.has(task.projectId)) {
      tasksByProject.set(task.projectId, { projectName: task.projectName, tasks: [] })
    }
    tasksByProject.get(task.projectId)!.tasks.push(task)
  }
  const sortedProjects = projects.filter(p => tasksByProject.has(p.id))

  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  // Auto-expand all projects on first load
  useEffect(() => {
    if (projects.length > 0 && expandedProjects.size === 0) {
      setExpandedProjects(new Set(projects.filter(p => tasksByProject.has(p.id)).map(p => p.id)))
    }
  }, [projects.length])

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

  // Simple markdown renderer
  function renderMarkdown(text: string): string {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-2 mb-1">$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1">$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1">$1</h1>')
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    html = html.replace(/`(.+?)`/g, '<code class="text-xs px-1 rounded" style="background:var(--bg-hover)">$1</code>')
    html = html.replace(/\n/g, '<br>')
    return html
  }

  // Dependency picker
  const availableForDep = tasks.filter(t => t.id !== editingTask?.id)
  const depSearchLower = depSearch.toLowerCase()
  const filteredDepTasks = depSearch
    ? availableForDep.filter(t => t.name.toLowerCase().includes(depSearchLower) || t.projectName.toLowerCase().includes(depSearchLower))
    : availableForDep

  function toggleDepId(id: number, mode: 'predecessor' | 'successor') {
    const setter = mode === 'predecessor' ? setEditPredecessorIds : setEditSuccessorIds
    const current = mode === 'predecessor' ? editPredecessorIds : editSuccessorIds
    if (current.includes(id)) {
      setter(current.filter(x => x !== id))
    } else {
      setter([...current, id])
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>

      {/* Quick Add */}
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Task Name</label>
            <input
              value={quickName}
              onChange={e => handleNameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
              placeholder="Quick add a task... (try: 'do this tomorrow')"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {parsedDueDate && (
              <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>
                Due: {formatDate(parsedDueDate)}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Status</label>
            <select
              value={quickStatus}
              onChange={e => setQuickStatus(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Priority</label>
            <select
              value={quickPriority}
              onChange={e => setQuickPriority(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Project</label>
            <select
              value={quickProject}
              onChange={e => setQuickProject(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Assign To</label>
            <select
              value={quickAssignedTo}
              onChange={e => setQuickAssignedTo(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value={0}>Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleQuickAdd}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
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
        <select
          value={filterProject}
          onChange={e => setFilterProject(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <option value={0}>All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Tree Grid — grouped by project */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderBottomColor: 'var(--border)' }} className="border-b">
              <th className="text-left py-3 px-4 w-8"></th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Priority</th>
              <th className="text-left py-3 px-4">Project</th>
              <th className="text-left py-3 px-4">Assigned To</th>
              <th className="text-left py-3 px-4">Due Date</th>
              <th className="text-left py-3 px-4">%</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedProjects.map(project => {
              const group = tasksByProject.get(project.id)!
              const isExpanded = expandedProjects.has(project.id)
              return (
                <tr key={`project-${project.id}`} style={{ backgroundColor: 'var(--bg-hover)' }}>
                  <td colSpan={9} className="py-0">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr
                          className="cursor-pointer transition-colors"
                          style={{ backgroundColor: 'var(--bg-hover)' }}
                          onClick={() => toggleProject(project.id)}
                        >
                          <td className="py-2 px-4 w-8 text-center" style={{ color: 'var(--text-muted)' }}>
                            {isExpanded ? '▼' : '▶'}
                          </td>
                          <td className="py-2 px-4 font-semibold" style={{ color: 'var(--text-primary)' }} colSpan={8}>
                            {group.projectName}
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                              {group.tasks.length}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right"></td>
                        </tr>
                        {isExpanded && group.tasks.map(task => (
                          <tr
                            key={task.id}
                            className="border-t cursor-pointer transition-colors"
                            style={{ borderColor: 'var(--border)', borderTopWidth: '0.5px', borderLeft: `3px solid ${task.priorityColor || 'var(--text-muted)'}` }}
                            onClick={() => openEdit(task)}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td className="py-2.5 px-4 w-8"></td>
                            <td className="py-2.5 px-4" style={{ color: 'var(--text-primary)' }}>{task.name}</td>
                            <td className="py-2.5 px-4">{task.statusName}</td>
                            <td className="py-2.5 px-4 font-medium" style={{ color: task.priorityColor || 'var(--text-secondary)' }}>
                              {task.priorityName}
                            </td>
                            <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{task.projectName}</td>
                            <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                              {task.assignedToName ? (
                                <span>{task.assignedToName} {task.assignedToEmail && (
                                  <a href={`mailto:${task.assignedToEmail}?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                                    onClick={e => e.stopPropagation()} style={{ color: 'var(--accent)' }} title="Email assigned user">📧</a>
                                )}</span>
                              ) : '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              {task.dueDate ? (
                                <span style={{
                                  color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-secondary)',
                                  fontWeight: isOverdue(task.dueDate) ? 600 : 400,
                                }}>
                                  {formatDate(task.dueDate)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.completionPercent}%</span>
                                <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${task.completionPercent}%`, backgroundColor: task.completionPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                {/* Logged time badge */}
                                {(taskTimes.get(task.id) ?? 0) > 0 && (
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    🔥 {formatElapsedShort(taskTimes.get(task.id)!)}
                                  </span>
                                )}
                                {/* Timer button */}
                                {runningEntry?.task_id === task.id ? (
                                  <div className="flex items-center gap-1">
                                    <TimerBadge elapsed={elapsed} />
                                    <button
                                      onClick={() => stopTimer()}
                                      className="text-xs px-1.5 py-0.5 rounded transition-colors"
                                      style={{ color: 'var(--danger)', backgroundColor: 'var(--bg-hover)' }}
                                      title="Stop timer"
                                    >
                                      ⏹
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => startTimer(task.id)}
                                    className="text-xs px-1.5 py-0.5 rounded transition-colors"
                                    style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                                    title="Start timer"
                                  >
                                    ▶
                                  </button>
                                )}
                                <button
                                  onClick={() => handleArchive(task.id)}
                                  className="text-xs"
                                  style={{ color: 'var(--text-muted)' }}
                                  title="Archive"
                                >
                                  📦
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )
            })}
            {sortedProjects.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No tasks found.</td>
              </tr>
            )}
          </tbody>
        </table>
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
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Completion: {editCompletionPercent}%</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="100" step="5" value={editCompletionPercent}
                    onChange={e => setEditCompletionPercent(Number(e.target.value))}
                    className="flex-1" style={{ accentColor: 'var(--accent)' }} />
                  <div className="w-20 h-2 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${editCompletionPercent}%`, backgroundColor: editCompletionPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
                  </div>
                </div>
              </div>

              {/* Notes with Markdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Notes (Markdown)</label>
                  <button
                    onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                    className="text-xs px-2 py-0.5 rounded transition-colors"
                    style={{ backgroundColor: showMarkdownPreview ? 'var(--accent)' : 'var(--bg-hover)', color: showMarkdownPreview ? '#fff' : 'var(--text-secondary)' }}
                  >
                    {showMarkdownPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>
                {showMarkdownPreview ? (
                  <div
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px] prose prose-sm"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(editNotes) }}
                  />
                ) : (
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Write notes in Markdown...&#10;&#10;## Heading&#10;Regular text with **bold** and *italic*&#10;- List item&#10;`code`"
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px] resize-y"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                )}
              </div>

              {/* Dependencies */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Dependencies</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Predecessors</span>
                      <button
                        onClick={() => { setShowDepPicker('predecessor'); setDepSearch('') }}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}
                      >
                        + Add
                      </button>
                    </div>
                    <div className="min-h-[32px] border rounded-lg p-1.5 text-xs space-y-1" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                      {editPredecessorIds.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      ) : (
                        editPredecessorIds.map(id => {
                          const t = tasks.find(x => x.id === id)
                          return (
                            <div key={id} className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
                              <span style={{ color: 'var(--text-primary)' }}>{t?.name || `#${id}`}</span>
                              <button onClick={() => toggleDepId(id, 'predecessor')} className="text-xs" style={{ color: 'var(--danger)' }}>✕</button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Successors</span>
                      <button
                        onClick={() => { setShowDepPicker('successor'); setDepSearch('') }}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}
                      >
                        + Add
                      </button>
                    </div>
                    <div className="min-h-[32px] border rounded-lg p-1.5 text-xs space-y-1" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                      {editSuccessorIds.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      ) : (
                        editSuccessorIds.map(id => {
                          const t = tasks.find(x => x.id === id)
                          return (
                            <div key={id} className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>
                              <span style={{ color: 'var(--text-primary)' }}>{t?.name || `#${id}`}</span>
                              <button onClick={() => toggleDepId(id, 'successor')} className="text-xs" style={{ color: 'var(--danger)' }}>✕</button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeEdit} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Picker Modal */}
      {showDepPicker && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-4 border w-full max-w-lg max-h-[60vh] flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {showDepPicker === 'predecessor' ? 'Select Predecessors' : 'Select Successors'}
              </h3>
              <button onClick={() => setShowDepPicker(null)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <input
              value={depSearch}
              onChange={e => setDepSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full border rounded-lg px-3 py-1.5 text-sm mb-3"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredDepTasks.map(t => {
                const selected = showDepPicker === 'predecessor'
                  ? editPredecessorIds.includes(t.id)
                  : editSuccessorIds.includes(t.id)
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleDepId(t.id, showDepPicker)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm"
                    style={{
                      backgroundColor: selected ? 'var(--bg-hover)' : 'transparent',
                      borderLeft: `3px solid ${t.priorityColor || 'var(--text-muted)'}`,
                    }}
                  >
                    <input type="checkbox" checked={selected} readOnly className="rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {t.projectName} · {t.statusName} · {t.priorityName}
                      </p>
                    </div>
                  </div>
                )
              })}
              {filteredDepTasks.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
              )}
            </div>
            <button
              onClick={() => setShowDepPicker(null)}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold self-end"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
