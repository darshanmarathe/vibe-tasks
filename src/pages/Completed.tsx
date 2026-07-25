import { useEffect, useState, useCallback } from 'react'
import TaskEditModal from '../components/TaskEditModal'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'

export default function Completed() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

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

  const loadData = useCallback(async () => {
    const [t, s, p, pr, u] = await Promise.all([
      window.electronAPI.getTasks(),
      window.electronAPI.getStatuses(),
      window.electronAPI.getPriorities(),
      window.electronAPI.getProjects(),
      window.electronAPI.getUsers(),
    ])
    const completedStatusId = s.find(st => st.complete)?.id
    setTasks(t.filter((task: TaskWithRelations) => task.statusId === completedStatusId))
    setStatuses(s)
    setPriorities(p)
    setProjects(pr)
    setUsers(u)
    setSelected(new Set())
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleArchive = async (id: number) => {
    if (!window.confirm('Archive this task?')) return
    await window.electronAPI.archiveTask(id)
    loadData()
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map(t => t.id)))
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} completed task(s)? This cannot be undone.`)) return
    for (const id of selected) await window.electronAPI.deleteTask(id)
    loadData()
  }

  const handleArchiveSelected = async () => {
    if (selected.size === 0) return
    if (!window.confirm(`Archive ${selected.size} completed task(s)?`)) return
    for (const id of selected) await window.electronAPI.archiveTask(id)
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
    setEditStartDate(task.startDate || '')
    setEditDurationDays(task.durationDays ?? 1)
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
        startDate: editStartDate || null,
        durationDays: editDurationDays || 1,
      notes: editNotes,
    })
    closeEdit()
    loadData()
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Completed Tasks
          {tasks.length > 0 && (
            <span className="text-sm ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              {tasks.length}
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <>
              <button onClick={handleArchiveSelected} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>
                Archive Selected ({selected.size})
              </button>
              <button onClick={handleDeleteSelected} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
                Delete Selected ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No completed tasks.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderBottomColor: 'var(--border)' }} className="border-b">
                <th className="text-left py-3 px-4 w-10">
                  <input type="checkbox" checked={selected.size === tasks.length} onChange={toggleAll} className="rounded" />
                </th>
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
              {tasks.map(task => (
                <tr key={task.id} className="border-b cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => openEdit(task)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelect(task.id)} className="rounded" />
                  </td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{task.name}</td>
                  <td className="py-3 px-4">{task.statusName}</td>
                  <td className="py-3 px-4 font-medium" style={{ color: task.priorityColor || 'var(--text-secondary)' }}>{task.priorityName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{task.projectName}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>{task.assignedToName || '—'}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-secondary)' }}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.completionPercent}%</span>
                      <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <div className="h-full rounded-full" style={{ width: `${task.completionPercent}%`, backgroundColor: task.completionPercent === 100 ? 'var(--success)' : 'var(--accent)' }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleArchive(task.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      />
    </div>
  )
}
