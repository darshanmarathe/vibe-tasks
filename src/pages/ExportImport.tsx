import { useState, useEffect, useCallback } from 'react'
import type { TaskWithRelations } from '../types/models'

export default function ExportImport() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [shareTaskId, setShareTaskId] = useState(0)

  const loadTasks = useCallback(async () => {
    const t = await window.electronAPI.getTasks()
    setTasks(t)
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => setStatusMsg(null), 5000)
  }

  const handleExportJson = async () => {
    setIsProcessing(true)
    try {
      const path = await window.electronAPI.exportJson()
      if (path) showStatus('success', `Data exported to ${path}`)
    } catch (e: any) {
      showStatus('error', e?.message || 'Export failed')
    }
    setIsProcessing(false)
  }

  const handleImportJson = async () => {
    setIsProcessing(true)
    try {
      const count = await window.electronAPI.importJson()
      if (count > 0) {
        showStatus('success', `Imported ${count} records — reloading data`)
        loadTasks()
      } else {
        showStatus('success', 'No records imported (file may be empty)')
      }
    } catch (e: any) {
      showStatus('error', e?.message || 'Import failed')
    }
    setIsProcessing(false)
  }

  const handleExportCsv = async () => {
    setIsProcessing(true)
    try {
      const path = await window.electronAPI.exportTasksCsv()
      if (path) showStatus('success', `Tasks exported to ${path}`)
    } catch (e: any) {
      showStatus('error', e?.message || 'CSV export failed')
    }
    setIsProcessing(false)
  }

  const handleImportCsv = async () => {
    setIsProcessing(true)
    try {
      const count = await window.electronAPI.importTasksCsv()
      if (count > 0) {
        showStatus('success', `Imported ${count} tasks — reloading data`)
        loadTasks()
      } else {
        showStatus('success', 'No tasks imported')
      }
    } catch (e: any) {
      showStatus('error', e?.message || 'CSV import failed')
    }
    setIsProcessing(false)
  }

  const handleShareTask = async () => {
    if (!shareTaskId) return
    setIsProcessing(true)
    try {
      const path = await window.electronAPI.exportTaskShare(shareTaskId)
      if (path) showStatus('success', `Task shared to ${path}`)
    } catch (e: any) {
      showStatus('error', e?.message || 'Share failed')
    }
    setIsProcessing(false)
  }

  const handleImportShare = async () => {
    setIsProcessing(true)
    try {
      const task = await window.electronAPI.importShareLink()
      if (task) {
        showStatus('success', `Imported shared task: "${task.name}"`)
        loadTasks()
      } else {
        showStatus('success', 'No task imported')
      }
    } catch (e: any) {
      showStatus('error', e?.message || 'Import share failed')
    }
    setIsProcessing(false)
  }

  const s = (c: string) => ({ style: { color: `var(--${c})` } })
  const btn = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors'

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold" {...s('text-primary')}>Data Portability</h1>

      {statusMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${statusMsg.type === 'success' ? '' : ''}`}
          style={{
            backgroundColor: statusMsg.type === 'success' ? 'var(--accent)' : 'var(--danger)',
            color: '#fff',
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* JSON Export/Import */}
      <section className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold" {...s('text-primary')}>Full Backup (JSON)</h2>
        <p className="text-sm" {...s('text-secondary')}>Export or restore your entire database — all tasks, notes, habits, journal entries, and settings.</p>
        <div className="flex gap-3">
          <button onClick={handleExportJson} disabled={isProcessing}
            className={btn} style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            {isProcessing ? 'Processing...' : 'Export JSON'}
          </button>
          <button onClick={handleImportJson} disabled={isProcessing}
            className={btn} style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
            Import JSON
          </button>
        </div>
      </section>

      {/* CSV Export/Import */}
      <section className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold" {...s('text-primary')}>Tasks Spreadsheet (CSV)</h2>
        <p className="text-sm" {...s('text-secondary')}>Export tasks as CSV for analysis in Excel, Google Sheets, or import tasks from a CSV file.</p>
        <div className="flex gap-3">
          <button onClick={handleExportCsv} disabled={isProcessing}
            className={btn} style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            {isProcessing ? 'Processing...' : 'Export CSV'}
          </button>
          <button onClick={handleImportCsv} disabled={isProcessing}
            className={btn} style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
            Import CSV
          </button>
        </div>
      </section>

      {/* Share a Task */}
      <section className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold" {...s('text-primary')}>Share a Task</h2>
        <p className="text-sm" {...s('text-secondary')}>Export a single task as a shareable JSON file, or import a shared task file from someone else.</p>

        <div className="flex flex-wrap items-center gap-3">
          <select value={shareTaskId} onChange={e => setShareTaskId(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm border flex-1 min-w-[200px]"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <option value={0}>Select a task to share...</option>
            {tasks.map(task => (
              <option key={task.id} value={task.id}>{task.name}</option>
            ))}
          </select>
          <button onClick={handleShareTask} disabled={isProcessing || !shareTaskId}
            className={btn} style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            {isProcessing ? 'Processing...' : 'Share Task'}
          </button>
        </div>

        <div>
          <button onClick={handleImportShare} disabled={isProcessing}
            className={btn} style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
            Import Shared Task
          </button>
        </div>
      </section>
    </div>
  )
}
