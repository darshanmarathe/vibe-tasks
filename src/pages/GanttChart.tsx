import { useState, useCallback, useEffect } from 'react'
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import type { TaskWithRelations, Status, Priority, Project } from '../types/models'
import TaskEditModal from '../components/TaskEditModal'

const VIEW_MODES = [
  { mode: ViewMode.Hour, label: 'Hour' },
  { mode: ViewMode.Day, label: 'Day' },
  { mode: ViewMode.Week, label: 'Week' },
  { mode: ViewMode.Month, label: 'Month' },
  { mode: ViewMode.Year, label: 'Year' },
]

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`(.+?)`/g, '<code class="text-xs px-1 rounded" style="background:var(--bg-hover)">$1</code>')
  return html
}

function prioColor(p: Priority | undefined): string {
  return p?.color || 'var(--accent)'
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function parseDate(s: string | null, fallback: Date): Date {
  if (!s) return fallback
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? fallback : d
}

export default function GanttChart() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const [selectedProjects, setSelectedProjects] = useState<number[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState(0)
  const [editPriority, setEditPriority] = useState(0)
  const [editProject, setEditProject] = useState(0)
  const [editAssignedTo, setEditAssignedTo] = useState(0)
  const [editDueDate, setEditDueDate] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editDurationDays, setEditDurationDays] = useState(1)
  const [editNotes, setEditNotes] = useState('')
  const [editCompletionPercent, setEditCompletionPercent] = useState(0)
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)

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
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openEdit = (task: TaskWithRelations) => {
    setEditingTask(task)
    setEditName(task.name)
    setEditDesc(task.description)
    setEditStatus(task.statusId)
    setEditPriority(task.priorityId)
    setEditProject(task.projectId)
    setEditAssignedTo(task.assignedTo || 0)
    setEditDueDate(task.dueDate || '')
    setEditStartDate(task.startDate || '')
    setEditDurationDays(task.durationDays ?? 1)
    setEditNotes(task.notes)
    setEditCompletionPercent(task.completionPercent)
    setShowMarkdownPreview(false)
  }

  const saveEdit = async () => {
    if (!editingTask) return
    await window.electronAPI.updateTask(editingTask.id, {
      name: editName,
      description: editDesc,
      statusId: editStatus,
      priorityId: editPriority,
      projectId: editProject,
      assignedTo: editAssignedTo || null,
      dueDate: editDueDate || null,
      startDate: editStartDate || null,
      durationDays: editDurationDays || 1,
      notes: editNotes,
      completionPercent: editCompletionPercent,
    })
    setEditingTask(null)
    loadData()
  }

  const today = new Date()

  const filteredTasks = tasks.filter(t => {
    if (selectedProjects.length > 0 && !selectedProjects.includes(t.projectId)) return false
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.statusId)) return false
    return true
  })

  const toGanttTasks = (taskList: TaskWithRelations[]): GanttTask[] => {
    return taskList.map(t => {
      const start = parseDate(t.startDate, parseDate(t.dueDate, today))
      let end = parseDate(t.dueDate, addDays(start, Math.max((t.durationDays ?? 1) - 1, 0)))
      if (start > end) end = addDays(start, Math.max((t.durationDays ?? 1) - 1, 0))

      const predIds = JSON.parse(t.predecessorIds || '[]') as number[]
      const dependencies = predIds.map(id => String(id))

      const priority = priorities.find(p => p.id === t.priorityId)

      return {
        id: String(t.id),
        name: t.name,
        type: 'task' as const,
        start,
        end,
        progress: t.completionPercent || 0,
        dependencies,
        styles: {
          backgroundColor: prioColor(priority),
          backgroundSelectedColor: prioColor(priority),
          progressColor: 'var(--success, #22c55e)',
          progressSelectedColor: 'var(--success, #22c55e)',
        },
      }
    })
  }

  const ganttTasks = toGanttTasks(filteredTasks)

  const handleDateChange = async (task: GanttTask) => {
    const id = Number(task.id)
    const startStr = task.start.toISOString().slice(0, 10)
    const endStr = task.end.toISOString().slice(0, 10)
    const durDays = Math.max(1, Math.round((task.end.getTime() - task.start.getTime()) / 86400000) + 1)
    await window.electronAPI.updateTask(id, {
      startDate: startStr,
      dueDate: endStr,
      durationDays: durDays,
    })
    loadData()
  }

  const handleProgressChange = async (task: GanttTask) => {
    const id = Number(task.id)
    await window.electronAPI.updateTask(id, {
      completionPercent: Math.round(task.progress),
    })
    loadData()
  }

  const toggleProject = (id: number) => {
    setSelectedProjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleStatus = (id: number) => {
    setSelectedStatuses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const columnWidth = viewMode === ViewMode.Week ? 250 : viewMode === ViewMode.Month ? 300 : 65

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Gantt Chart</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 flex-wrap">
            {VIEW_MODES.map(({ mode, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === mode ? 'var(--accent)' : 'var(--bg-hover)',
                  color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative">
          <details className="group">
            <summary className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer list-none flex items-center gap-1"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              Project {selectedProjects.length > 0 && <span className="rounded-full px-1.5 text-[10px]" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>{selectedProjects.length}</span>}
              <span className="text-[10px]">▾</span>
            </summary>
            <div className="absolute z-20 mt-1 rounded-lg border p-2 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              {selectedProjects.length > 0 && (
                <button onClick={() => setSelectedProjects([])} className="block w-full text-left text-xs px-2 py-1 rounded mb-1" style={{ color: 'var(--danger)' }}>Clear all</button>
              )}
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-[var(--bg-hover)]">
                  <input type="checkbox" checked={selectedProjects.includes(p.id)} onChange={() => toggleProject(p.id)} className="rounded" />
                  <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        <div className="relative">
          <details className="group">
            <summary className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer list-none flex items-center gap-1"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              Status {selectedStatuses.length > 0 && <span className="rounded-full px-1.5 text-[10px]" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>{selectedStatuses.length}</span>}
              <span className="text-[10px]">▾</span>
            </summary>
            <div className="absolute z-20 mt-1 rounded-lg border p-2 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              {selectedStatuses.length > 0 && (
                <button onClick={() => setSelectedStatuses([])} className="block w-full text-left text-xs px-2 py-1 rounded mb-1" style={{ color: 'var(--danger)' }}>Clear all</button>
              )}
              {statuses.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-[var(--bg-hover)]">
                  <input type="checkbox" checked={selectedStatuses.includes(s.id)} onChange={() => toggleStatus(s.id)} className="rounded" />
                  <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        <span className="text-xs self-center" style={{ color: 'var(--text-muted)' }}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={() => setIsEditing(prev => !prev)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: isEditing ? 'var(--success, #22c55e)' : 'var(--bg-hover)',
            color: isEditing ? '#fff' : 'var(--text-secondary)',
          }}>
          {isEditing ? '✓ Editing' : '✎ Edit Mode'}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        {ganttTasks.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks with dates. Set a start date or due date on your tasks to see them on the Gantt chart.</p>
          </div>
        ) : (
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            columnWidth={columnWidth}
            listCellWidth="180px"
            rowHeight={40}
            barCornerRadius={5}
            barFill={70}
            handleWidth={8}
            headerHeight={40}
            ganttHeight={0}
            timeStep={86400000}
            onClick={(task) => {
              const t = tasks.find(x => String(x.id) === task.id)
              if (t) openEdit(t)
            }}
            onDateChange={isEditing ? handleDateChange : undefined}
            onProgressChange={isEditing ? handleProgressChange : undefined}
            barBackgroundColor="var(--accent, #6366f1)"
            barBackgroundSelectedColor="var(--accent, #6366f1)"
            barProgressColor="var(--success, #22c55e)"
            barProgressSelectedColor="var(--success, #22c55e)"
            arrowColor="var(--text-muted, #6b7280)"
            todayColor="rgba(99, 102, 241, 0.15)"
            TooltipContent={({ task: t }) => {
              const tWithRelations = tasks.find(x => String(x.id) === t.id)
              const statusName = tWithRelations?.statusName || ''
              const priorityName = tWithRelations?.priorityName || ''
              const projectName = tWithRelations?.projectName || ''
              const startStr = t.start.toISOString().slice(0, 10)
              const endStr = t.end.toISOString().slice(0, 10)
              return (
                <div style={{ padding: '8px 12px', fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', minWidth: 180 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{startStr} → {endStr}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Progress: {Math.round(t.progress)}%</div>
                  {statusName && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Status: {statusName}</div>}
                  {priorityName && <div style={{ fontSize: 11, color: tWithRelations?.priorityColor || 'var(--text-secondary)' }}>Priority: {priorityName}</div>}
                  {projectName && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Project: {projectName}</div>}
                </div>
              )
            }}
          />
        )}
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
        editStartDate={editStartDate} setEditStartDate={setEditStartDate}
        editDurationDays={editDurationDays} setEditDurationDays={setEditDurationDays}
        editNotes={editNotes} setEditNotes={setEditNotes}
        editCompletionPercent={editCompletionPercent} setEditCompletionPercent={setEditCompletionPercent}
        showMarkdownPreview={showMarkdownPreview} setShowMarkdownPreview={setShowMarkdownPreview}
        statuses={statuses} priorities={priorities} projects={projects} users={[]}
        onClose={() => setEditingTask(null)} onSave={saveEdit}
        renderMarkdown={renderMarkdown}
      />
    </div>
  )
}
