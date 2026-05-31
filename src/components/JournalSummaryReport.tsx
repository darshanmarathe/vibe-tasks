import { useCallback, useState } from 'react'
import type { JournalSummaryCriteria, JournalSummaryReport } from '../types/models'
import { moodEmoji } from './MoodPicker'
import { formatElapsedShort } from './TimerBadge'

const DEFAULT_CRITERIA: JournalSummaryCriteria = {
  includeMood: true,
  includeWentWell: true,
  includeToImprove: true,
  includeWins: true,
  includeLosses: true,
  includeQuickNotes: true,
  includeTasksCompleted: true,
  includePomodoros: true,
  includeHabits: true,
  includeFocusTime: true,
  includeNotesWritten: true,
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function monthStartISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const CRITERIA_LABELS: { key: keyof JournalSummaryCriteria; label: string; group: string }[] = [
  { key: 'includeMood', label: 'Mood', group: 'Journal' },
  { key: 'includeWentWell', label: 'What went well', group: 'Journal' },
  { key: 'includeToImprove', label: 'What to improve', group: 'Journal' },
  { key: 'includeWins', label: 'Wins', group: 'Journal' },
  { key: 'includeLosses', label: 'Losses', group: 'Journal' },
  { key: 'includeQuickNotes', label: 'Quick notes', group: 'Journal' },
  { key: 'includeTasksCompleted', label: 'Tasks completed', group: 'Activity' },
  { key: 'includePomodoros', label: 'Pomodoro sessions', group: 'Activity' },
  { key: 'includeHabits', label: 'Habits completed', group: 'Activity' },
  { key: 'includeFocusTime', label: 'Focus time', group: 'Activity' },
  { key: 'includeNotesWritten', label: 'Notes written', group: 'Activity' },
]

export default function JournalSummaryReport() {
  const [startDate, setStartDate] = useState(daysAgoISO(6))
  const [endDate, setEndDate] = useState(todayISO())
  const [criteria, setCriteria] = useState<JournalSummaryCriteria>(DEFAULT_CRITERIA)
  const [report, setReport] = useState<JournalSummaryReport | null>(null)
  const [loading, setLoading] = useState(false)

  const toggleCriteria = (key: keyof JournalSummaryCriteria) => {
    setCriteria(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const generate = useCallback(async () => {
    if (startDate > endDate) return
    setLoading(true)
    try {
      const data = await window.electronAPI.getJournalSummaryReport(startDate, endDate, criteria)
      setReport(data)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, criteria])

  const exportMarkdown = () => {
    if (!report) return
    const lines: string[] = [
      `# Journal Summary Report`,
      ``,
      `**Period:** ${formatDate(report.startDate)} — ${formatDate(report.endDate)}`,
      ``,
      `## Overview`,
      `- Days journaled: ${report.daysJournaled}`,
      report.averageMood != null ? `- Average mood: ${report.averageMood}/5` : '',
      `- Total wins: ${report.allWins.length}`,
      `- Total losses: ${report.allLosses.length}`,
      `- Tasks completed: ${report.totalTasksCompleted}`,
      `- Pomodoro sessions: ${report.totalPomodoroSessions}`,
      `- Focus time: ${formatElapsedShort(report.totalFocusTimeSeconds)}`,
      ``,
    ].filter(Boolean)

    if (criteria.includeWins && report.allWins.length > 0) {
      lines.push('## All Wins', '')
      for (const w of report.allWins) {
        lines.push(`- **${formatDate(w.date)}:** ${w.text}`)
      }
      lines.push('')
    }

    if (criteria.includeLosses && report.allLosses.length > 0) {
      lines.push('## All Losses', '')
      for (const l of report.allLosses) {
        lines.push(`- **${formatDate(l.date)}:** ${l.text}`)
      }
      lines.push('')
    }

    lines.push('## Daily Breakdown', '')
    for (const day of report.days) {
      lines.push(`### ${formatDate(day.date)}`, '')
      const e = day.entry
      if (e && criteria.includeMood && e.mood) lines.push(`- Mood: ${moodEmoji(e.mood)} (${e.mood}/5)`)
      if (e && criteria.includeWentWell && e.wentWell.trim()) lines.push(`- Went well: ${e.wentWell.trim()}`)
      if (e && criteria.includeToImprove && e.toImprove.trim()) lines.push(`- To improve: ${e.toImprove.trim()}`)
      if (e && criteria.includeWins && e.wins.trim()) lines.push(`- Wins:\n${splitLines(e.wins).map(l => `  - ${l}`).join('\n')}`)
      if (e && criteria.includeLosses && e.losses.trim()) lines.push(`- Losses:\n${splitLines(e.losses).map(l => `  - ${l}`).join('\n')}`)
      if (e && criteria.includeQuickNotes && e.quickNotes.trim()) lines.push(`- Notes: ${e.quickNotes.trim()}`)
      if (day.stats) {
        const s = day.stats
        if (criteria.includeTasksCompleted && s.tasksCompleted) lines.push(`- Tasks done: ${s.tasksCompleted}`)
        if (criteria.includePomodoros && s.pomodoroSessions) lines.push(`- Pomodoros: ${s.pomodoroSessions}`)
        if (criteria.includeHabits && s.habitsCompleted) lines.push(`- Habits: ${s.habitsCompleted}/${s.habitsTotal}`)
        if (criteria.includeFocusTime && s.focusTimeSeconds) lines.push(`- Focus: ${formatElapsedShort(s.focusTimeSeconds)}`)
        if (criteria.includeNotesWritten && s.notesWritten) lines.push(`- Notes written: ${s.notesWritten}`)
      }
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-summary-${report.startDate}-${report.endDate}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  }

  const groups = ['Journal', 'Activity']

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 border space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Summary Report</h2>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm" style={inputStyle} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '7 days', start: daysAgoISO(6), end: todayISO() },
              { label: '30 days', start: daysAgoISO(29), end: todayISO() },
              { label: 'This month', start: monthStartISO(), end: todayISO() },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => { setStartDate(preset.start); setEndDate(preset.end) }}
                className="px-2 py-1 rounded text-xs border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Include in report</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <div key={group} className="space-y-1">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{group}</p>
                {CRITERIA_LABELS.filter(c => c.group === group).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                    <input type="checkbox" checked={criteria[key]} onChange={() => toggleCriteria(key)} />
                    {label}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={loading || startDate > endDate}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
          {report && (
            <button
              type="button"
              onClick={exportMarkdown}
              className="px-4 py-2 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Export Markdown
            </button>
          )}
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Days journaled', value: report.daysJournaled },
              { label: 'Avg mood', value: report.averageMood != null ? `${report.averageMood}/5` : '—' },
              { label: 'Wins', value: report.allWins.length },
              { label: 'Losses', value: report.allLosses.length },
              { label: 'Tasks done', value: report.totalTasksCompleted },
              { label: 'Pomodoros', value: report.totalPomodoroSessions },
              { label: 'Focus time', value: formatElapsedShort(report.totalFocusTimeSeconds) || '—' },
              { label: 'Habits done', value: report.totalHabitsCompleted },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
              </div>
            ))}
          </div>

          {criteria.includeWins && report.allWins.length > 0 && (
            <ReportList title="🏆 All Wins" items={report.allWins} variant="win" />
          )}
          {criteria.includeLosses && report.allLosses.length > 0 && (
            <ReportList title="📉 All Losses" items={report.allLosses} variant="loss" />
          )}

          <div className="space-y-4">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Breakdown</h3>
            {report.days.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching entries in this range.</p>
            ) : (
              report.days.map(day => (
                <DayBlock key={day.date} day={day} criteria={criteria} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function splitLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

function ReportList({ title, items, variant }: {
  title: string
  items: { date: string; text: string }[]
  variant: 'win' | 'loss'
}) {
  const accent = variant === 'win' ? 'var(--success)' : 'var(--danger)'
  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="shrink-0 text-xs w-24" style={{ color: 'var(--text-muted)' }}>
              {new Date(item.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <span style={{ color: accent }}>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DayBlock({ day, criteria }: { day: JournalSummaryReport['days'][0]; criteria: JournalSummaryCriteria }) {
  const e = day.entry
  const s = day.stats
  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(day.date)}</h4>
        {e?.mood && criteria.includeMood && <span>{moodEmoji(e.mood)}</span>}
      </div>
      <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {e && criteria.includeWentWell && e.wentWell.trim() && (
          <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>Went well:</span> {e.wentWell.trim()}</p>
        )}
        {e && criteria.includeToImprove && e.toImprove.trim() && (
          <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>To improve:</span> {e.toImprove.trim()}</p>
        )}
        {e && criteria.includeWins && e.wins.trim() && (
          <div>
            <p className="font-medium" style={{ color: 'var(--success)' }}>Wins</p>
            <ul className="list-disc list-inside ml-1">{splitLines(e.wins).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
        {e && criteria.includeLosses && e.losses.trim() && (
          <div>
            <p className="font-medium" style={{ color: 'var(--danger)' }}>Losses</p>
            <ul className="list-disc list-inside ml-1">{splitLines(e.losses).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}
        {e && criteria.includeQuickNotes && e.quickNotes.trim() && (
          <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>Notes:</span> {e.quickNotes.trim()}</p>
        )}
        {s && (
          <div className="flex flex-wrap gap-3 pt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {criteria.includeTasksCompleted && s.tasksCompleted > 0 && <span>✅ {s.tasksCompleted} tasks</span>}
            {criteria.includePomodoros && s.pomodoroSessions > 0 && <span>⏱ {s.pomodoroSessions} pomodoros</span>}
            {criteria.includeHabits && s.habitsCompleted > 0 && <span>✅ {s.habitsCompleted}/{s.habitsTotal} habits</span>}
            {criteria.includeFocusTime && s.focusTimeSeconds > 0 && <span>🕐 {formatElapsedShort(s.focusTimeSeconds)}</span>}
            {criteria.includeNotesWritten && s.notesWritten > 0 && <span>📝 {s.notesWritten} notes</span>}
          </div>
        )}
      </div>
    </div>
  )
}
