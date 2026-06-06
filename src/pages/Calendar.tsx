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
                <div className={`text-xs font-semibold mb-1 ${isToday ? 'flex items-center justify-center w-6 h-6 rounded-full' : ''}`}
                  style={{
                    color: isToday ? '#fff' : isWeekend ? 'var(--text-muted)' : 'var(--text-primary)',
                    backgroundColor: isToday ? 'var(--accent)' : 'transparent',
                  }}
                >
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 4).map(task => (
                    <button key={task.id} onClick={() => openEdit(task)}
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
        editRecurrenceType={editRecurrenceType} setEditRecurrenceType={setEditRecurrenceType}
        editRecurrenceInterval={editRecurrenceInterval} setEditRecurrenceInterval={setEditRecurrenceInterval}
        editRecurrenceDaysOfWeek={editRecurrenceDaysOfWeek} setEditRecurrenceDaysOfWeek={setEditRecurrenceDaysOfWeek}
        editRecurrenceEndDate={editRecurrenceEndDate} setEditRecurrenceEndDate={setEditRecurrenceEndDate}
        editRecurrenceCount={editRecurrenceCount} setEditRecurrenceCount={setEditRecurrenceCount}
      />
    </div>
  )
}
