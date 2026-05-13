import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'
import { parseDateFromText } from '../utils/dateParser'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Quick Add state
  const [quickName, setQuickName] = useState('')
  const [quickStatus, setQuickStatus] = useState(0)
  const [quickPriority, setQuickPriority] = useState(0)
  const [quickProject, setQuickProject] = useState(0)
  const [quickAssignedTo, setQuickAssignedTo] = useState(0)
  const [parsedDueDate, setParsedDueDate] = useState<string | null>(null)

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
    if (quickStatus === 0 && s.length > 0) setQuickStatus(s[0].id)
    if (quickPriority === 0 && p.length > 0) setQuickPriority(p[1]?.id ?? p[0].id)
    if (quickProject === 0 && pr.length > 0) setQuickProject(pr[0].id)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const byStatus = (name: string) => tasks.filter(t => t.statusName === name).length
  const byPriority = (name: string) => tasks.filter(t => t.priorityName === name).length
  const totalTasks = tasks.length
  const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date(new Date().toDateString())).length

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

  // Calendar helpers
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const tasksByDate: Record<string, TaskWithRelations[]> = {}
  tasks.filter(t => t.dueDate).forEach(t => {
    if (!tasksByDate[t.dueDate!]) tasksByDate[t.dueDate!] = []
    tasksByDate[t.dueDate!].push(t)
  })

  const statusColors = ['var(--accent)', 'var(--warning)', 'var(--high)', 'var(--success)']
  const maxStatusCount = Math.max(1, ...statuses.map(s => byStatus(s.name)))

  // Quick Add handlers
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

  // Edit handlers
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

  const handleArchive = async (id: number) => {
    await window.electronAPI.archiveTask(id)
    loadData()
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
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Tasks', value: totalTasks, color: 'var(--text-primary)' },
          { label: 'Overdue', value: overdueTasks, color: 'var(--danger)' },
          ...statuses.map(s => ({ label: s.name, value: byStatus(s.name), color: 'var(--text-primary)' })),
        ].map(card => (
          <div key={card.label} className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Bar chart - Tasks by Status */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tasks by Status</h2>
          <svg width="100%" height="180" viewBox="0 0 400 180">
            {statuses.map((s, i) => {
              const count = byStatus(s.name)
              const barWidth = count / maxStatusCount * 280
              return (
                <g key={s.id}>
                  <text x="0" y={i * 36 + 24} fontSize="12" fill="var(--text-secondary)">{s.name}</text>
                  <rect x="100" y={i * 36 + 10} width={Math.max(barWidth, 4)} height="20" rx="4" fill={statusColors[i % statusColors.length]} opacity="0.8" />
                  <text x={100 + Math.max(barWidth, 4) + 6} y={i * 36 + 24} fontSize="12" fill="var(--text-primary)" fontWeight="600">{count}</text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Pie chart - Tasks by Priority */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tasks by Priority</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie data={priorities.map(p => ({ name: p.name, value: byPriority(p.name), color: p.color || '#a6adc8' }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {priorities.map((p, i) => <Cell key={i} fill={p.color || '#a6adc8'} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {priorities.map(p => {
                const count = byPriority(p.name)
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color || 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add */}
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Add Task</h2>
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
            <select value={quickStatus} onChange={e => setQuickStatus(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Priority</label>
            <select value={quickPriority} onChange={e => setQuickPriority(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Project</label>
            <select value={quickProject} onChange={e => setQuickProject(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Assign To</label>
            <select value={quickAssignedTo} onChange={e => setQuickAssignedTo(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value={0}>Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button onClick={handleQuickAdd}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            Add
          </button>
        </div>
      </div>

      {/* Calendar view — 50/50 split */}
      {(() => {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDayOfWeek = new Date(year, month, 1).getDay()
        const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

        const tasksByDate: Record<string, TaskWithRelations[]> = {}
        tasks.filter(t => t.dueDate).forEach(t => {
          if (!tasksByDate[t.dueDate!]) tasksByDate[t.dueDate!] = []
          tasksByDate[t.dueDate!].push(t)
        })

        const selectedTasks = selectedDate ? tasksByDate[selectedDate] || [] : []

        return (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex gap-6">
              {/* Left 50% — Calendar */}
              <div className="w-1/2">
                <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{monthName}</h2>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-xs py-1 font-semibold" style={{ color: 'var(--text-muted)' }}>{d}</div>
                  ))}
                  {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayTasks = tasksByDate[dateStr] || []
                    const isToday = day === now.getDate()
                    const isSelected = dateStr === selectedDate
                    const hasOverdue = dayTasks.some(t => isOverdue(t.dueDate))

                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                        className="rounded-lg p-1.5 text-xs relative cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'var(--accent)' : isToday ? 'var(--bg-hover)' : 'transparent',
                          border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                        }}
                      >
                        <span style={{
                          color: isSelected ? '#fff' : isToday ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: isToday ? 700 : 400,
                        }}>
                          {day}
                        </span>
                        {dayTasks.length > 0 && (
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {dayTasks.slice(0, 3).map(t => (
                              <span key={t.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : hasOverdue ? 'var(--danger)' : 'var(--accent)' }} />
                            ))}
                            {dayTasks.length > 3 && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{dayTasks.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right 50% — Selected day tasks */}
              <div className="w-1/2 border-l pl-6" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
                    : 'Select a day'}
                </h2>
                {selectedTasks.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selectedDate ? 'No tasks due this day.' : 'Click a date on the calendar to see tasks.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedTasks.map(task => (
                      <div key={task.id} className="rounded-lg p-3 border text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{task.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap" style={{
                            backgroundColor: task.priorityName === 'Critical' ? 'var(--critical)' :
                              task.priorityName === 'High' ? 'var(--high)' :
                              task.priorityName === 'Medium' ? 'var(--medium)' : 'var(--low)',
                            color: '#1e1e2e',
                          }}>
                            {task.priorityName}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span>{task.statusName}</span>
                          <span>{task.projectName}</span>
                          {task.assignedToName && <span>👤 {task.assignedToName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Recent tasks */}
      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Recent Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No tasks yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Priority</th>
                <th className="text-left py-2">Project</th>
                <th className="text-left py-2">Assigned To</th>
                <th className="text-left py-2">Due</th>
                <th className="text-left py-2">%</th>
                <th className="text-right py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 8).map(task => (
                <tr
                  key={task.id}
                  className="border-b cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => openEdit(task)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td className="py-2" style={{ color: 'var(--text-primary)' }}>{task.name}</td>
                  <td className="py-2 max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                    <span className="truncate block">{task.description || '—'}</span>
                  </td>
                  <td className="py-2">{task.statusName}</td>
                  <td className="py-2">{task.priorityName}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{task.projectName}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{task.assignedToName || '—'}</td>
                  <td className="py-2" style={{
                    color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-secondary)',
                    fontWeight: isOverdue(task.dueDate) ? 600 : 400,
                  }}>
                    {formatDate(task.dueDate) || '—'}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.completionPercent}%</span>
                      <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <div className="h-full rounded-full" style={{ width: `${task.completionPercent}%`, backgroundColor: task.completionPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-right space-x-1">
                    {task.assignedToEmail && (
                      <a href={`mailto:${task.assignedToEmail}?subject=${encodeURIComponent(task.name)}&body=${encodeURIComponent(task.description || '')}`}
                        onClick={e => e.stopPropagation()} className="text-xs" style={{ color: 'var(--accent)' }} title="Email assigned user">📧</a>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleArchive(task.id) }}
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                      title="Archive"
                    >
                      📦
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
