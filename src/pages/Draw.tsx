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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  const pendingExport = useRef<{format: string; resolve: (data: string) => void} | null>(null)

  const active = diagrams.find(d => d.id === activeId)

  useEffect(() => {
    loadDiagrams()
  }, [])

  async function loadDiagrams() {
    const list = await window.electronAPI.getDrawDiagrams()
    setDiagrams(list)
  }

  const handleMessage = useCallback((e: MessageEvent) => {
    const msg = e.data
    if (!msg || !msg.event) return

    if (msg.event === 'init') {
      readyRef.current = true
      if (activeId) sendToDrawio(activeId)
      return
    }

    if (msg.event === 'save') {
      saveToDb(activeId, msg.xml)
      return
    }

    if (msg.event === 'export') {
      const pending = pendingExport.current
      if (pending && pending.format === msg.format) {
        pending.resolve(msg.data)
        pendingExport.current = null
        return
      }
      saveExportedFile(msg)
    }
  }, [activeId, diagrams])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  function sendToDrawio(id: string) {
    const diag = diagrams.find(d => d.id === id)
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    const msg = diag?.data
      ? { action: 'load', xml: diag.data }
      : { action: 'template', xml: template() }
    iframe.contentWindow.postMessage(msg, '*')
  }

  function template() {
    return '<mxfile><diagram name="Diagram">%3CmxGraphModel%3E%3Croot%3E%3CmxCell%20id%3D%220%22%2F%3E%3CmxCell%20id%3D%221%22%20parent%3D%220%22%2F%3E%3C%2Froot%3E%3C%2FmxGraphModel%3E</diagram></mxfile>'
  }

  async function saveToDb(id: string | null, xml: string) {
    if (!id) return
    await window.electronAPI.saveDrawDiagram(id, xml)
    setDiagrams(prev => prev.map(d => d.id === id ? { ...d, data: xml, updated_at: new Date().toISOString() } : d))
  }

  function post(msg: any) {
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
  }

  function requestExport(format: string): Promise<string> {
    return new Promise(resolve => {
      pendingExport.current = { format, resolve }
      post({ action: 'export', format })
    })
  }

  async function saveToDbFromEditor() {
    if (!activeId || !readyRef.current) return
    const xml = await requestExport('xml')
    await saveToDb(activeId, xml)
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
    if (readyRef.current) post({ action: 'template', xml: template() })
  }

  async function deleteDiag(id: string) {
    await window.electronAPI.deleteDrawDiagram(id)
    setDiagrams(prev => prev.filter(d => d.id !== id))
    if (activeId === id) setActiveId(null)
  }

  async function renameDiag(id: string, name: string) {
    await window.electronAPI.renameDrawDiagram(id, name)
    setDiagrams(prev => prev.map(d => d.id === id ? { ...d, name } : d))
    setEditingId(null)
  }

  function selectDiag(id: string) {
    setActiveId(id)
    if (readyRef.current) sendToDrawio(id)
  }

  return (
    <div className="flex h-full gap-4">
      <div className="w-64 shrink-0 flex flex-col gap-2" style={{ color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Draw (BETA)</h2>
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
          </div>
        )}
        <div className="flex-1 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {active ? (
            <iframe ref={iframeRef} src={window.electronAPI.getDrawioUrl()} className="w-full h-full" onLoad={() => { readyRef.current = false }} title="Draw.io" />
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}><p>Select or create a diagram</p></div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Draw
