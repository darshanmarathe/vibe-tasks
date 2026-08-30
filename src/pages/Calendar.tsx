import { useEffect, useState, useCallback } from 'react'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'
import TaskEditModal from '../components/TaskEditModal'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

export default function Calendar() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())

  // Add task modal state
  const [showAddForDate, setShowAddForDate] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addPriority, setAddPriority] = useState(0)
  const [addProject, setAddProject] = useState(0)
  const [addAssignedTo, setAddAssignedTo] = useState(0)
  const [addDesc, setAddDesc] = useState('')
  const [addRecurrenceType, setAddRecurrenceType] = useState('none')
  const [addRecurrenceInterval, setAddRecurrenceInterval] = useState(1)
  const [addRecurrenceDaysOfWeek, setAddRecurrenceDaysOfWeek] = useState('')
  const [addRecurrenceEndDate, setAddRecurrenceEndDate] = useState('')
  const [addRecurrenceCount, setAddRecurrenceCount] = useState<number | null>(null)

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
  const [editStartDate, setEditStartDate] = useState('')
  const [editDurationDays, setEditDurationDays] = useState(1)
  const [editNotes, setEditNotes] = useState('')
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [editRecurrenceType, setEditRecurrenceType] = useState('none')
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(1)
  const [editRecurrenceDaysOfWeek, setEditRecurrenceDaysOfWeek] = useState('')
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState('')
  const [editRecurrenceCount, setEditRecurrenceCount] = useState<number | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; task: TaskWithRelations } | null>(null)

  const closeContextMenu = () => setContextMenu(null)

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => closeContextMenu()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  const getParentId = (task: TaskWithRelations) => task.recurrence_parent_id || task.id

  const handleDeleteInstance = async (task: TaskWithRelations) => {
    if (!window.confirm(`Delete "${task.name}"?`)) return
    await window.electronAPI.deleteTask(task.id)
    closeContextMenu()
    loadData()
  }

  const handleDeleteParent = async (task: TaskWithRelations) => {
    const parentId = getParentId(task)
    if (!window.confirm(`Delete this recurring task and all its instances?`)) return
    await window.electronAPI.deleteTask(parentId)
    closeContextMenu()
    loadData()
  }

  const handleArchiveInstance = async (task: TaskWithRelations) => {
    if (!window.confirm(`Archive "${task.name}"?`)) return
    await window.electronAPI.updateTask(task.id, { archived: 1 } as any)
    closeContextMenu()
    loadData()
  }

  const handleArchiveParent = async (task: TaskWithRelations) => {
    const parentId = getParentId(task)
    if (!window.confirm(`Archive this recurring task and all its instances?`)) return
    await window.electronAPI.archiveTask(parentId)
    closeContextMenu()
    loadData()
  }

  const loadData = useCallback(async () => {
    const [t, s, p, pr, u] = await Promise.all([
      window.electronAPI.getTasks(false, true),
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

  // Calendar math
  const today = new Date()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()

  const tasksByDate: Record<string, TaskWithRelations[]> = {}
  for (const task of tasks) {
    if (task.dueDate && !task.archived) {
      if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = []
      tasksByDate[task.dueDate].push(task)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const goToday = () => {
    setCurrentMonth(new Date().getMonth())
    setCurrentYear(new Date().getFullYear())
  }

  const openAddPopup = (dateStr: string) => {
    setShowAddForDate(dateStr)
    setAddName(''); setAddDesc(''); setAddPriority(priorities[0]?.id || 0)
    setAddProject(projects[0]?.id || 0); setAddAssignedTo(0)
    setAddRecurrenceType('none'); setAddRecurrenceInterval(1)
    setAddRecurrenceDaysOfWeek(''); setAddRecurrenceEndDate(''); setAddRecurrenceCount(null)
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
    setEditStartDate(task.startDate || '')
    setEditDurationDays(task.durationDays ?? 1)
    setEditNotes(task.notes || '')
    setEditRecurrenceType(task.recurrence_type || 'none')
    setEditRecurrenceInterval(task.recurrence_interval ?? 1)
    setEditRecurrenceDaysOfWeek(task.recurrence_days_of_week || '')
    setEditRecurrenceEndDate(task.recurrence_end_date || '')
    setEditRecurrenceCount(task.recurrence_count ?? null)
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
        startDate: editStartDate || null,
        durationDays: editDurationDays || 1,
      notes: editNotes,
      recurrence_type: editRecurrenceType,
      recurrence_interval: editRecurrenceInterval,
      recurrence_days_of_week: editRecurrenceDaysOfWeek || null,
      recurrence_end_date: editRecurrenceEndDate || null,
      recurrence_count: editRecurrenceCount ?? null,
    })
    closeEdit()
    loadData()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>◀</button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>Today</button>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>▶</button>
        </div>
      </div>

      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{MONTH_NAMES[currentMonth]} {currentYear}</h2>

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the 1st */}
          {Array.from({ length: firstDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayTasks = tasksByDate[dateStr] || []
            const isToday = dateStr === today.toISOString().split('T')[0]
            const isWeekend = new Date(currentYear, currentMonth, day).getDay() === 0 || new Date(currentYear, currentMonth, day).getDay() === 6

            return (
              <div key={day}
                className="min-h-[100px] border-b border-r p-1.5 overflow-y-auto"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: isToday ? 'var(--bg-hover)' : 'transparent',
                }}
              >
                <div onClick={() => openAddPopup(dateStr)}
                  className={`text-xs font-semibold mb-1 cursor-pointer hover:opacity-70 ${isToday ? 'flex items-center justify-center w-6 h-6 rounded-full' : ''}`}
                  style={{
                    color: isToday ? '#fff' : isWeekend ? 'var(--text-muted)' : 'var(--text-primary)',
                    backgroundColor: isToday ? 'var(--accent)' : 'transparent',
                  }}
                  title="Add task on this date"
                >
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 4).map(task => (
                    <button key={task.id} onClick={() => openEdit(task)}
                      onContextMenu={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        setContextMenu({ x: e.clientX, y: e.clientY, task })
                      }}
                      className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: task.priorityColor ? `${task.priorityColor}33` : 'var(--bg-hover)',
                        color: 'var(--text-primary)',
                        borderLeft: `2px solid ${task.priorityColor || 'var(--text-muted)'}`,
                      }}
                      title={task.name}
                    >
                      {task.recurrence_type !== 'none' && <span>🔄 </span>}
                      {task.name}
                    </button>
                  ))}
                  {dayTasks.length > 4 && (
                    <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>+{dayTasks.length - 4} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddForDate !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAddForDate(null)}>
          <div className="rounded-xl p-6 border w-full max-w-lg" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Task</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea value={addDesc} onChange={e => setAddDesc(e.target.value)} rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                  <select value={addPriority} onChange={e => setAddPriority(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Project</label>
                  <select value={addProject} onChange={e => setAddProject(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
                  <input type="date" value={showAddForDate} readOnly
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Assigned To</label>
                  <select value={addAssignedTo} onChange={e => setAddAssignedTo(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    <option value={0}>Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              {/* Recurrence */}
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Recurrence</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={addRecurrenceType} onChange={e => setAddRecurrenceType(e.target.value)}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {addRecurrenceType !== 'none' && (
                    <div>
                      <input type="number" min={1} value={addRecurrenceInterval}
                        onChange={e => setAddRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  )}
                  {addRecurrenceType !== 'none' && (
                    <div className="flex items-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      {addRecurrenceType === 'daily' && 'day(s)'}
                      {addRecurrenceType === 'weekly' && 'week(s)'}
                      {addRecurrenceType === 'monthly' && 'month(s)'}
                      {addRecurrenceType === 'yearly' && 'year(s)'}
                    </div>
                  )}
                </div>
                {addRecurrenceType === 'weekly' && (
                  <div className="flex gap-1 mt-2">
                    {['S','M','T','W','T','F','S'].map((label, i) => {
                      const days = addRecurrenceDaysOfWeek.split(',').filter(Boolean).map(Number)
                      return (
                        <button key={i} onClick={() => {
                          const current = days
                          const next = current.includes(i) ? current.filter(d => d !== i) : [...current, i]
                          setAddRecurrenceDaysOfWeek(next.sort((a,b) => a-b).join(','))
                        }}
                          className="w-8 h-8 rounded-lg text-xs font-semibold transition-colors"
                          style={{
                            backgroundColor: days.includes(i) ? 'var(--accent)' : 'var(--bg-hover)',
                            color: days.includes(i) ? '#fff' : 'var(--text-secondary)',
                          }}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {addRecurrenceType !== 'none' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--text-muted)' }}>End Date</label>
                      <input type="date" value={addRecurrenceEndDate || ''}
                        onChange={e => setAddRecurrenceEndDate(e.target.value || '')}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--text-muted)' }}>Max Occurrences</label>
                      <input type="number" min={0} value={addRecurrenceCount ?? ''}
                        onChange={e => setAddRecurrenceCount(e.target.value ? Number(e.target.value) : 0)}
                        placeholder="∞"
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddForDate(null)}
                className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={async () => {
                if (!addName.trim() || !showAddForDate) return
                 await window.electronAPI.createTask({
                   name: addName.trim(),
                   description: addDesc,
                   notes: '',
                   dueDate: showAddForDate,
                   startDate: showAddForDate,
                   durationDays: 1,
                   statusId: statuses[0]?.id || 1,
                  priorityId: addPriority || priorities[0]?.id || 1,
                  projectId: addProject || projects[0]?.id || 1,
                  predecessorIds: '[]',
                  successorIds: '[]',
                  archived: 0,
                  assignedTo: addAssignedTo || null,
                  completionPercent: 0,
                  recurrence_type: addRecurrenceType,
                  recurrence_interval: addRecurrenceInterval,
                  recurrence_days_of_week: addRecurrenceDaysOfWeek || null,
                  recurrence_end_date: addRecurrenceEndDate || null,
                  recurrence_count: addRecurrenceCount ?? null,
                  recurrence_parent_id: null,
                })
                setShowAddForDate(null)
                loadData()
              }} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1 rounded-lg shadow-xl border min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { openEdit(contextMenu.task); closeContextMenu() }}
            className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
            ✏️ Edit
          </button>
          <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
          <button onClick={() => handleArchiveInstance(contextMenu.task)}
            className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
            📦 Archive Instance
          </button>
          <button onClick={() => handleArchiveParent(contextMenu.task)}
            className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
            📦 Archive All
          </button>
          <button onClick={() => handleDeleteInstance(contextMenu.task)}
            className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
            style={{ color: 'var(--danger)' }}>
            🗑️ Delete Instance
          </button>
          <button onClick={() => handleDeleteParent(contextMenu.task)}
            className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
            style={{ color: 'var(--danger)' }}>
            🗑️ Delete All
          </button>
          <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
          <button onClick={() => {
            const dateStr = contextMenu.task.dueDate
            setShowAddForDate(dateStr)
            setAddName(''); setAddDesc(''); setAddPriority(priorities[0]?.id || 0)
            setAddProject(projects[0]?.id || 0); setAddAssignedTo(0)
            setAddRecurrenceType('none'); setAddRecurrenceInterval(1)
            setAddRecurrenceDaysOfWeek(''); setAddRecurrenceEndDate(''); setAddRecurrenceCount(null)
            closeContextMenu()
          }}
            className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}>
            ➕ New
          </button>
        </div>
      )}

      <TaskEditModal
        editingTask={editingTask}
        editName={editName} setEditName={setEditName}
        editDesc={editDesc} setEditDesc={setEditDesc}
        editStatus={editStatus} setEditStatus={setEditStatus}
        editPriority={editPriority} setEditPriority={setEditPriority}
        editProject={editProject} setEditProject={setEditProject}
        editAssignedTo={editAssignedTo} setEditAssignedTo={setEditAssignedTo}
        editDueDate={editDueDate} setEditDueDate={setEditDueDate}
        editStartDate={editStartDate} setEditStartDate={setEditStartDate}
        editDurationDays={editDurationDays} setEditDurationDays={setEditDurationDays}
        editNotes={editNotes} setEditNotes={setEditNotes}
        editCompletionPercent={editCompletionPercent} setEditCompletionPercent={setEditCompletionPercent}
        showMarkdownPreview={showMarkdownPreview} setShowMarkdownPreview={setShowMarkdownPreview}
        statuses={statuses} priorities={priorities} projects={projects} users={users}
        onClose={closeEdit} onSave={saveEdit}
        renderMarkdown={renderMarkdown}
        editRecurrenceType={editRecurrenceType} setEditRecurrenceType={setEditRecurrenceType}
        editRecurrenceInterval={editRecurrenceInterval} setEditRecurrenceInterval={setEditRecurrenceInterval}
        editRecurrenceDaysOfWeek={editRecurrenceDaysOfWeek} setEditRecurrenceDaysOfWeek={setEditRecurrenceDaysOfWeek}
        editRecurrenceEndDate={editRecurrenceEndDate} setEditRecurrenceEndDate={setEditRecurrenceEndDate}
        editRecurrenceCount={editRecurrenceCount} setEditRecurrenceCount={setEditRecurrenceCount}
      />
    </div>
  )
}
