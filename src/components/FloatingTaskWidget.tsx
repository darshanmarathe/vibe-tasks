import { useState, useEffect, useRef } from 'react'
import { useTimer } from '../contexts/TimerContext'
import { TimerBadge } from './TimerBadge'
import type { Status, TaskWithRelations } from '../types/models'

interface Props {
  visible: boolean
  onClose: () => void
}

export default function FloatingTaskWidget({ visible, onClose }: Props) {
  const { runningEntry, elapsed, stopTimer } = useTimer()
  const [statuses, setStatuses] = useState<Status[]>([])
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [statusId, setStatusId] = useState<number>(0)
  const [completionPercent, setCompletionPercent] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    window.electronAPI.getStatuses().then(setStatuses)
  }, [visible])

  useEffect(() => {
    if (!visible || !runningEntry) {
      setTask(null)
      return
    }
    window.electronAPI.getTasks(false, false).then(tasks => {
      const found = tasks.find(t => t.id === runningEntry.task_id)
      if (found) {
        setTask(found)
        setStatusId(found.statusId)
        setCompletionPercent(found.completionPercent)
      }
    })
  }, [visible, runningEntry?.task_id])

  const handleSave = async () => {
    if (!runningEntry || !task) return
    setSaving(true)
    try {
      const updated = await window.electronAPI.updateTask(runningEntry.task_id, { statusId, completionPercent })
      setTask(updated)
    } catch (err) {
      console.error('Failed to update task', err)
    }
    setSaving(false)
  }

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && runningEntry && task) {
        handleSave().then(onClose)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (runningEntry && task) {
          handleSave().then(onClose)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, runningEntry, task])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="w-[380px] rounded-xl shadow-2xl overflow-hidden outline-none"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {!runningEntry ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No task is active</p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-sm transition-opacity"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--text-primary)' }}
                title={runningEntry.task_name ?? ''}
              >
                {runningEntry.task_name ?? `Task #${runningEntry.task_id}`}
              </h3>
              <button
                onClick={onClose}
                className="text-sm leading-none p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✕
              </button>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-3 py-2">
              <TimerBadge elapsed={elapsed} className="text-lg" />
              <button
                onClick={() => window.electronAPI.toggleFocus()}
                title="Focus Mode"
                className="text-xs px-2.5 py-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                🎯 Focus
              </button>
              <button
                onClick={stopTimer}
                className="text-xs px-2.5 py-1 rounded transition-colors"
                style={{ color: 'var(--danger)', backgroundColor: 'var(--bg-hover)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--danger-light)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              >
                ⏹ Stop
              </button>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select
                value={statusId}
                onChange={e => setStatusId(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Completion Percent */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Completion
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={completionPercent}
                  onChange={e => setCompletionPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-16 text-right border rounded px-2 py-0.5 text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={completionPercent}
                onChange={e => setCompletionPercent(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-medium transition-opacity"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
