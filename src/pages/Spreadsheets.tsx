import { useCallback, useEffect, useRef, useState } from 'react'
import { Workbook } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'
import * as XLSX from 'xlsx'
import type { Spreadsheet } from '../types/models'

function ensureSheetData(data: string): any[] {
  const parsed = JSON.parse(data || '[]')
  return Array.isArray(parsed) && parsed.length > 0
    ? parsed
    : [{ id: 'sheet1', name: 'Sheet1', celldata: [] }]
}

function toCelldata(sheets: any[]): any[] {
  return sheets.map(sheet => {
    const s: any = { ...sheet }
    if (s.data && !s.celldata) {
      const celldata: any[] = []
      for (let r = 0; r < s.data.length; r++) {
        const row = s.data[r]
        if (!row) continue
        for (let c = 0; c < row.length; c++) {
          if (row[c] != null) celldata.push({ r, c, v: row[c] })
        }
      }
      s.celldata = celldata
      delete s.data
    }
    return s
  })
}

export default function Spreadsheets() {
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Spreadsheet | null>(null)
  const [dirty, setDirty] = useState(false)
  const [renaming, setRenaming] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const selectedRef = useRef<Spreadsheet | null>(null)
  const saveTimer = useRef<number | null>(null)
  const workbookRef = useRef<any>(null)

  useEffect(() => {
    window.electronAPI.getSpreadsheets().then(list => {
      setSpreadsheets(list)
      if (list.length > 0) setActiveId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (activeId === null) { setSelected(null); return }
    window.electronAPI.getSpreadsheet(activeId).then(s => {
      if (!s) return
      setSelected(s)
      setDirty(false)
    })
  }, [activeId])

  selectedRef.current = selected

  const handleCreate = async () => {
    await window.electronAPI.createSpreadsheet()
    const list = await window.electronAPI.getSpreadsheets()
    setSpreadsheets(list)
    if (list.length > 0) setActiveId(list[0].id)
  }

  const selectSpreadsheet = (id: number) => {
    setActiveId(id)
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteSpreadsheet(id)
    const list = await window.electronAPI.getSpreadsheets()
    setSpreadsheets(list)
    if (activeId === id) { setSelected(null); setActiveId(list.length > 0 ? list[0].id : null) }
  }

  const startRename = (id: number, name: string) => {
    setRenaming(id)
    setRenameValue(name)
  }

  const submitRename = async (id: number) => {
    const name = renameValue.trim()
    if (!name) { setRenaming(null); return }
    await window.electronAPI.updateSpreadsheet(id, { name })
    setSpreadsheets(prev => prev.map(x => x.id === id ? { ...x, name } : x))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, name } : null)
    setRenaming(null)
  }

  const handleChange = useCallback((data: any) => {
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const id = selectedRef.current?.id
    if (!id) return
    const celldata = toCelldata(data)
    saveTimer.current = window.setTimeout(async () => {
      try {
        await window.electronAPI.updateSpreadsheet(id, { data: JSON.stringify(celldata) })
        setDirty(false)
      } catch (err) {
        console.error('[Spreadsheet] auto-save error', err)
      }
    }, 5000)
  }, [])

  const handleSaveNow = async () => {
    const id = selectedRef.current?.id
    if (!id) return
    const sheets = workbookRef.current?.getAllSheets()
    if (!sheets || !Array.isArray(sheets)) return
    try {
      await window.electronAPI.updateSpreadsheet(id, { data: JSON.stringify(toCelldata(sheets)) })
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setDirty(false)
    } catch (err) {
      console.error('[Spreadsheet] save error', err)
    }
  }

  const handleExportXlsx = async () => {
    const s = selectedRef.current
    if (!s) return
    const workbookData = ensureSheetData(s.data)
    const wb = XLSX.utils.book_new()
    for (const sheet of workbookData) {
      const name = sheet.name || 'Sheet1'
      const rows: any[][] = []
      if (sheet.celldata && Array.isArray(sheet.celldata)) {
        for (const cell of sheet.celldata) {
          const r = cell.r ?? 0
          const c = cell.c ?? 0
          while (rows.length <= r) rows.push([])
          while (rows[r].length <= c) rows[r].push('')
          rows[r][c] = cell.v ?? ''
        }
      }
      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
    }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const path = await window.electronAPI.showSaveDialog({
      defaultPath: `${s.name}.xlsx`,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    })
    if (!path) return
    await window.electronAPI.writeBinaryFile(path, Array.from(new Uint8Array(buf)))
  }

  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('spreadsheets-sidebar') !== '0')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', transition: 'width 0.2s', overflow: 'hidden', width: sidebarOpen ? 240 : 0 }}>
        {sidebarOpen && (<>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={handleCreate}
            style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', color: '#fff', background: 'var(--accent)' }}>
            + New Spreadsheet
          </button>
          <button onClick={() => { setSidebarOpen(false); localStorage.setItem('spreadsheets-sidebar', '0') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '2px 4px' }}
            title="Collapse sidebar">◀</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {spreadsheets.map(s => (
            <div key={s.id}
              onClick={() => { if (renaming !== s.id) selectSpreadsheet(s.id) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', cursor: 'pointer', fontSize: 13,
                color: 'var(--text-primary)', background: activeId === s.id ? 'var(--accent)' : 'transparent',
                opacity: activeId === s.id ? 1 : 0.85
              }}>
              {renaming === s.id ? (
                <input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(s.id)}
                  onKeyDown={e => { if (e.key === 'Enter') submitRename(s.id); if (e.key === 'Escape') setRenaming(null) }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, fontSize: 13, padding: '2px 4px', border: '1px solid var(--accent)', borderRadius: 4, background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                />
              ) : (
                <span
                  style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
              )}
              {renaming !== s.id && (
                <>
                  <button onClick={e => { e.stopPropagation(); startRename(s.id, s.name) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4, padding: '2px 4px' }}
                    title="Rename">✎</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.5, padding: '2px 4px' }}
                    title="Delete">✕</button>
                </>
              )}
            </div>
          ))}
          {spreadsheets.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              No spreadsheets yet
            </div>
          )}
        </div>
        </>)}
      </div>

      {!sidebarOpen && (
        <button onClick={() => { setSidebarOpen(true); localStorage.setItem('spreadsheets-sidebar', '1') }}
          style={{ position: 'absolute', left: 0, top: 8, zIndex: 10, fontSize: 11, padding: '4px 6px', borderTopRightRadius: 6, borderBottomRightRadius: 6, border: 'none', cursor: 'pointer', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
          title="Expand sidebar">▶</button>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{selected.name}</span>
              {dirty && (
                <>
                  <button onClick={handleSaveNow}
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'var(--accent)', color: '#fff', fontWeight: 600 }}>
                    Save
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unsaved...</span>
                </>
              )}

              <div style={{ marginLeft: 'auto' }}>
                <button onClick={handleExportXlsx}
                  style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  Export XLSX
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }} key={selected.id}>
              <Workbook
                ref={workbookRef}
                data={ensureSheetData(selected.data)}
                onChange={handleChange}
              />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Select a spreadsheet or create a new one
          </div>
        )}
      </div>
    </div>
  )
}
