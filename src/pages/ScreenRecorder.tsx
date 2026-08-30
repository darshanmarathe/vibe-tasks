import { useEffect, useState, useRef, useCallback } from 'react'
import type { RecordingSource, RecordingEntry } from '../types/models'

type RecState = 'idle' | 'previewing' | 'recording' | 'paused'

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function ScreenRecorder() {
  const [sources, setSources] = useState<RecordingSource[]>([])
  const [selected, setSelected] = useState<RecordingSource | null>(null)
  const [micAudio, setMicAudio] = useState(false)
  const [systemAudio, setSystemAudio] = useState(true)
  const [maxFps, setMaxFps] = useState(30)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [state, setState] = useState<RecState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [recordings, setRecordings] = useState<RecordingEntry[]>([])
  const [activeRecording, setActiveRecording] = useState<RecordingEntry | null>(null)
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [loadingSources, setLoadingSources] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const combinedStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadSources = useCallback(async () => {
    setLoadingSources(true)
    try {
      const list = await window.electronAPI.recorder.getSources()
      setSources(list)
    } catch (e: any) {
      setMsg({ kind: 'error', text: `Failed to load sources: ${e?.message ?? e}` })
    } finally {
      setLoadingSources(false)
    }
  }, [])

  const loadRecordings = useCallback(async () => {
    try {
      const list = await window.electronAPI.recorder.listRecordings()
      setRecordings(list)
    } catch (e: any) {
      setMsg({ kind: 'error', text: `Failed to load recordings: ${e?.message ?? e}` })
    }
  }, [])

  useEffect(() => {
    loadSources()
    loadRecordings()
  }, [loadSources, loadRecordings])

  // Re-acquire the preview stream when the system-audio toggle changes,
  // since the loopback audio track is bound at preview time.
  const previewedRef = useRef(false)
  useEffect(() => {
    if (previewedRef.current && selected && (state === 'previewing')) {
      selectSource(selected)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemAudio])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    combinedStreamRef.current?.getTracks().forEach(t => t.stop())
    combinedStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const selectSource = useCallback(async (src: RecordingSource) => {
    if (state === 'recording' || state === 'paused') return
    setSelected(src)
    setState('previewing')
    stopStream()
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: systemAudio
            ? {
                // @ts-ignore legacy desktop-capture constraints (system audio loopback)
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: src.id,
                },
              } as any
            : false,
          video: {
            // @ts-ignore legacy desktop-capture constraints (Electron/Chromium)
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: src.id,
              maxFrameRate: maxFps,
              maxWidth,
              maxHeight: Math.round(maxWidth * 0.5625),
            },
          },
        } as any)
      } catch {
        if (!systemAudio) throw new Error('Could not start preview')
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            // @ts-ignore legacy desktop-capture constraints (Electron/Chromium)
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: src.id,
              maxFrameRate: maxFps,
              maxWidth,
              maxHeight: Math.round(maxWidth * 0.5625),
            },
          },
        } as any)
        setMsg({ kind: 'error', text: 'System audio unavailable; previewing without sound' })
      }
      streamRef.current = stream
      previewedRef.current = true
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (e: any) {
      setMsg({ kind: 'error', text: `Could not preview source: ${e?.name ?? e?.message ?? e}` })
      setState('idle')
    }
  }, [maxFps, maxWidth, systemAudio, state])

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const startRecording = async () => {
    if (!selected || !streamRef.current) return
    const videoTrack = streamRef.current.getVideoTracks()[0]
    if (!videoTrack) { setMsg({ kind: 'error', text: 'No video track available' }); return }

    const tracks: MediaStreamTrack[] = [videoTrack]

    // System audio was captured together with video during preview (see selectSource).
    if (systemAudio) {
      streamRef.current.getAudioTracks().forEach(t => tracks.push(t))
    }

    if (micAudio) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        micStream.getAudioTracks().forEach(t => tracks.push(t))
      } catch {
        setMsg({ kind: 'error', text: 'Microphone unavailable, recording without mic audio' })
      }
    }

    if (tracks.length === 0) { setMsg({ kind: 'error', text: 'No tracks to record' }); return }
    const combined = new MediaStream(tracks)
    combinedStreamRef.current = combined

    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ]
    const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || ''
    const rec = new MediaRecorder(combined, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = rec
    chunksRef.current = []

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
      const suggested = `${selected.name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') || 'recording'}-${Date.now()}.webm`
      blob.arrayBuffer().then(buf => window.electronAPI.recorder.saveBlob(Array.from(new Uint8Array(buf as ArrayBuffer)), suggested))
        .then(() => {
          stopStream()
          setState('idle')
          setSelected(null)
          setElapsed(0)
          loadRecordings()
          setMsg({ kind: 'success', text: 'Recording saved.' })
        })
        .catch(() => {
          stopStream()
          setState('idle')
          setSelected(null)
          setElapsed(0)
          setMsg({ kind: 'error', text: 'Failed to save recording.' })
        })
    }

    rec.start(1000)
    setState('recording')
    setElapsed(0)
    stopTimer()
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    setMsg(null)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      mediaRecorderRef.current.stop()
      stopTimer()
    }
  }

  const togglePause = () => {
    const rec = mediaRecorderRef.current
    if (!rec) return
    if (state === 'recording') {
      rec.pause()
      stopTimer()
      setState('paused')
    } else if (state === 'paused') {
      rec.resume()
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
      setState('recording')
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    stopStream()
    stopTimer()
    setState('idle')
    setSelected(null)
    setElapsed(0)
  }

  const clearPreview = () => {
    if (state === 'recording' || state === 'paused') return
    stopStream()
    setState('idle')
    setSelected(null)
  }

  const renameRecording = async (r: RecordingEntry) => {
    const name = prompt('New recording name:', r.name)
    if (!name || name.trim() === r.name) return
    await window.electronAPI.recorder.renameRecording(r.id, name.trim())
    loadRecordings()
  }

  const deleteRecording = async (r: RecordingEntry) => {
    if (!window.confirm(`Delete "${r.name}"?`)) return
    await window.electronAPI.recorder.deleteRecording(r.id)
    loadRecordings()
  }

  const videoUrl = (r: RecordingEntry) => {
    return `media://localhost/${encodeURIComponent(r.path)}`
  }

  const btn: React.CSSProperties = {
    backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)',
    border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🎥 Screen Recorder</h1>
        <button onClick={() => { loadSources(); loadRecordings() }} style={btn}>🔄 Refresh</button>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{
          backgroundColor: msg.kind === 'error' ? 'rgba(220,38,38,0.15)' : 'rgba(34,197,94,0.15)',
          color: msg.kind === 'error' ? 'var(--danger)' : 'var(--accent)',
        }}>
          {msg.text}
        </div>
      )}

      {/* Source picker */}
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Select a screen or window</h2>
        {loadingSources ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading sources…</p>
        ) : sources.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No capture sources found. On macOS, ensure Screen Recording permission is granted.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sources.map(src => (
              <button key={src.id} onClick={() => selectSource(src)}
                className="rounded-xl border p-2 text-left transition-colors"
                style={{
                  backgroundColor: selected?.id === src.id ? 'var(--bg-hover)' : 'var(--bg-secondary)',
                  borderColor: selected?.id === src.id ? 'var(--accent)' : 'var(--border)',
                }}>
                {src.thumbnail ? (
                  <img src={src.thumbnail} alt={src.name} className="w-full h-24 object-cover rounded-lg mb-1.5" />
                ) : (
                  <div className="w-full h-24 rounded-lg mb-1.5 flex items-center justify-center text-3xl"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {src.type === 'screen' ? '🖥️' : '🪟'}
                  </div>
                )}
                <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{src.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{src.type === 'screen' ? 'Screen' : 'Window'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview + controls */}
      {state !== 'idle' && selected && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.name}</span>
              {state !== 'previewing' && (
                <span className="px-2 py-0.5 rounded text-xs font-mono" style={{
                  backgroundColor: state === 'recording' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
                  color: state === 'recording' ? 'var(--danger)' : '#eab308',
                }}>
                  {state === 'recording' ? '● REC' : '⏸ PAUSED'} {formatTime(elapsed)}
                </span>
              )}
            </div>
            {state === 'previewing' && (
              <button onClick={clearPreview} style={btn}>✕ Cancel</button>
            )}
          </div>

          <video ref={videoRef} muted className="w-full rounded-lg bg-black aspect-video" />

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {state === 'previewing' && (
              <button onClick={startRecording} style={{ ...btn, backgroundColor: 'var(--danger)' }}>● Start Recording</button>
            )}
            {state === 'recording' && (
              <>
                <button onClick={togglePause} style={btn}>⏸ Pause</button>
                <button onClick={stopRecording} style={{ ...btn, backgroundColor: 'var(--danger)' }}>⏹ Stop & Save</button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button onClick={togglePause} style={{ ...btn, backgroundColor: 'var(--accent)', color: '#fff' }}>▶ Resume</button>
                <button onClick={stopRecording} style={{ ...btn, backgroundColor: 'var(--danger)' }}>⏹ Stop & Save</button>
              </>
            )}
            {state !== 'previewing' && (
              <button onClick={cancelRecording} style={{ ...btn, backgroundColor: 'transparent', border: '1px solid var(--border)' }}>✕ Cancel</button>
            )}
          </div>

          {state === 'previewing' && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={systemAudio} onChange={e => setSystemAudio(e.target.checked)} /> Record system audio
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={micAudio} onChange={e => setMicAudio(e.target.checked)} /> Record microphone
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                FPS
                <select value={maxFps} onChange={e => setMaxFps(Number(e.target.value))}
                  className="border rounded-lg px-2 py-1 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {[15, 24, 30, 60].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Width
                <select value={maxWidth} onChange={e => setMaxWidth(Number(e.target.value))}
                  className="border rounded-lg px-2 py-1 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {[1280, 1920, 2560, 3840].map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Recordings library */}
      <div>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          Recordings <span className="text-xs text-[var(--text-muted)]">({recordings.length})</span>
        </h2>
        {recordings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No recordings yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recordings.map(r => (
              <div key={r.id} className="rounded-xl border p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <video src={videoUrl(r)} controls className="w-full rounded-lg bg-black mb-2 max-h-40" />
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(r.size)} · {new Date(r.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => renameRecording(r)}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>✏️ Rename</button>
                  <button onClick={() => window.electronAPI.recorder.openInFolder(r.id)}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>📁 Open</button>
                  <button onClick={() => deleteRecording(r)}
                    className="text-xs px-2 py-1 rounded-lg ml-auto"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--danger)' }}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
