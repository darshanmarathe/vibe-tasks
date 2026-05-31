import { useState } from 'react'
import type { OnThisDayEntry } from '../types/models'
import { moodEmoji } from './MoodPicker'

interface OnThisDayPanelProps {
  entries: OnThisDayEntry[]
  onSelectDate: (date: string) => void
}

function excerpt(text: string, max = 80): string {
  const trimmed = text.trim()
  if (!trimmed) return '(no entry)'
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max) + '…'
}

export default function OnThisDayPanel({ entries, onSelectDate }: OnThisDayPanelProps) {
  const [open, setOpen] = useState(true)

  if (entries.length === 0) return null

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="text-sm font-semibold">On This Day</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <ul className="border-t divide-y" style={{ borderColor: 'var(--border)' }}>
          {entries.map(entry => {
            const d = new Date(entry.date + 'T12:00:00')
            const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            return (
              <li key={entry.date}>
                <button
                  type="button"
                  onClick={() => onSelectDate(entry.date)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                    {entry.mood && <span>{moodEmoji(entry.mood)}</span>}
                    {entry.yearsAgo > 0 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {entry.yearsAgo}y ago
                      </span>
                    )}
                  </div>
                  <p className="text-xs italic">&ldquo;{excerpt(entry.wentWell)}&rdquo;</p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
