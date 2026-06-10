import { useState, useEffect } from 'react'
import type { TaskWithRelations, Status, Priority, Project, User } from '../types/models'
import LinkInput from './LinkInput'

interface Props {
  editingTask: TaskWithRelations | null
  editName: string; setEditName: (v: string) => void
  editDesc: string; setEditDesc: (v: string) => void
  editStatus: number; setEditStatus: (v: number) => void
  editPriority: number; setEditPriority: (v: number) => void
  editProject: number; setEditProject: (v: number) => void
  editAssignedTo: number; setEditAssignedTo: (v: number) => void
  editDueDate: string; setEditDueDate: (v: string) => void
  editNotes: string; setEditNotes: (v: string) => void
  editCompletionPercent: number; setEditCompletionPercent: (v: number) => void
  showMarkdownPreview: boolean; setShowMarkdownPreview: (v: boolean) => void
  statuses: Status[]; priorities: Priority[]; projects: Project[]; users: User[]
  onClose: () => void; onSave: () => void
  renderMarkdown: (text: string) => string
  showCompletion?: boolean
  editPredecessorIds?: number[]; setEditPredecessorIds?: (v: number[]) => void
  editSuccessorIds?: number[]; setEditSuccessorIds?: (v: number[]) => void
  showDepPicker?: 'predecessor' | 'successor' | null; setShowDepPicker?: (v: 'predecessor' | 'successor' | null) => void
  depSearch?: string; setDepSearch?: (v: string) => void
  allTasks?: TaskWithRelations[]
  editRecurrenceType?: string; setEditRecurrenceType?: (v: string) => void
  editRecurrenceInterval?: number; setEditRecurrenceInterval?: (v: number) => void
  editRecurrenceDaysOfWeek?: string; setEditRecurrenceDaysOfWeek?: (v: string) => void
  editRecurrenceEndDate?: string; setEditRecurrenceEndDate?: (v: string) => void
  editRecurrenceCount?: number | null; setEditRecurrenceCount?: (v: number | null) => void
}

