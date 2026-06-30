import { useEffect, useState, useCallback, useRef } from 'react'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'
import { parseDateFromText } from '../utils/dateParser'
import { useTimer } from '../contexts/TimerContext'
import { TimerBadge, formatElapsedShort } from '../components/TimerBadge'
import BulkAddModal from '../components/BulkAddModal'
import TaskEditModal from '../components/TaskEditModal'

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const { runningEntry, elapsed, startTimer, stopTimer } = useTimer()
  const [taskTimes, setTaskTimes] = useState<Map<number, number>>(new Map())
  const quickNameRef = useRef<HTMLInputElement>(null)
  const defaultsSet = useRef(false)
  const [quickName, setQuickName] = useState('')
  const [quickStatus, setQuickStatus] = useState(0)
  const [quickPriority, setQuickPriority] = useState(0)
  const [quickProject, setQuickProject] = useState(0)
  const [quickAssignedTo, setQuickAssignedTo] = useState(0)
  const [parsedDueDate, setParsedDueDate] = useState<string | null>(null)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [filterStatuses, setFilterStatuses] = useState<Set<number>>(new Set())
  const [filterPriorities, setFilterPriorities] = useState<Set<number>>(new Set())
  const [filterProjects, setFilterProjects] = useState<Set<number>>(new Set())
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

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
  const [editRecurrenceType, setEditRecurrenceType] = useState('none')
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(1)
  const [editRecurrenceDaysOfWeek, setEditRecurrenceDaysOfWeek] = useState('')
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState('')
  const [editRecurrenceCount, setEditRecurrenceCount] = useState<number | null>(null)

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
    if (!defaultsSet.current) {
      defaultsSet.current = true
      if (quickStatus === 0 && s.length > 0) setQuickStatus(s[0].id)
      if (quickPriority === 0 && p.length > 0) setQuickPriority(p[1]?.id ?? p[0].id)
      if (quickProject === 0 && pr.length > 0) setQuickProject(pr[0].id)
    }
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
      recurrence_type: 'none',
      recurrence_interval: 1,
      recurrence_days_of_week: null,
      recurrence_end_date: null,
      recurrence_count: null,
      recurrence_parent_id: null,
    })
    setQuickName('')
    setParsedDueDate(null)
    quickNameRef.current?.focus()
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
    setEditRecurrenceType(task.recurrence_type || 'none')
    setEditRecurrenceInterval(task.recurrence_interval ?? 1)
    setEditRecurrenceDaysOfWeek(task.recurrence_days_of_week || '')
    setEditRecurrenceEndDate(task.recurrence_end_date || '')
    setEditRecurrenceCount(task.recurrence_count ?? null)
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
      recurrence_type: editRecurrenceType,
      recurrence_interval: editRecurrenceInterval,
      recurrence_days_of_week: editRecurrenceDaysOfWeek || null,
      recurrence_end_date: editRecurrenceEndDate || null,
      recurrence_count: editRecurrenceCount ?? null,
    })
    closeEdit()
    loadData()
  }

  const filteredTasks = tasks.filter(t => {
    if (filterStatuses.size > 0 && !filterStatuses.has(t.statusId)) return false
    if (filterPriorities.size > 0 && !filterPriorities.has(t.priorityId)) return false
    if (filterProjects.size > 0 && !filterProjects.has(t.projectId)) return false
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



  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>

      {/* Quick Add */}
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Task Name</label>
            <input
              ref={quickNameRef}
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
          <button
            onClick={() => setShowBulkAdd(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            title="Bulk add multiple tasks"
          >
            Bulk Add
          </button>
        </div>
      </div>

      {showBulkAdd && (
        <BulkAddModal
          statuses={statuses}
          priorities={priorities}
          projects={projects}
          users={users}
          defaultStatus={quickStatus}
          defaultPriority={quickPriority}
          defaultProject={quickProject}
          defaultAssignedTo={quickAssignedTo}
          onClose={() => setShowBulkAdd(false)}
          onDone={loadData}
        />
      )}

      {/* Search & Filters */}
      {openDropdown && <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />}
      <div className="flex gap-3 relative z-20">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        {/* Status multi-select */}
        <div className="relative">
          <button onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
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
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
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
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
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
                            <td className="py-2.5 px-4" style={{ color: 'var(--text-primary)' }}>
                              {task.name}
                              {task.recurrence_type && task.recurrence_type !== 'none' && (
                                <span className="ml-1.5 text-xs" title={`Recurring ${task.recurrence_type}`}>🔄</span>
                              )}
                            </td>
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
        editPredecessorIds={editPredecessorIds} setEditPredecessorIds={setEditPredecessorIds}
        editSuccessorIds={editSuccessorIds} setEditSuccessorIds={setEditSuccessorIds}
        showDepPicker={showDepPicker} setShowDepPicker={setShowDepPicker}
        depSearch={depSearch} setDepSearch={setDepSearch}
        allTasks={tasks}
        editRecurrenceType={editRecurrenceType} setEditRecurrenceType={setEditRecurrenceType}
        editRecurrenceInterval={editRecurrenceInterval} setEditRecurrenceInterval={setEditRecurrenceInterval}
        editRecurrenceDaysOfWeek={editRecurrenceDaysOfWeek} setEditRecurrenceDaysOfWeek={setEditRecurrenceDaysOfWeek}
        editRecurrenceEndDate={editRecurrenceEndDate} setEditRecurrenceEndDate={setEditRecurrenceEndDate}
        editRecurrenceCount={editRecurrenceCount} setEditRecurrenceCount={setEditRecurrenceCount}
      />
    </div>
  )
}
