import { useEffect, useState, useCallback, useRef } from 'react'
import type { Link, LinkCategory } from '../types/models'
import QRCode from 'qrcode'
// @ts-ignore - html5-qrcode has no types
import { Html5Qrcode } from 'html5-qrcode'

export default function Links() {
  const [links, setLinks] = useState<Link[]>([])
  const [categories, setCategories] = useState<LinkCategory[]>([])
  const [filterCat, setFilterCat] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [dashboard, setDashboard] = useState(false)
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null)
  const [qrModalData, setQrModalData] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const [l, c] = await Promise.all([
      window.electronAPI.getLinks(filterCat ? { categoryId: filterCat } : undefined),
      window.electronAPI.getLinkCategories(),
    ])
    setLinks(l)
    setCategories(c)
  }, [filterCat])

  useEffect(() => { load() }, [load])

  const openQrModal = async (linkUrl: string) => {
    setQrModalUrl(linkUrl)
    try {
      setQrModalData(await QRCode.toDataURL(linkUrl, { width: 400, margin: 2 }))
    } catch {
      setQrModalData('')
    }
  }

  const startScanner = async () => {
    setScanError('')
    setShowScanner(true)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* ignore */ }
      scannerRef.current = null
    }
    setShowScanner(false)
    setScanError('')
  }

  useEffect(() => {
    if (!showScanner || !scannerContainerRef.current) return
    let cancelled = false
    const run = async () => {
      try {
        const scanner = new Html5Qrcode('qr-scanner-container')
        scannerRef.current = scanner
        const cameras = await Html5Qrcode.getCameras()
        if (cameras.length === 0) { setScanError('No camera found'); return }
        const cameraId = cameras[cameras.length - 1].id
        await scanner.start(cameraId, { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (!cancelled) {
              setUrl(decodedText)
              stopScanner()
            }
          },
          () => { /* ignore partial scans */ }
        )
      } catch (err: any) {
        if (!cancelled) setScanError(err?.message || 'Camera access denied')
      }
    }
    run()
    return () => { cancelled = true; scannerRef.current?.stop().catch(() => {}) }
  }, [showScanner])

  const addLink = async () => {
    if (!url.trim()) return
    await window.electronAPI.createLink({
      url: url.trim(),
      text: text.trim() || url.trim(),
      category_id: categoryId || categories[0]?.id || undefined,
      display_on_dashboard: dashboard ? 1 : 0,
    })
    setUrl(''); setText(''); setDashboard(false); setShowAdd(false)
    load()
  }

  const toggleDashboard = async (link: Link) => {
    await window.electronAPI.updateLink(link.id, { display_on_dashboard: link.display_on_dashboard ? 0 : 1 })
    load()
  }

  const deleteLink = async (id: number) => {
    if (!window.confirm('Delete this link?')) return
    await window.electronAPI.deleteLink(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Links</h1>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+ Add Link</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl p-4 border space-y-3"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>URL</label>
              <div className="flex gap-2">
                <input value={url} onChange={e => setUrl(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <button onClick={startScanner} type="button"
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  title="Scan QR code from camera">📷 Scan</button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Text</label>
              <input value={text} onChange={e => setText(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <option value={0}>None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={dashboard} onChange={e => setDashboard(e.target.checked)} />
              Show on Dashboard
            </label>
            <div className="flex gap-2 pb-2">
              <button onClick={addLink} className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Save</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Category:</label>
        <select value={filterCat} onChange={e => setFilterCat(Number(e.target.value))}
          className="border rounded-lg px-3 py-1.5 text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value={0}>All</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
              <th className="text-left py-3 px-4">URL</th>
              <th className="text-left py-3 px-2">Text</th>
              <th className="text-left py-3 px-2">Category</th>
              <th className="text-center py-3 px-2">QR</th>
              <th className="text-center py-3 px-2">Dashboard</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map(link => (
              <tr key={link.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="py-3 px-4">
                  <button onClick={() => window.electronAPI.openExternal(link.url)}
                    className="hover:underline truncate block max-w-[300px] text-left"
                    style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>{link.url}</button>
                </td>
                <td className="py-3 px-2" style={{ color: 'var(--text-primary)' }}>{link.text}</td>
                <td className="py-3 px-2" style={{ color: 'var(--text-secondary)' }}>{(link as any).category_name || '—'}</td>
                <td className="py-3 px-2 text-center">
                  <button onClick={() => openQrModal(link.url)}
                    className="text-lg mx-auto" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    title="Show QR code">
                    📱
                  </button>
                </td>
                <td className="py-3 px-2 text-center">
                  <button onClick={() => toggleDashboard(link)}
                    className="text-sm"
                    style={{ color: link.display_on_dashboard ? 'var(--success)' : 'var(--text-muted)' }}>
                    {link.display_on_dashboard ? '✓' : '○'}
                  </button>
                </td>
                <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                  <button onClick={() => navigator.clipboard.writeText(link.url)}
                    className="text-xs" style={{ color: 'var(--text-secondary)' }}>Copy</button>
                  <button onClick={() => deleteLink(link.id)}
                    className="text-xs" style={{ color: 'var(--danger)' }}>Delete</button>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No links yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={stopScanner}>
          <div className="rounded-xl p-6 border w-full max-w-md" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Scan QR Code</h2>
              <button onClick={stopScanner} className="text-sm" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div ref={scannerContainerRef}>
              <div id="qr-scanner-container" className="w-full aspect-square rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }} />
            </div>
            {scanError && (
              <p className="text-sm text-center mt-3" style={{ color: 'var(--danger)' }}>{scanError}</p>
            )}
            <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>Point your camera at a QR code</p>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModalUrl !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setQrModalUrl(null)}>
          <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>QR Code</h2>
              <button onClick={() => setQrModalUrl(null)} className="text-sm" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            {qrModalData ? (
              <img src={qrModalData} alt={`QR for ${qrModalUrl}`} className="w-64 h-64 mx-auto rounded" />
            ) : (
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>Failed to generate QR code</p>
            )}
            <p className="text-xs text-center mt-3 truncate max-w-64 mx-auto" style={{ color: 'var(--text-secondary)' }}>{qrModalUrl}</p>
          </div>
        </div>
      )}
    </div>
  )
}
