import { useEffect, useState, useCallback, useRef } from 'react'
import Gantt from 'frappe-gantt'
import type { GanttTask, GanttOptions } from 'frappe-gantt'
import type { TaskWithRelations, Status, Priority, Project } from '../types/models'
import TaskEditModal from '../components/TaskEditModal'

const FRAPPE_GANTT_CSS = `
.gantt-container{line-height:14.5px;position:relative;overflow:auto;font-size:12px;height:var(--gv-grid-height);width:100%;border-radius:8px;isolation:isolate}
.gantt .grid-row{fill:var(--gantt-row-bg, var(--bg-secondary))}
.gantt .bar{fill:var(--accent)}
.gantt .bar-progress{fill:var(--success)}
.gantt .bar-label{fill:var(--text-primary);font-size:11px}
.gantt .bar-wrapper .bar{outline:1px solid var(--border)}
.gantt .bar-wrapper{cursor:pointer}
.gantt .arrow{stroke:var(--text-muted);stroke-width:1.5}
.gantt .handle-group circle{opacity:0}
.gantt .grid-column{fill:transparent;pointer-events:all}
.gantt .row-line{stroke:var(--border)}
.gantt .tick{stroke:var(--text-muted)}
.gantt .lower-text,.gantt .upper-text{fill:var(--text-secondary);font-size:11px}
.gantt .today-highlight{fill:var(--accent);opacity:0.15}
.gantt .weekend-highlight{fill:rgba(128,128,128,0.06)}
.gantt .bar-wrapper:hover .bar{opacity:0.85}
.gantt .bar-wrapper.gantt-prio-38B761 .bar{fill:#38B761}
.gantt .bar-wrapper.gantt-prio-F9E2AF .bar{fill:#F9E2AF}
.gantt .bar-wrapper.gantt-prio-FAB387 .bar{fill:#FAB387}
.gantt .bar-wrapper.gantt-prio-F38BA8 .bar{fill:#F38BA8}
.gantt .bar-wrapper.gantt-prio-A6ADC8 .bar{fill:#A6ADC8}
.gantt .popup-wrapper{position:absolute;top:0;left:0;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);padding:10px;z-index:1000;color:var(--text-primary);font-size:13px}
.gantt .popup-wrapper .title{font-weight:600;margin-bottom:4px}
.gantt .popup-wrapper .subtitle{color:var(--text-secondary);font-size:.8rem;margin-bottom:2px}
.gantt .popup-wrapper .details{color:var(--text-secondary);font-size:.7rem}
`

const VIEW_MODES = ['Day', 'Week', 'Month', 'Quarter Day', 'Year']

function renderMarkdown(text: string): string {
  if (!text) return ''
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`(.+?)`/g, '<code class="text-xs px-1 rounded" style="background:var(--bg-hover)">$1</code>')
  return html
}

