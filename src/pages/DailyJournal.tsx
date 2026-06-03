import { useCallback, useEffect, useRef, useState } from 'react'
import type { JournalDailyStats, JournalEntry, OnThisDayEntry } from '../types/models'
import MoodPicker from '../components/MoodPicker'
import JournalStatsPanel from '../components/JournalStatsPanel'
import OnThisDayPanel from '../components/OnThisDayPanel'
import JournalSummaryReport from '../components/JournalSummaryReport'
import LinkInput from '../components/LinkInput'

const JOURNAL_DATE_KEY = 'vibe-journal-date'

type Tab = 'daily' | 'summary'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function parseDateStr(date: string): Date {
  return new Date(date + 'T12:00:00')
}

function shiftDate(date: string, days: number): string {
  const d = parseDateStr(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatHeader(date: string): string {
  return parseDateStr(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const emptyForm = {
  mood: null as number | null,
  wentWell: '',
  toImprove: '',
  wins: '',
  losses: '',
  quickNotes: '',
}

const FORM_FIELDS = [
  { key: 'wentWell' as const, label: 'What went well', rows: 4, placeholder: 'Reflect on positives from today…' },
  { key: 'toImprove' as const, label: 'What to improve', rows: 4, placeholder: 'What could go better tomorrow…' },
  { key: 'wins' as const, label: 'Wins', rows: 4, placeholder: 'One win per line — shipped a feature, hit a goal…' },
  { key: 'losses' as const, label: 'Losses', rows: 4, placeholder: 'One loss per line — missed deadline, distraction…' },
  { key: 'quickNotes' as const, label: 'Quick notes', rows: 3, placeholder: 'Anything else worth remembering…' },
]

export default function DailyJournal() {
  const [tab, setTab] = useState<Tab>('daily')
  const [date, setDate] = useState(() => localStorage.getItem(JOURNAL_DATE_KEY) || todayStr())
  const [form, setForm] = useState(emptyForm)
  const [stats, setStats] = useState<JournalDailyStats | null>(null)
  const [onThisDay, setOnThisDay] = useState<OnThisDayEntry[]>([])
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipSave = useRef(true)

  const loadDay = useCallback(async (d: string) => {
    setLoading(true)
    skipSave.current = true
    const parsed = parseDateStr(d)
    const [entry, dayStats, past] = await Promise.all([
      window.electronAPI.getJournalEntry(d),
      window.electronAPI.getJournalDailyStats(d),
      window.electronAPI.getJournalOnThisDay(parsed.getMonth() + 1, parsed.getDate(), d),
    ])
    setForm({
      mood: entry?.mood ?? null,
      wentWell: entry?.wentWell ?? '',
      toImprove: entry?.toImprove ?? '',
      wins: entry?.wins ?? '',
      losses: entry?.losses ?? '',
      quickNotes: entry?.quickNotes ?? '',
    })
    setStats(dayStats)
    setOnThisDay(past)
    setSavedAt(entry?.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null)
    setLoading(false)
    setTimeout(() => { skipSave.current = false }, 0)
  }, [])

  useEffect(() => {
    if (tab !== 'daily') return
    localStorage.setItem(JOURNAL_DATE_KEY, date)
    loadDay(date)
  }, [date, loadDay, tab])

  const save = useCallback(async (d: string, data: typeof form) => {
    const hasContent = data.mood !== null
      || data.wentWell.trim() || data.toImprove.trim()
      || data.wins.trim() || data.losses.trim() || data.quickNotes.trim()
    if (!hasContent) return
    const saved: JournalEntry | null = await window.electronAPI.upsertJournalEntry(d, data)
    if (saved?.updatedAt) {
      setSavedAt(new Date(saved.updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))
    }
  }, [])

  useEffect(() => {
    if (skipSave.current || loading || tab !== 'daily') return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(date, form), 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [form, date, save, loading, tab])

  const update = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }))
  const goToday = () => setDate(todayStr())

  const textareaStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>📔 Daily Journal</h1>
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {(['daily', 'summary'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === t ? 'var(--accent)' : 'var(--bg-secondary)',
                color: tab === t ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {t === 'daily' ? 'Daily Entry' : 'Summary Report'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'summary' ? (
        <JournalSummaryReport />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setDate(d => shiftDate(d, -1))} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>◀</button>
            <span className="text-sm font-medium min-w-[180px] text-center" style={{ color: 'var(--text-primary)' }}>{formatHeader(date)}</span>
            <button type="button" onClick={() => setDate(d => shiftDate(d, 1))} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>▶</button>
            {date !== todayStr() && (
              <button type="button" onClick={goToday} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Today</button>
            )}
            {savedAt && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved {savedAt}</span>}
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <MoodPicker value={form.mood} onChange={m => update({ mood: m })} />

                {FORM_FIELDS.map(({ key, label, rows, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: key === 'wins' ? 'var(--success)' : key === 'losses' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {label}
                    </label>
                    <textarea
                      value={form[key]}
                      onChange={e => update({ [key]: e.target.value })}
                      rows={rows}
                      className="w-full rounded-xl border px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1"
                      style={textareaStyle}
                      placeholder={placeholder}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Links</label>
                  <LinkInput linkedType="journal" linkedId={date} />
                </div>

                <OnThisDayPanel entries={onThisDay} onSelectDate={setDate} />
              </div>

              <div>
                <JournalStatsPanel stats={stats} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
