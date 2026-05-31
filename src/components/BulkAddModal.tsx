import { useState } from 'react'
import type { Status, Priority, Project, User } from '../types/models'

interface Props {
  statuses: Status[]
  priorities: Priority[]
  projects: Project[]
  users: User[]
  defaultStatus: number
  defaultPriority: number
  defaultProject: number
  defaultAssignedTo: number
  onClose: () => void
  onDone: () => void
}

interface ParsedLine {
  raw: string
  name: string
  dueDate: string | null
  error: string | null
}

/**
 * Parse a single line.
 * Supported formats:
 *   task name
 *   task name|enddate:2025-12-31
 *   task name|enddate:tomorrow
 *   task name|enddate:next week
 */
function parseLine(line: string): ParsedLine {
  const trimmed = line.trim()
  if (!trimmed) return { raw: line, name: '', dueDate: null, error: null }

  const pipeIdx = trimmed.indexOf('|')
  if (pipeIdx === -1) {
    return { raw: line, name: trimmed, dueDate: null, error: null }
  }

  const name = trimmed.slice(0, pipeIdx).trim()
  const rest = trimmed.slice(pipeIdx + 1).trim()

  if (!name) {
    return { raw: line, name: '', dueDate: null, error: 'Task name is empty before |' }
  }

  // Parse enddate:value
  const enddateMatch = rest.match(/^enddate:(.+)$/i)
  if (!enddateMatch) {
    return { raw: line, name, dueDate: null, error: `Unknown field "${rest}" — use enddate:YYYY-MM-DD` }
  }

  const dateStr = enddateMatch[1].trim().toLowerCase()
  const dueDate = resolveDate(dateStr)

  if (!dueDate) {
    return { raw: line, name, dueDate: null, error: `Cannot parse date "${enddateMatch[1]}"` }
  }

  return { raw: line, name, dueDate, error: null }
}

function resolveDate(input: string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (input === 'today') {
    return today.toISOString().split('T')[0]
  }
  if (input === 'tomorrow') {
    const d = new Date(today); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  if (input === 'next week') {
    const d = new Date(today); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }
  // "in X days"
  const inDays = input.match(/^in\s+(\d+)\s+days?$/)
  if (inDays) {
    const d = new Date(today); d.setDate(d.getDate() + parseInt(inDays[1]))
    return d.toISOString().split('T')[0]
  }
  // "next X weeks"
  const inWeeks = input.match(/^next\s+(\d+)\s+weeks?$/)
  if (inWeeks) {
    const d = new Date(today); d.setDate(d.getDate() + parseInt(inWeeks[1]) * 7)
    return d.toISOString().split('T')[0]
  }
  // "next X months"
  const inMonths = input.match(/^next\s+(\d+)\s+months?$/)
  if (inMonths) {
    const d = new Date(today); d.setMonth(d.getMonth() + parseInt(inMonths[1]))
    return d.toISOString().split('T')[0]
  }
  // ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const d = new Date(input + 'T12:00:00')
    if (!isNaN(d.getTime())) return input
  }
  // DD/MM/YYYY or MM/DD/YYYY — try both
  const slashDate = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashDate) {
    const d = new Date(`${slashDate[3]}-${slashDate[2].padStart(2,'0')}-${slashDate[1].padStart(2,'0')}T12:00:00`)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null
}