export default function TaskEditModal({
  editingTask, editName, setEditName, editDesc, setEditDesc,
  editStatus, setEditStatus, editPriority, setEditPriority,
  editProject, setEditProject, editAssignedTo, setEditAssignedTo,
  editDueDate, setEditDueDate, editNotes, setEditNotes,
  editCompletionPercent, setEditCompletionPercent,
  showMarkdownPreview, setShowMarkdownPreview,
  statuses, priorities, projects, users,
  onClose, onSave, renderMarkdown, showCompletion = true,
  editPredecessorIds, setEditPredecessorIds,
  editSuccessorIds, setEditSuccessorIds,
  showDepPicker, setShowDepPicker, depSearch, setDepSearch, allTasks,
  editRecurrenceType, setEditRecurrenceType,
  editRecurrenceInterval, setEditRecurrenceInterval,
  editRecurrenceDaysOfWeek, setEditRecurrenceDaysOfWeek,
  editRecurrenceEndDate, setEditRecurrenceEndDate,
  editRecurrenceCount, setEditRecurrenceCount,
}: Props) {
  const hasDeps = !!setEditPredecessorIds && !!setEditSuccessorIds && !!setShowDepPicker && !!setDepSearch && !!allTasks
  const hasRecurrence = !!setEditRecurrenceType

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const parsedDays = (editRecurrenceDaysOfWeek || '').split(',').filter(Boolean).map(Number)

  const toggleDay = (day: number) => {
    if (!setEditRecurrenceDaysOfWeek) return
    const current = parsedDays
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    setEditRecurrenceDaysOfWeek(next.sort((a, b) => a - b).join(','))
  }

  const filteredDepTasks = hasDeps && depSearch && allTasks
    ? allTasks.filter(t => t.id !== editingTask?.id && t.name.toLowerCase().includes(depSearch.toLowerCase()))
    : hasDeps ? (allTasks?.filter(t => t.id !== editingTask?.id) ?? []) : []

  const toggleDepId = (id: number, type: 'predecessor' | 'successor') => {
    if (type === 'predecessor' && editPredecessorIds && setEditPredecessorIds) {
      setEditPredecessorIds(editPredecessorIds.includes(id) ? editPredecessorIds.filter(x => x !== id) : [...editPredecessorIds, id])
    } else if (editSuccessorIds && setEditSuccessorIds) {
      setEditSuccessorIds(editSuccessorIds.includes(id) ? editSuccessorIds.filter(x => x !== id) : [...editSuccessorIds, id])
    }
  }

  useEffect(() => {
    if (!editingTask) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingTask, onClose])

  if (!editingTask) return null

  return (
    <>
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

            {showCompletion && (
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
            )}

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

            {hasRecurrence && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Recurrence</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={editRecurrenceType} onChange={e => setEditRecurrenceType!(e.target.value)}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {editRecurrenceType !== 'none' && (
                    <div>
                      <input type="number" min={1} value={editRecurrenceInterval}
                        onChange={e => setEditRecurrenceInterval!(Math.max(1, Number(e.target.value)))}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  )}
                  {editRecurrenceType !== 'none' && (
                    <div className="flex items-center text-xs" style={{ color: 'var(--text-muted)' }}>
                      {editRecurrenceType === 'daily' && 'day(s)'}
                      {editRecurrenceType === 'weekly' && 'week(s)'}
                      {editRecurrenceType === 'monthly' && 'month(s)'}
                      {editRecurrenceType === 'yearly' && 'year(s)'}
                    </div>
                  )}
                </div>
                {editRecurrenceType === 'weekly' && (
                  <div className="flex gap-1 mt-2">
                    {dayLabels.map((label, i) => (
                      <button key={i} onClick={() => toggleDay(i)}
                        className="w-8 h-8 rounded-lg text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: parsedDays.includes(i) ? 'var(--accent)' : 'var(--bg-hover)',
                          color: parsedDays.includes(i) ? '#fff' : 'var(--text-secondary)',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {editRecurrenceType !== 'none' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--text-muted)' }}>End Date</label>
                      <input type="date" value={editRecurrenceEndDate || ''}
                        onChange={e => setEditRecurrenceEndDate!(e.target.value || '')}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--text-muted)' }}>Max Occurrences</label>
                      <input type="number" min={0} value={editRecurrenceCount ?? ''}
                        onChange={e => setEditRecurrenceCount!(e.target.value ? Number(e.target.value) : 0)}
                        placeholder="∞"
                        className="w-full border rounded-lg px-2 py-1.5 text-sm"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Links</label>
              <LinkInput linkedType="task" linkedId={editingTask.id} />
            </div>

            {hasDeps && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Dependencies</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Predecessors</span>
                      <button onClick={() => { setShowDepPicker!('predecessor'); setDepSearch!('') }} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>+ Add</button>
                    </div>
                    <div className="min-h-[32px] border rounded-lg p-1.5 text-xs space-y-1" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                      {editPredecessorIds!.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      ) : (
                        editPredecessorIds!.map(id => {
                          const t = allTasks!.find(x => x.id === id)
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
                      <button onClick={() => { setShowDepPicker!('successor'); setDepSearch!('') }} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>+ Add</button>
                    </div>
                    <div className="min-h-[32px] border rounded-lg p-1.5 text-xs space-y-1" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                      {editSuccessorIds!.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      ) : (
                        editSuccessorIds!.map(id => {
                          const t = allTasks!.find(x => x.id === id)
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
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>Cancel</button>
            <button onClick={onSave} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Save</button>
          </div>
        </div>
      </div>

      {hasDeps && showDepPicker && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-4 border w-full max-w-lg max-h-[60vh] flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {showDepPicker === 'predecessor' ? 'Select Predecessors' : 'Select Successors'}
              </h3>
              <button onClick={() => setShowDepPicker!(null)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <input value={depSearch} onChange={e => setDepSearch!(e.target.value)} placeholder="Search tasks..." className="w-full border rounded-lg px-3 py-1.5 text-sm mb-3" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredDepTasks.map(t => {
                const selected = showDepPicker === 'predecessor' ? editPredecessorIds!.includes(t.id) : editSuccessorIds!.includes(t.id)
                return (
                  <div key={t.id} onClick={() => toggleDepId(t.id, showDepPicker)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm"
                    style={{ backgroundColor: selected ? 'var(--bg-hover)' : 'transparent', borderLeft: `3px solid ${t.priorityColor || 'var(--text-muted)'}` }}>
                    <input type="checkbox" checked={selected} readOnly className="rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{t.projectName} · {t.statusName} · {t.priorityName}</p>
                    </div>
                  </div>
                )
              })}
              {filteredDepTasks.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No tasks found.</p>}
            </div>
            <button onClick={() => setShowDepPicker!(null)} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold self-end" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Done</button>
          </div>
        </div>
      )}
    </>
  )
}
