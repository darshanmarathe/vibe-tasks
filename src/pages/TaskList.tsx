import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status, Priority, Project } from '../types/models'
import { parseDateFromText } from '../utils/dateParser'

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [quickName, setQuickName] = useState('')
  const [quickStatus, setQuickStatus] = useState(0)
  const [quickPriority, setQuickPriority] = useState(0)
  const [quickProject, setQuickProject] = useState(0)
  const [parsedDueDate, setParsedDueDate] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState(0)
  const [filterPriority, setFilterPriority] = useState(0)
  const [filterProject, setFilterProject] = useState(0)

  // Edit state
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState(0)
  const [editPriority, setEditPriority] = useState(0)
  const [editProject, setEditProject] = useState(0)
  const [editDueDate, setEditDueDate] = useState('')

  const loadData = useCallback(async () => {
    const [t, s, p, pr] = await Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getStatuses(),
      window.electronAPI.getPriorities(),
      window.electronAPI.getProjects(),
    ])
    setTasks(t)
    setStatuses(s)
    setPriorities(p)
    setProjects(pr)
    if (quickStatus === 0 && s.length > 0) setQuickStatus(s[0].id)
    if (quickPriority === 0 && p.length > 0) setQuickPriority(p[1]?.id ?? p[0].id)
    if (quickProject === 0 && pr.length > 0) setQuickProject(pr[0].id)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleNameChange = (val: string) => {
    setQuickName(val)
    const result = parseDateFromText(val)
    setParsedDueDate(result.dueDate)
  }

  const handleQuickAdd = async () => {
    if (!quickName.trim()) return
    const { cleaned, dueDate } = parseDateFromText(quickName)
    await window.electronAPI.createTask({
      name: cleaned,
      description: '',
      dueDate: dueDate,
      statusId: quickStatus,
      priorityId: quickPriority,
      projectId: quickProject,
    })
    setQuickName('')
    setParsedDueDate(null)
    loadData()
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteTask(id)
    loadData()
  }

  // Edit handlers
  const openEdit = (task: TaskWithRelations) => {
    setEditingTask(task)
    setEditName(task.name)
    setEditStatus(task.statusId)
    setEditPriority(task.priorityId)
    setEditProject(task.projectId)
    setEditDueDate(task.dueDate || '')
  }

  const closeEdit = () => {
    setEditingTask(null)
  }

  const saveEdit = async () => {
    if (!editingTask || !editName.trim()) return
    await window.electronAPI.updateTask(editingTask.id, {
      name: editName.trim(),
      statusId: editStatus,
      priorityId: editPriority,
      projectId: editProject,
      dueDate: editDueDate || null,
    })
    closeEdit()
    loadData()
  }

  const filteredTasks = tasks.filter(t => {
    if (filterStatus && t.statusId !== filterStatus) return false
    if (filterPriority && t.priorityId !== filterPriority) return false
    if (filterProject && t.projectId !== filterProject) return false
    return true
  })

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
          <button
            onClick={handleQuickAdd}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Add
          </button>
        </div>
      </div>

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

      {/* Task Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderBottomColor: 'var(--border)' }} className="border-b">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Priority</th>
              <th className="text-left py-3 px-4">Project</th>
              <th className="text-left py-3 px-4">Due Date</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => (
              <tr
                key={task.id}
                className="border-b cursor-pointer transition-colors"
                style={{ borderColor: 'var(--border)', borderLeft: `3px solid ${task.priorityColor || 'var(--text-muted)'}` }}
                onClick={() => openEdit(task)}
                onMouseEnter={e => { if (!editingTask || editingTask.id !== task.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
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
                      {formatDate(task.dueDate)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(task.id) }}
                    className="text-xs"
                    style={{ color: 'var(--danger)' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>No tasks found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 border w-full max-w-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Task</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
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

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
                <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
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