export default function BulkAddModal({
  statuses, priorities, projects, users,
  defaultStatus, defaultPriority, defaultProject, defaultAssignedTo,
  onClose, onDone,
}: Props) {
  const [text, setText] = useState('')
  const [bulkStatus, setBulkStatus] = useState(defaultStatus)
  const [bulkPriority, setBulkPriority] = useState(defaultPriority)
  const [bulkProject, setBulkProject] = useState(defaultProject)
  const [bulkAssignedTo, setBulkAssignedTo] = useState(defaultAssignedTo)
  const [adding, setAdding] = useState(false)
  const [result, setResult] = useState<{ added: number; errors: string[] } | null>(null)

  const lines = text.split('\n')
  const parsed = lines.map(parseLine).filter(p => p.name || p.error)
  const validCount = parsed.filter(p => p.name && !p.error).length
  const errorLines = parsed.filter(p => p.error)

  const handleAdd = async () => {
    const valid = parsed.filter(p => p.name && !p.error)
    if (!valid.length) return
    setAdding(true)
    const errors: string[] = []
    let added = 0
    for (const item of valid) {
      try {
        await window.electronAPI.createTask({
          name: item.name,
          description: '',
          notes: '',
          dueDate: item.dueDate,
          statusId: bulkStatus || statuses[0]?.id || 1,
          priorityId: bulkPriority || priorities[0]?.id || 1,
          projectId: bulkProject || projects[0]?.id || 1,
          predecessorIds: '[]',
          successorIds: '[]',
          archived: 0,
          assignedTo: bulkAssignedTo || null,
          completionPercent: 0,
        })
        added++
      } catch (e: any) {
        errors.push(`"${item.name}": ${e?.message ?? 'unknown error'}`)
      }
    }
    setAdding(false)
    setResult({ added, errors })
    if (errors.length === 0) {
      onDone()
      onClose()
    }
  }

  const sel = 'border rounded-lg px-3 py-2 text-sm'
  const selStyle = { backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div
        className="rounded-xl border w-full max-w-2xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Bulk Add Tasks</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              One task per line. Optionally append <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>|enddate:YYYY-MM-DD</code> or natural dates like <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>|enddate:tomorrow</code>
            </p>
          </div>
          <button onClick={onClose} className="text-lg" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="px-6 pb-5 space-y-4 overflow-y-auto flex-1">
          {/* Textarea */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Tasks <span style={{ color: 'var(--text-muted)' }}>(one per line)</span>
            </label>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setResult(null) }}
              rows={10}
              placeholder={`Review PR #42\nWrite unit tests|enddate:tomorrow\nDeploy to staging|enddate:2025-12-31\nUpdate docs|enddate:next week`}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-y"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            {/* Live preview */}
            {parsed.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {parsed.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: p.error ? 'rgba(243,139,168,0.1)' : 'rgba(166,227,161,0.08)' }}>
                    {p.error ? (
                      <span style={{ color: 'var(--danger)' }}>✗ {p.raw.trim()} — {p.error}</span>
                    ) : (
                      <>
                        <span style={{ color: 'var(--success)' }}>✓</span>
                        <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                        {p.dueDate && <span className="ml-auto" style={{ color: 'var(--accent)' }}>📅 {p.dueDate}</span>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select value={bulkStatus} onChange={e => setBulkStatus(Number(e.target.value))} className={sel} style={selStyle}>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select value={bulkPriority} onChange={e => setBulkPriority(Number(e.target.value))} className={sel} style={selStyle}>
                {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Project</label>
              <select value={bulkProject} onChange={e => setBulkProject(Number(e.target.value))} className={sel} style={selStyle}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Assign To</label>
              <select value={bulkAssignedTo} onChange={e => setBulkAssignedTo(Number(e.target.value))} className={sel} style={selStyle}>
                <option value={0}>Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Result feedback */}
          {result && result.errors.length > 0 && (
            <div className="rounded-lg p-3 text-xs space-y-1" style={{ backgroundColor: 'rgba(243,139,168,0.1)', borderColor: 'var(--danger)', border: '1px solid' }}>
              <p className="font-semibold" style={{ color: 'var(--danger)' }}>
                {result.added} added, {result.errors.length} failed:
              </p>
              {result.errors.map((e, i) => <p key={i} style={{ color: 'var(--text-secondary)' }}>{e}</p>)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {validCount > 0
              ? <><span style={{ color: 'var(--success)' }}>{validCount}</span> task{validCount !== 1 ? 's' : ''} ready{errorLines.length > 0 ? `, ${errorLines.length} with errors` : ''}</>
              : 'Enter tasks above'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={validCount === 0 || adding}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: validCount > 0 && !adding ? 'var(--accent)' : 'var(--bg-hover)',
                color: validCount > 0 && !adding ? '#fff' : 'var(--text-muted)',
                cursor: validCount === 0 || adding ? 'not-allowed' : 'pointer',
              }}
            >
              {adding ? 'Adding…' : `Add ${validCount > 0 ? validCount : ''} Task${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
