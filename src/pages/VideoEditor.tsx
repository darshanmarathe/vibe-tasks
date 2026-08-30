import { useEffect, useRef, useState, useCallback } from 'react'
import type { RecordingEntry, EditorMetadata, EditorProgress } from '../types/models'

type OpState = 'idle' | 'running' | 'done' | 'error'

interface Output {
  path: string
  name: string
  label: string
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '00:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function videoUrl(p: string) {
  return `media://localhost/${encodeURIComponent(p)}`
}

function baseName(label: string) {
  const base = label.replace(/\.(webm|mp4|mov|mp3)$/i, '')
  const d = new Date()
  return `${base}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
}

export default function VideoEditor() {
  const [recordings, setRecordings] = useState<RecordingEntry[]>([])
  const [selected, setSelected] = useState<RecordingEntry | null>(null)
  const [meta, setMeta] = useState<EditorMetadata | null>(null)
  const [msg, setMsg] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null)

  // playback
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)

  // timeline trim markers (in/out)
  const [inSec, setInSec] = useState(0)
  const [outSec, setOutSec] = useState(0)
  const [cutA, setCutA] = useState(0)
  const [cutB, setCutB] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)

  // operation params
  const [speedFactor, setSpeedFactor] = useState(2)
  const [captionText, setCaptionText] = useState('')
  const [captionX, setCaptionX] = useState(20)
  const [captionY, setCaptionY] = useState(20)
  const [captionSize, setCaptionSize] = useState(32)
  const [captionColor, setCaptionColor] = useState('#ffffff')
  const [gainVal, setGainVal] = useState(2)

  const [opState, setOpState] = useState<OpState>('idle')
  const [progress, setProgress] = useState(0)
  const [opLabel, setOpLabel] = useState('')
  const [outputs, setOutputs] = useState<Output[]>([])
  const [resultPath, setResultPath] = useState<string | null>(null)

  const loadRecordings = useCallback(async () => {
    try {
      const list = await window.electronAPI.recorder.listRecordings()
      setRecordings(list)
    } catch (e: any) {
      setMsg({ kind: 'error', text: `Failed to load recordings: ${e?.message ?? e}` })
    }
  }, [])

  useEffect(() => {
    loadRecordings()
    const off = window.electronAPI.editor.onProgress((p: EditorProgress) => {
      setProgress(p.pct)
      setOpLabel(p.label)
    })
    return off
  }, [loadRecordings])

  const pickRecording = async (r: RecordingEntry) => {
    setSelected(r)
    setOutputs([])
    setResultPath(null)
    setCurrentTime(0)
    setInSec(0)
    setOutSec(0)
    setCutA(0)
    setCutB(0)
    const m = await window.electronAPI.editor.getMetadata(r.path)
    if (m.error) { setMsg({ kind: 'error', text: m.error }); return }
    setMeta(m)
    setDuration(m.durationSec)
    setOutSec(m.durationSec)
    setCutB(m.durationSec)
  }

  const seekTo = (t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, t))
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const onChangeTime = (e: any) => {
    const t = Number(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = t
      setCurrentTime(t)
    }
  }

  const runOp = async (promise: Promise<string>, label: string) => {
    setOpState('running')
    setProgress(0)
    setOpLabel('Starting…')
    setMsg(null)
    try {
      const p = await promise
      setOutputs(prev => [{ path: p, name: p.split(/[\\/]/).pop() || '', label }, ...prev])
      setResultPath(p)
      setOpState('done')
      setMsg({ kind: 'success', text: `${label} complete.` })
    } catch (e: any) {
      setOpState('error')
      setMsg({ kind: 'error', text: `${label} failed: ${e?.message ?? e}` })
    }
  }

  const doTrim = () => {
    if (!selected) return
    runOp(window.electronAPI.editor.trim({
      file: selected.path,
      outName: baseName(selected.name) + '-trim',
      start: inSec,
      end: Math.min(outSec, duration),
    }), 'Trim')
  }

  const doCut = () => {
    if (!selected) return
    const a = Math.min(cutA, cutB)
    const b = Math.max(cutA, cutB)
    runOp(window.electronAPI.editor.cut({
      file: selected.path,
      outName: baseName(selected.name) + '-cut',
      cutStart: a,
      cutEnd: b,
    }), 'Cut segment')
  }

  const doSpeed = () => {
    if (!selected) return
    runOp(window.electronAPI.editor.speed({
      file: selected.path,
      outName: baseName(selected.name) + '-speed',
      factor: speedFactor,
    }), 'Speed')
  }

  const doCaption = () => {
    if (!selected) return
    runOp(window.electronAPI.editor.caption({
      file: selected.path,
      outName: baseName(selected.name) + '-caption',
      text: captionText || 'Vibe Tasks',
      x: captionX,
      y: captionY,
      fontSize: captionSize,
      color: captionColor,
    }), 'Caption')
  }

  const doAudio = (mode: 'mute' | 'gain' | 'extract') => {
    if (!selected) return
    runOp(window.electronAPI.editor.audio({
      file: selected.path,
      outName: baseName(selected.name) + (mode === 'extract' ? '-audio' : mode === 'mute' ? '-muted' : '-gain'),
      mode,
      gain: mode === 'gain' ? gainVal : undefined,
    }), mode === 'mute' ? 'Mute' : mode === 'extract' ? 'Extract audio' : 'Audio gain')
  }

  const pct = duration ? (currentTime / duration) * 100 : 0
  const inPct = duration ? (inSec / duration) * 100 : 0
  const outPct = duration ? (outSec / duration) * 100 : 0
  const cutAPct = duration ? (cutA / duration) * 100 : 0
  const cutBPct = duration ? (cutB / duration) * 100 : 0

  const btn: React.CSSProperties = {
    backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)',
    border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px',
  }
  const accentBtn: React.CSSProperties = { ...btn, backgroundColor: 'var(--accent)', color: '#fff' }
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 8px', fontSize: '14px',
  }
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>✂️ Video Editor</h1>
        <button onClick={loadRecordings} style={btn}>🔄 Refresh</button>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{
          backgroundColor: msg.kind === 'error' ? 'rgba(220,38,38,0.15)' : msg.kind === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
          color: msg.kind === 'error' ? 'var(--danger)' : msg.kind === 'success' ? 'var(--accent)' : 'var(--text-secondary)',
        }}>{msg.text}</div>
      )}

      {/* Recording picker */}
      {!selected ? (
        <div style={cardStyle}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Choose a recording to edit</h2>
          {recordings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No recordings found. Record something on the <b>Screen Recorder</b> page first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recordings.map(r => (
                <button key={r.id} onClick={() => pickRecording(r)}
                  className="rounded-xl border p-3 text-left transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <video src={videoUrl(r.path)} className="w-full h-24 object-cover rounded-lg mb-2 bg-black" muted preload="metadata" />
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {(r.size / 1024 / 1024).toFixed(1)} MB · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.name}</h2>
              {meta && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatTime(meta.durationSec)} · {meta.width}×{meta.height} · {(meta.size / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
            <button onClick={() => { setSelected(null); setMeta(null); setResultPath(null); setOutputs([]) }} style={btn}>← Choose another</button>
          </div>

          {/* Preview player */}
          <div style={cardStyle}>
            <video
              ref={videoRef}
              src={videoUrl(selected.path)}
              controls
              className="w-full rounded-lg bg-black aspect-video"
              onTimeUpdate={e => { if (!scrubbing) setCurrentTime(e.currentTarget.currentTime) }}
              onLoadedMetadata={e => {
                const d = e.currentTarget.duration
                if (isFinite(d) && d > 0) { setDuration(d); setOutSec(d); setCutB(d) }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          </div>

          {/* Timeline */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              <span>Trim range: {formatTime(inSec)} – {formatTime(outSec)}</span>
              <span>Remove region: {formatTime(cutA)} – {formatTime(cutB)}</span>
            </div>
            <div className="relative h-14 rounded-lg overflow-hidden select-none" style={{ backgroundColor: 'var(--bg-primary)' }}>
              {/* full clip bar */}
              <div className="absolute inset-y-0" style={{ left: 0, right: 0, backgroundColor: 'rgba(59,130,246,0.08)' }} />
              {/* keep region (trim) */}
              <div className="absolute inset-y-0" style={{
                left: `${inPct}%`, right: `${100 - outPct}%`,
                backgroundColor: 'rgba(34,197,94,0.35)', border: '1px solid var(--accent)',
              }} />
              {/* cut region */}
              <div className="absolute inset-y-0" style={{
                left: `${cutAPct}%`, width: `${Math.max(0, cutBPct - cutAPct)}%`,
                backgroundColor: 'rgba(220,38,38,0.35)', border: '1px dashed var(--danger)',
              }} />
              {/* playhead */}
              <div className="absolute inset-y-0 w-0.5" style={{ left: `${pct}%`, backgroundColor: '#fff', zIndex: 5 }} />
            </div>
            <input
              type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
              onChange={onChangeTime} onMouseDown={() => setScrubbing(true)} onMouseUp={() => setScrubbing(false)}
              className="w-full mt-2"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Trim start {formatTime(inSec)}
                <input type="range" min={0} max={duration || 1} step={0.1} value={inSec}
                  onChange={e => { const v = Number(e.target.value); setInSec(Math.min(v, outSec)); seekTo(v) }} className="w-full" />
              </label>
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Trim end {formatTime(outSec)}
                <input type="range" min={0} max={duration || 1} step={0.1} value={outSec}
                  onChange={e => { const v = Number(e.target.value); setOutSec(Math.max(v, inSec)); seekTo(v) }} className="w-full" />
              </label>
              <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Remove from {formatTime(cutA)} to {formatTime(cutB)}
                <div className="flex gap-3">
                  <input type="range" min={0} max={duration || 1} step={0.1} value={cutA}
                    onChange={e => setCutA(Math.min(Number(e.target.value), cutB))} className="w-full" />
                  <input type="range" min={0} max={duration || 1} step={0.1} value={cutB}
                    onChange={e => setCutB(Math.max(Number(e.target.value), cutA))} className="w-full" />
                </div>
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={doTrim} style={accentBtn}>✂️ Save trimmed clip</button>
              <button onClick={doCut} style={accentBtn}>🔪 Remove segment</button>
            </div>
          </div>

          {/* Operations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Speed */}
            <div style={cardStyle}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Speed</h3>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                {speedFactor.toFixed(2)}×
                <input type="range" min={0.25} max={4} step={0.25} value={speedFactor}
                  onChange={e => setSpeedFactor(Number(e.target.value))} className="w-full" />
              </label>
              <button onClick={doSpeed} style={accentBtn}>⚡ Change speed</button>
            </div>

            {/* Caption */}
            <div style={cardStyle}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Text overlay</h3>
              <input
                value={captionText} onChange={e => setCaptionText(e.target.value)}
                placeholder="Caption text…" style={{ ...inputStyle, width: '100%', marginBottom: '8px' }}
              />
              <div className="flex flex-wrap gap-3 items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                <label>X <input type="number" value={captionX} onChange={e => setCaptionX(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} /> px</label>
                <label>Y <input type="number" value={captionY} onChange={e => setCaptionY(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} /> px</label>
                <label>
                  Size <input type="number" value={captionSize} onChange={e => setCaptionSize(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
                </label>
                <label>Color <input type="color" value={captionColor} onChange={e => setCaptionColor(e.target.value)} style={{ width: 40, height: 32 }} /></label>
              </div>
              <button onClick={doCaption} style={{ ...accentBtn, marginTop: 10 }}>🅰️ Burn caption</button>
            </div>

            {/* Audio */}
            <div style={cardStyle}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Audio</h3>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Gain: {gainVal.toFixed(1)}×
                <input type="range" min={0} max={5} step={0.1} value={gainVal} onChange={e => setGainVal(Number(e.target.value))} className="w-full" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => doAudio('mute')} style={btn}>🔇 Mute</button>
                <button onClick={() => doAudio('gain')} style={btn}>🔊 Apply gain</button>
                <button onClick={() => doAudio('extract')} style={btn}>🎵 Extract audio (MP3)</button>
              </div>
            </div>

            {/* Outputs */}
            <div style={cardStyle}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Outputs</h3>
              {opState === 'running' && (
                <div className="mb-2">
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{opLabel} {Math.round(progress)}%</p>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <div className="h-full transition-all" style={{ width: `${Math.min(100, progress)}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                </div>
              )}
              {outputs.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No outputs yet. Run an operation to generate a new file.</p>
              ) : (
                <div className="space-y-3">
                  {outputs.map((o, i) => (
                    <div key={i} className="rounded-lg p-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <video src={videoUrl(o.path)} controls className="w-full rounded bg-black mb-1" preload="metadata" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{o.name}</span>
                        <button onClick={() => window.electronAPI.editor.openFile(o.path)} style={{ ...btn, padding: '4px 8px', fontSize: 12 }}>📁 Open</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
