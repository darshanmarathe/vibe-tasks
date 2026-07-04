import { useState, useEffect, useRef, useCallback } from 'react'
import type { FC } from 'react'

type DrawDiagram = {
  id: string
  name: string
  data: string
  created_at: string
  updated_at: string
}

const Draw: FC = () => {
  const [diagrams, setDiagrams] = useState<DrawDiagram[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  const pendingExport = useRef<{format: string; resolve: (data: string) => void} | null>(null)
  const loadedRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAutosaveRef = useRef<{ id: string, xml: string } | null>(null)

  const active = diagrams.find(d => d.id === activeId)

  useEffect(() => {
    loadDiagrams()
  }, [])

  async function loadDiagrams() {
    const list = await window.electronAPI.getDrawDiagrams()
    setDiagrams(list)
  }

  const handleMessage = useCallback((e: MessageEvent) => {
    let msg = e.data
    if (!msg) return
    if (typeof msg === 'string') {
      try { msg = JSON.parse(msg) } catch { return }
    }
    if (!msg.event) return
    console.log('[Draw] received message:', msg)

    if (msg.event === 'init') {
      readyRef.current = true
      const lid = loadedRef.current || activeId
      console.log('[Draw] init received, loadedRef:', lid)
      if (lid) {
        sendToDrawio(lid)
      } else {
        postWithRetry({ action: 'load', xml: template(), autosave: 1 })
      }
      return
    }

    if (msg.event === 'autosave' || msg.event === 'save') {
      const lid = loadedRef.current
      if (!lid || !msg.xml) return
      pendingAutosaveRef.current = { id: lid, xml: msg.xml }
      setDirty(true)
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = setTimeout(() => {
        const save = pendingAutosaveRef.current
        if (save) {
          console.log('[Draw] autosave saving to db, id:', save.id)
          saveToDb(save.id, save.xml)
          pendingAutosaveRef.current = null
        }
      }, 1000)
      return
    }

    if (msg.event === 'export') {
      const pending = pendingExport.current
      if (pending && pending.format === msg.format) {
        pending.resolve(msg.data || msg.xml)
        pendingExport.current = null
        return
      }
      saveExportedFile(msg)
    }

    if (msg.event === 'save_request') {
      console.log('[Draw] save_request from iframe')
      saveToDbFromEditor()
    }

    if (msg.event === 'close_request') {
      console.log('[Draw] close_request from iframe')
      window.electronAPI.closeWindow()
    }
  }, [activeId, diagrams])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  function postWithRetry(msg: any, retries = 5) {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      const data = typeof msg === 'string' ? msg : JSON.stringify(msg)
      console.log('[Draw] posting to iframe:', msg)
      iframe.contentWindow.postMessage(data, 'drawio://app')
      return
    }
    console.log('[Draw] no contentWindow yet, retries left:', retries)
    if (retries > 0) setTimeout(() => postWithRetry(msg, retries - 1), 200)
  }

  function sendToDrawio(id: string) {
    loadedRef.current = id
    const diag = diagrams.find(d => d.id === id)
    const rawXml = diag?.data || template()
    const xml = patchDiagramName(rawXml, diag?.name || 'Untitled')
    postWithRetry({ action: 'load', xml, autosave: 1 })
  }

  function patchDiagramName(xml: string, name: string): string {
    const safe = name.replace(/"/g, '&quot;')
    // If name attr exists, replace it; otherwise add it to <diagram>
    if (xml.includes('<diagram')) {
      if (/\bname="[^"]*"/.test(xml)) {
        return xml.replace(/(<diagram\b[^>]*?)\bname="[^"]*"/, `$1name="${safe}"`)
      }
      return xml.replace(/(<diagram)(\s)/, `$1 name="${safe}"$2`)
    }
    return xml
  }

  function template() {
    return '<mxfile><diagram name="Untitled"><mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'
  }

  async function saveToDb(id: string | null, xml: string) {
    if (!id) return
    await window.electronAPI.saveDrawDiagram(id, xml)
    setDiagrams(prev => prev.map(d => d.id === id ? { ...d, data: xml, updated_at: new Date().toISOString() } : d))
    setDirty(false)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  function post(msg: any) {
    const data = typeof msg === 'string' ? msg : JSON.stringify(msg)
    iframeRef.current?.contentWindow?.postMessage(data, 'drawio://app')
  }

  function requestExport(format: string): Promise<string> {
    return new Promise(resolve => {
      pendingExport.current = { format, resolve }
      post({ action: 'export', format })
    })
  }

  async function saveToDbFromEditor() {
    const lid = loadedRef.current
    if (!lid || savingRef.current) return
    savingRef.current = true
    try {
      const xml = await requestExport('xml')
      if (xml) {
        await saveToDb(lid, xml)
      }
    } finally {
      savingRef.current = false
    }
  }

  async function downloadDrawio() {
    if (!activeId || !readyRef.current) return
    const xml = await requestExport('xml')
    const fname = `${active?.name || 'diagram'}.drawio`
    const path = await window.electronAPI.showSaveDialog({
      defaultPath: fname,
      filters: [{ name: 'Draw.io Diagram', extensions: ['drawio'] }]
    })
    if (!path) return
    const buf = new TextEncoder().encode(xml)
    await window.electronAPI.writeBinaryFile(path, Array.from(buf))
  }

  async function exportImage(format: string) {
    if (!activeId || !readyRef.current) return
    setExporting(format)
    const data = await requestExport(format)
    setExporting(null)
    const ext = format === 'jpeg' ? 'jpg' : format
    const fname = `${active?.name || 'diagram'}.${ext}`
    const path = await window.electronAPI.showSaveDialog({
      defaultPath: fname,
      filters: [{ name: `${format.toUpperCase()} Image`, extensions: [ext] }]
    })
    if (!path) return
    const raw = atob(data)
    const buf = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
    await window.electronAPI.writeBinaryFile(path, Array.from(buf))
  }

  async function saveExportedFile(msg: any) {
    const format = msg.format || 'png'
    const ext = format === 'jpeg' ? 'jpg' : format
    const fname = `${active?.name || 'diagram'}.${ext}`
    const path = await window.electronAPI.showSaveDialog({
      defaultPath: fname,
      filters: [{ name: `${format.toUpperCase()} Image`, extensions: [ext] }]
    })
    if (!path) return
    const raw = atob(msg.data)
    const buf = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
    await window.electronAPI.writeBinaryFile(path, Array.from(buf))
  }

  async function createNew() {
    const diag = await window.electronAPI.createDrawDiagram('Untitled')
    setDiagrams(prev => [...prev, diag])
    setActiveId(diag.id)
    loadedRef.current = diag.id
    setDirty(false)
    setSavedFlash(false)
    postWithRetry({ action: 'load', xml: template(), autosave: 1 })
  }

  async function deleteDiag(id: string) {
    await window.electronAPI.deleteDrawDiagram(id)
    setDiagrams(prev => prev.filter(d => d.id !== id))
    if (activeId === id) setActiveId(null)
  }

  async function renameDiag(id: string, name: string) {
    // Flush pending autosave first so DB has latest XML
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
      const pending = pendingAutosaveRef.current
      if (pending) {
        await saveToDb(pending.id, pending.xml)
        pendingAutosaveRef.current = null
      }
    }
    await window.electronAPI.renameDrawDiagram(id, name)
    setDiagrams(prev => prev.map(d => d.id === id ? { ...d, name } : d))
    setEditingId(null)
    // Reload draw.io so the diagram name updates inside the editor
    if (loadedRef.current === id) {
      const diag = await window.electronAPI.getDrawDiagram(id)
      if (diag) {
        const xml = patchDiagramName(diag.data || template(), name)
        postWithRetry({ action: 'load', xml, autosave: 1 })
      }
    }
  }

  async function selectDiag(id: string) {
    if (id === activeId) return
    // Flush any pending autosave before switching
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
      const pending = pendingAutosaveRef.current
      if (pending) {
        await saveToDb(pending.id, pending.xml)
        pendingAutosaveRef.current = null
      }
    }
    setActiveId(id)
    setDirty(false)
    setSavedFlash(false)
    sendToDrawio(id)
  }

  return (
    <div className="flex h-full gap-4">
      <div className="w-64 shrink-0 flex flex-col gap-2" style={{ color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Draw</h2>
          <button onClick={createNew} className="px-3 py-1 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {diagrams.map(d => (
            <div key={d.id} onClick={() => selectDiag(d.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group"
              style={{ backgroundColor: activeId === d.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-secondary)' }}>
              {editingId === d.id ? (
                <input autoFocus defaultValue={d.name} onBlur={e => renameDiag(d.id, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameDiag(d.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 px-1 py-0.5 rounded text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  onClick={e => e.stopPropagation()} />
              ) : (
                <span className="flex-1 truncate" onDoubleClick={() => setEditingId(d.id)}>{d.name}</span>
              )}
              <div className="hidden group-hover:flex gap-1">
                <button onClick={e => { e.stopPropagation(); setEditingId(d.id) }} className="text-xs px-1 rounded hover:bg-[var(--bg-hover)]" title="Rename">✏️</button>
                <button onClick={e => { e.stopPropagation(); deleteDiag(d.id) }} className="text-xs px-1 rounded hover:bg-[var(--bg-hover)]" title="Delete">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {active && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <button onClick={saveToDbFromEditor} className="px-3 py-1 rounded transition-colors font-medium" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Save</button>
            {dirty && <span className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}><span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} /> Unsaved</span>}
            {!dirty && savedFlash && <span className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}><span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} /> Saved</span>}
            <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />
            <button onClick={downloadDrawio} className="px-2 py-1 rounded transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>.drawio</button>
            <button onClick={() => exportImage('png')} disabled={!!exporting} className="px-2 py-1 rounded transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>{exporting === 'png' ? '...' : 'PNG'}</button>
            <button onClick={() => exportImage('jpeg')} disabled={!!exporting} className="px-2 py-1 rounded transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>{exporting === 'jpeg' ? '...' : 'JPG'}</button>
            <button onClick={() => exportImage('svg')} disabled={!!exporting} className="px-2 py-1 rounded transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>{exporting === 'svg' ? '...' : 'SVG'}</button>
            <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />
          </div>
        )}
        <div className="flex-1 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {active ? (
            <iframe ref={iframeRef} src={window.electronAPI.getDrawioUrl()} className="w-full h-full" title="Draw.io" />
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}><p>Select or create a diagram</p></div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Draw