export default function GanttChart() {
  const ganttRef = useRef<HTMLDivElement>(null)
  const ganttInstance = useRef<Gantt | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [viewMode, setViewMode] = useState('Week')
  const [selectedProjects, setSelectedProjects] = useState<number[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([])

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

  const todayStr = () => new Date().toISOString().slice(0, 10)

  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const filteredTasks = tasks.filter(t => {
    if (selectedProjects.length > 0 && !selectedProjects.includes(t.projectId)) return false
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.statusId)) return false
    return true
  })

  const toGanttTasks = (taskList: TaskWithRelations[]): GanttTask[] => {
    return taskList.map(t => {
      let start = t.startDate || t.dueDate || todayStr()
      let end = t.dueDate || addDays(start, Math.max((t.durationDays ?? 1) - 1, 0))

      if (!t.startDate && t.dueDate) {
        const dur = t.durationDays ?? 1
        const d = new Date(t.dueDate)
        d.setDate(d.getDate() - dur + 1)
        start = d.toISOString().slice(0, 10)
      }

      if (start > end) end = start

      const predIds = JSON.parse(t.predecessorIds || '[]') as number[]
      const dependencies = predIds.map(id => String(id)).join(', ')

      const prioColor = t.priorityColor || '#a6adc8'
      const colorClass = `gantt-prio-${prioColor.replace('#', '')}`

      return {
        id: String(t.id),
        name: t.name,
        start,
        end,
        progress: t.completionPercent || 0,
        dependencies,
        custom_class: colorClass,
        _task: t,
      } as GanttTask & { _task: TaskWithRelations }
    })
  }

  useEffect(() => {
    if (!ganttRef.current || !containerRef.current) return

    const ganttTasks = toGanttTasks(filteredTasks)

    ganttInstance.current?.clear()

    if (ganttTasks.length === 0) return

    const rect = containerRef.current.getBoundingClientRect()
    const containerHeight = Math.max(rect.height - 40, 400)

    const options: GanttOptions = {
      view_mode: viewMode,
      date_format: 'YYYY-MM-DD',
      bar_height: 28,
      bar_corner_radius: 4,
      padding: 14,
      container_height: containerHeight,
      today_button: true,
      readonly: false,
      readonly_dates: false,
      readonly_progress: false,
      popup_on: 'click',
      scroll_to: 'today',
      lines: 'both',
      move_dependencies: true,
      custom_popup_html: (task: GanttTask) => {
        const t = (task as any)._task as TaskWithRelations | undefined
        const progress = Math.floor((task.progress || 0) * 100) / 100
        const statusName = t?.statusName || ''
        const priorityName = t?.priorityName || ''
        const projectName = t?.projectName || ''
        return `
          <div style="padding:8px 12px;font-size:13px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);min-width:180px">
            <div style="font-weight:600;margin-bottom:4px">${task.name}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px">${task.start} → ${task.end}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px">Progress: ${progress}%</div>
            ${statusName ? `<div style="font-size:11px;color:var(--text-secondary)">Status: ${statusName}</div>` : ''}
            ${priorityName ? `<div style="font-size:11px;color:${t?.priorityColor || 'var(--text-secondary)'}">Priority: ${priorityName}</div>` : ''}
            ${projectName ? `<div style="font-size:11px;color:var(--text-secondary)">Project: ${projectName}</div>` : ''}
          </div>
        `
      },
      on_click: (task: GanttTask) => {
        const t = (task as any)._task as TaskWithRelations | undefined
        if (t) openEdit(t)
      },
      on_date_change: async (task: GanttTask, start: Date, end: Date) => {
        const id = Number(task.id)
        const startStr = start.toISOString().slice(0, 10)
        const endStr = end.toISOString().slice(0, 10)
        const durDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
        await window.electronAPI.updateTask(id, {
          startDate: startStr,
          dueDate: endStr,
          durationDays: durDays,
        })
        loadData()
      },
      on_progress_change: async (task: GanttTask, progress: number) => {
        const id = Number(task.id)
        await window.electronAPI.updateTask(id, {
          completionPercent: Math.round(progress),
        })
        loadData()
      },
    }

    ganttInstance.current = new Gantt(ganttRef.current, ganttTasks, options)

    return () => {
      ganttInstance.current?.clear()
      ganttInstance.current = null
    }
  }, [filteredTasks, viewMode, loadData])

  const toggleProject = (id: number) => {
    setSelectedProjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleStatus = (id: number) => {
    setSelectedStatuses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Gantt Chart</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 flex-wrap">
            {VIEW_MODES.map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === mode ? 'var(--accent)' : 'var(--bg-hover)',
                  color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                }}>
                {mode}
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
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <div ref={ganttRef} className="gantt-container" />
        {filteredTasks.length === 0 && (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks with dates. Set a start date or due date on your tasks to see them on the Gantt chart.</p>
          </div>
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

      <style>{FRAPPE_GANTT_CSS}</style>
    </div>
  )
}
