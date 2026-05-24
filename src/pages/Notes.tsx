import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import type { Notebook, Note, TagWithCount } from '../types/models'

function WikiLinkPopup({ data, onSelect, onClose }: {
  data: { items: { id: string; title: string }[]; idx: number; left: number; top: number } | null
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [sel, setSel] = useState(data?.idx ?? 0)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSel(data?.idx ?? 0) }, [data?.idx])

  useEffect(() => {
    if (!data || !popupRef.current) return
    const el = popupRef.current.children[sel] as HTMLElement
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [sel, data])

  if (!data || data.items.length === 0) return null
  return (
    <div ref={popupRef}
      style={{ position: 'fixed', zIndex: 9999, left: data.left, top: data.top, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', padding: 4, maxHeight: 200, overflowY: 'auto', minWidth: 200 }}
      onMouseDown={e => e.preventDefault()}>
      {data.items.map((item, i) => (
        <div key={item.id} onClick={() => onSelect(item.id)}
          onMouseEnter={() => setSel(i)}
          style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13, color: 'var(--text-primary)', backgroundColor: i === sel ? 'var(--accent)' : 'transparent' }}>
          {item.title}
        </div>
      ))}
    </div>
  )
}

function QuickSwitcher({ onClose, onSelect }: { onClose: () => void; onSelect: (note: Note) => void }) {
  const [query, setQuery] = useState('')
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { window.electronAPI.getAllNotes().then(setAllNotes); inputRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return allNotes
    const lq = query.toLowerCase()
    return allNotes.filter(n => n.title.toLowerCase().includes(lq))
  }, [query, allNotes])

  useEffect(() => { setSelectedIdx(0) }, [query])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[selectedIdx]) { onSelect(filtered[selectedIdx]); onClose() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-[480px] rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}
        onClick={e => e.stopPropagation()}>
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
          placeholder="Search notes..."
          className="w-full px-4 py-3 text-sm border-none outline-none" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.map((note, i) => (
            <div key={note.id} onClick={() => { onSelect(note); onClose() }}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors"
              style={{ backgroundColor: i === selectedIdx ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}>
              <span className="truncate flex-1">{note.title}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                {new Date(note.updated_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No notes found</p>}
        </div>
      </div>
    </div>
  )
}

function TagInput({ noteId, onTagsChange }: { noteId: string; onTagsChange: () => void }) {
  const [value, setValue] = useState('')
  const [allTags, setAllTags] = useState<TagWithCount[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => { window.electronAPI.getAllTags().then(setAllTags) }, [noteId])

  const suggestions = useMemo(() => {
    if (!value.trim()) return []
    const lv = value.toLowerCase()
    return allTags.filter(t => t.name.toLowerCase().includes(lv))
  }, [value, allTags])

  const addTag = async (name: string) => {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed) return
    const tags = await window.electronAPI.getAllTags()
    let tag = tags.find((t: any) => t.name === trimmed)
    if (!tag) {
      tag = await window.electronAPI.createTag(trimmed)
    }
    if (tag) {
      await window.electronAPI.addTagToNote(noteId, tag.id)
      setValue('')
      setShowSuggestions(false)
      onTagsChange()
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <input value={value} onChange={e => { setValue(e.target.value); setShowSuggestions(true) }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(value) } }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder="Add tag..."
        className="w-24 text-xs border rounded px-2 py-1" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-10 rounded-lg shadow-lg border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          {suggestions.map(t => (
            <div key={t.id} onMouseDown={() => addTag(t.name)}
              className="px-3 py-1.5 text-xs cursor-pointer hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
              {t.name} <span style={{ color: 'var(--text-muted)' }}>({t.count})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Notes() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)
  const [noteTags, setNoteTags] = useState<any[]>([])
  const [backlinks, setBacklinks] = useState<{ id: string; title: string; notebook_id: string }[]>([])
  const [allTags, setAllTags] = useState<TagWithCount[]>([])
  const [filterTagId, setFilterTagId] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 })
  const [wikilinkPopup, setWikilinkPopup] = useState<{ items: { id: string; title: string }[]; idx: number; left: number; top: number } | null>(null)
  const [sortBy, setSortBy] = useState('updated')
  const [showNotebookColor, setShowNotebookColor] = useState<string | null>(null)
  const [templateNotes, setTemplateNotes] = useState<Note[]>([])
  const wikilinkHandler = useRef<{ items: { id: string; title: string }[]; idx: number; ed: any; matchStr: string }>({ items: [], idx: 0, ed: null, matchStr: '' })
  const allNoteTitles = useRef<{ id: string; title: string }[]>([])
  useEffect(() => { window.electronAPI.searchNoteTitles('').then(r => { allNoteTitles.current = r }) }, [])

  const autoSaveTimer = useRef<number | null>(null)
  const isNewNote = useRef(false)
  const skipAutoSave = useRef(false)

  const navigateToNote = useCallback(async (noteId: string) => {
    const note = await window.electronAPI.getNoteById(noteId)
    if (note) selectNote(note)
  }, [])

  const refreshNoteTitles = async () => {
    const r = await window.electronAPI.searchNoteTitles('')
    allNoteTitles.current = r
  }

  const detectWikilink = (ed: any) => {
    const text = ed.state.doc.textBetween(Math.max(0, ed.state.selection.from - 20), ed.state.selection.from)
    const match = text.match(/\[\[([^\]]*)$/)
    if (match) {
      const query = match[1].toLowerCase()
      const results = allNoteTitles.current.filter(t => t.title.toLowerCase().includes(query)).slice(0, 10)
      if (results.length > 0) {
        const coords = ed.view.coordsAtPos(ed.state.selection.from)
        const h = wikilinkHandler.current
        h.items = results; h.idx = 0; h.ed = ed; h.matchStr = match[0]
        setWikilinkPopup({ items: results, idx: 0, left: Math.min(coords.left, window.innerWidth - 220), top: coords.bottom + 4 })
      } else {
        setWikilinkPopup(null)
        wikilinkHandler.current.items = []
      }
    } else {
      setWikilinkPopup(null)
      wikilinkHandler.current.items = []
    }
  }

  const insertWikilink = (h: { items: { id: string; title: string }[]; idx: number; ed: any; matchStr: string }) => {
    if (!h.ed) return
    const from = h.ed.state.selection.from - h.matchStr.length
    const to = h.ed.state.selection.from
    const item = h.items[h.idx]
    h.ed.chain().focus().deleteRange({ from, to }).insertContent(`[[${item.title}]]`).run()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); setShowQuickSwitcher(true) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        const today = new Date().toISOString().slice(0, 10)
        const todayTitle = today
        window.electronAPI.getNoteByTitle(todayTitle).then(async note => {
          if (note) {
            selectNote(note)
          } else {
            const nbId = selectedNotebook || (await window.electronAPI.getNotebooks())[0]?.id
            if (nbId) {
              const created = await window.electronAPI.createNote(nbId, todayTitle)
              loadNotes(nbId)
              selectNote(created)
            }
          }
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNotebook])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ taskList: false, taskItem: false }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[300px] px-0',
        style: 'color: var(--text-primary); font-size: 0.875rem; line-height: 1.7;',
      },
      handleClick: (view: any, pos: number, event: MouseEvent) => {
        const doc = view.state.doc
        const before = doc.textBetween(Math.max(0, pos - 100), pos)
        const after = doc.textBetween(pos, Math.min(doc.content.size, pos + 100))
        const text = before + '|' + after
        const regex = /\[\[([^\]]+)\]\]/g
        let match
        while ((match = regex.exec(text)) !== null) {
          const absStart = Math.max(0, pos - 100) + match.index
          const absEnd = absStart + match[0].length
          if (pos >= absStart && pos < absEnd) {
            const title = match[1]
            const found = allNoteTitles.current.find(t => t.title.toLowerCase() === title.toLowerCase())
            if (found) { navigateToNote(found.id); return true }
            break
          }
        }
        return false
      },
      handleKeyDown: (_view: any, event: KeyboardEvent) => {
        return wikiRef.current?.onKeyDown(event) === true
      },
      handleDrop: (view: any, event: DragEvent, _slice: any, _moved: boolean) => {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            const reader = new FileReader()
            reader.onload = () => {
              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
              if (pos) {
                view.dispatch(view.state.tr.insert(pos.pos, view.state.schema.nodes.image.create({ src: reader.result })))
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
      handlePaste: (view: any, event: ClipboardEvent) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              const reader = new FileReader()
              reader.onload = () => {
                const pos = view.state.selection.from
                view.dispatch(view.state.tr.insert(pos, view.state.schema.nodes.image.create({ src: reader.result })))
              }
              reader.readAsDataURL(file)
            }
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (skipAutoSave.current) { skipAutoSave.current = false; return }
      triggerAutoSave()
      detectWikilink(ed)
      const text = ed.getText()
      const words = text.split(/\s+/).filter(Boolean).length
      const chars = text.length
      setWordCount({ words, chars })
    },
  })

  const loadNotebooks = useCallback(async () => {
    const nb = await window.electronAPI.getNotebooks()
    setNotebooks(nb)
    if (nb.length > 0 && !selectedNotebook) setSelectedNotebook(nb[0].id)
    const templatesNb = nb.find((n: Notebook) => n.name === 'Templates')
    if (templatesNb) {
      const tn = await window.electronAPI.getNotes(templatesNb.id)
      setTemplateNotes(tn)
    } else {
      setTemplateNotes([])
    }
  }, [])

  useEffect(() => { loadNotebooks() }, [loadNotebooks])

  const refreshAllTags = useCallback(async () => {
    const tags = await window.electronAPI.getAllTags()
    setAllTags(tags)
  }, [])

  useEffect(() => { refreshAllTags() }, [refreshAllTags])

  const loadNotes = useCallback(async (notebookId: string) => {
    const n = filterTagId
      ? await window.electronAPI.getNotesByTag(filterTagId)
      : await window.electronAPI.getNotes(notebookId, sortBy)
    setNotes(n)
    setSearchResults(null)
    refreshAllTags()
  }, [filterTagId, refreshAllTags, sortBy])

  useEffect(() => {
    if (filterTagId) loadNotes('')
    else if (selectedNotebook) loadNotes(selectedNotebook)
  }, [selectedNotebook, filterTagId, loadNotes])

  const selectNote = useCallback(async (note: Note) => {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }
    isNewNote.current = false
    setSelectedNote(note)
    setEditTitle(note.title)
    if (editor) {
      skipAutoSave.current = true
      editor.commands.setContent(note.content || '<p></p>')
    }
    const tags = await window.electronAPI.getNoteTags(note.id)
    setNoteTags(tags)
    const bl = await window.electronAPI.getBacklinks(note.title, note.id)
    setBacklinks(bl)
    const text = editor?.getText() || ''
    setWordCount({ words: text.split(/\s+/).filter(Boolean).length, chars: text.length })
  }, [editor])

  const handleCreateNote = async () => {
    if (!selectedNotebook) return
    isNewNote.current = true
    const note = await window.electronAPI.createNote(selectedNotebook, 'Untitled')
    if (note) {
      loadNotes(selectedNotebook)
      await selectNote(note)
      refreshNoteTitles()
    }
  }

  const triggerAutoSave = (title?: string) => {
    if (!selectedNote || isNewNote.current) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(async () => {
      await window.electronAPI.saveNote(selectedNote.id, title ?? editTitle, editor?.getHTML() || '')
      loadNotes(selectedNotebook!)
      refreshNoteTitles()
    }, 1000)
  }

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) return
    const nb = await window.electronAPI.createNotebook(newNotebookName.trim())
    setNewNotebookName('')
    loadNotebooks()
    setSelectedNotebook(nb.id)
  }

  const handleDeleteNotebook = async (id: string) => {
    if (!window.confirm('Delete this notebook and all its notes?')) return
    await window.electronAPI.deleteNotebook(id)
    if (selectedNotebook === id) { setSelectedNotebook(null); setSelectedNote(null); setNotes([]) }
    loadNotebooks()
  }

  const handleTrashNote = async (id: string) => {
    await window.electronAPI.trashNote(id)
    setSelectedNote(null)
    loadNotes(selectedNotebook!)
  }

  const handleTogglePin = async (id: string) => {
    await window.electronAPI.togglePin(id)
    loadNotes(selectedNotebook!)
    if (selectedNote?.id === id) {
      const updated = await window.electronAPI.getNoteById(id)
      if (updated) setSelectedNote(updated)
    }
  }

  const handleSearch = async (q: string) => {
    setSearch(q)
    if (!q.trim()) { setSearchResults(null); return }
    const results = await window.electronAPI.searchNotes(q)
    setSearchResults(results)
  }

  const handleExportMarkdown = async () => {
    if (!selectedNote) return
    await window.electronAPI.exportNoteAsMarkdown(selectedNote.id)
  }

  const handleDuplicate = async () => {
    if (!selectedNote) return
    const dup = await window.electronAPI.duplicateNote(selectedNote.id)
    if (dup) {
      loadNotes(selectedNotebook!)
      selectNote(dup)
      refreshNoteTitles()
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!selectedNote) return
    let templatesNb = notebooks.find(nb => nb.name === 'Templates')
    if (!templatesNb) {
      templatesNb = await window.electronAPI.createNotebook('Templates')
      loadNotebooks()
    }
    await window.electronAPI.createNote(templatesNb.id, `${selectedNote.title} (Template)`)
    // Copy content
    const created = await window.electronAPI.getNoteByTitle(`${selectedNote.title} (Template)`)
    if (created) {
      await window.electronAPI.saveNote(created.id, created.title, editor?.getHTML() || '')
    }
  }

  const handleCreateFromTemplate = async (templateNote: Note) => {
    if (!selectedNotebook) return
    isNewNote.current = true
    const note = await window.electronAPI.createNote(selectedNotebook, templateNote.title.replace(' (Template)', ''))
    if (note) {
      await window.electronAPI.saveNote(note.id, note.title, templateNote.content)
      loadNotes(selectedNotebook)
      selectNote(note)
      refreshNoteTitles()
    }
  }

  const handleNotebookColor = async (id: string, color: string) => {
    await window.electronAPI.setNotebookColor(id, color)
    loadNotebooks()
    setShowNotebookColor(null)
  }

  const reloadTags = async () => {
    await refreshAllTags()
    if (selectedNote) {
      const t = await window.electronAPI.getNoteTags(selectedNote.id)
      setNoteTags(t)
    }
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 -m-6" style={{ position: 'relative' }}>
      {showQuickSwitcher && <QuickSwitcher onClose={() => setShowQuickSwitcher(false)} onSelect={selectNote} />}
      <WikiLinkPopup data={wikilinkPopup} onSelect={(id) => { const h = wikilinkHandler.current; const item = h.items.find(i => i.id === id); if (item) { h.idx = h.items.indexOf(item); insertWikilink(h); setWikilinkPopup(null); h.items = [] } }} onClose={() => { setWikilinkPopup(null); wikilinkHandler.current.items = [] }} />

      {/* Notebooks sidebar */}
      <div className="w-52 shrink-0 border-r flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search notes..."
            className="w-full border rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {notebooks.map(nb => (
            <div key={nb.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm group transition-colors"
              style={{ backgroundColor: selectedNotebook === nb.id && !filterTagId ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)', borderLeft: nb.color ? `3px solid ${nb.color}` : '3px solid transparent' }}
              onClick={() => { setSelectedNotebook(nb.id); setFilterTagId(null) }}
            >
              <span className="shrink-0">{nb.color ? '📔' : '📓'}</span>
              <span className="truncate flex-1">{nb.name}</span>
              {showNotebookColor === nb.id && (
                <div className="absolute left-0 top-full mt-1 z-20 flex gap-1 p-1.5 rounded-lg border shadow-lg" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
                  {['#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#89b4fa', '#b4befe', '#cdd6f4', '#a6adc8', '#585b70', ''].map(c => (
                    <div key={c || 'none'} onClick={() => handleNotebookColor(nb.id, c)}
                      className="w-4 h-4 rounded-full cursor-pointer border" style={{ backgroundColor: c || 'transparent', borderColor: 'var(--border)' }} title={c || 'None'} />
                  ))}
                </div>
              )}
              <button onClick={e => { e.stopPropagation(); setShowNotebookColor(showNotebookColor === nb.id ? null : nb.id) }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} title="Color">🎨</button>
              <button onClick={e => { e.stopPropagation(); handleDeleteNotebook(nb.id) }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>✕</button>
            </div>
          ))}
          {/* Templates section */}
          {templateNotes.length > 0 && <div className="pt-3 pb-1 px-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>TEMPLATES</div>}
          {templateNotes.map(tn => (
            <div key={tn.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => handleCreateFromTemplate(tn)}
              title="Click to create a new note from this template">
              <span className="shrink-0">📄</span>
              <span className="truncate flex-1">{tn.title.replace(' (Template)', '')}</span>
            </div>
          ))}
          {/* Tags section */}
          {allTags.length > 0 && <div className="pt-3 pb-1 px-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>TAGS</div>}
          {allTags.map(t => (
            <div key={t.id}
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm transition-colors"
              style={{ backgroundColor: filterTagId === t.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              onClick={() => { setFilterTagId(t.id); setSelectedNotebook(null) }}
            >
              <span className="shrink-0">🏷️</span>
              <span className="truncate flex-1">{t.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.count}</span>
              <button onClick={async (e) => { e.stopPropagation(); await window.electronAPI.deleteTag(t.id); if (filterTagId === t.id) setFilterTagId(null); refreshAllTags() }}
                className="opacity-0 group-hover:opacity-100 ml-auto text-xs px-1 rounded transition-opacity"
                style={{ color: 'var(--text-muted)' }}
                title="Delete tag">&times;</button>
            </div>
          ))}
        </div>
        <div className="p-2 border-t flex gap-1" style={{ borderColor: 'var(--border)' }}>
          <input value={newNotebookName} onChange={e => setNewNotebookName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateNotebook()}
            placeholder="New notebook..."
            className="flex-1 border rounded px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          <button onClick={handleCreateNotebook} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+</button>
        </div>
      </div>

      {/* Notes list */}
      <div className="w-60 shrink-0 border-r flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {searchResults !== null ? 'Search Results' : filterTagId ? allTags.find(t => t.id === filterTagId)?.name || 'Notes' : 'Notes'}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowQuickSwitcher(true)} className="text-xs px-1.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }} title="Quick Switcher (Ctrl+P)">🔍</button>
              <button onClick={() => window.electronAPI.openNotesHelp()} className="text-xs px-1.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }} title="Help">?</button>
              <button onClick={handleCreateNote} className="text-xs px-2 py-1 rounded font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+ New</button>
            </div>
          </div>
          {!searchResults && !filterTagId && (
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value="updated">Last modified</option>
              <option value="created">Created</option>
              <option value="alpha">Alphabetical</option>
            </select>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(searchResults !== null ? searchResults : notes).map(note => (
            <div key={note.id}
              className="px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group"
              style={{ backgroundColor: selectedNote?.id === note.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              onClick={() => selectNote(note)}
            >
              <div className="flex items-center gap-1.5">
                <button onClick={e => { e.stopPropagation(); handleTogglePin(note.id) }}
                  className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title={note.is_pinned ? 'Unpin' : 'Pin'}>
                  {note.is_pinned ? '📌' : '📍'}
                </button>
                <p className="font-medium truncate flex-1">{note.title}</p>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {formatDate(note.updated_at)}
                {note.content && ` · ${Math.max(1, Math.ceil((note.content.split(/\s+/).filter(Boolean).length || 0) / 200))} min`}
              </p>
            </div>
          ))}
          {(searchResults !== null ? searchResults : notes).length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No notes yet.</p>
          )}
        </div>
      </div>

      {/* Note editor */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {selectedNote ? (
          <>
            <div className="px-4 pt-4 pb-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <input value={editTitle} onChange={e => { setEditTitle(e.target.value); triggerAutoSave(e.target.value) }}
                className="text-lg font-semibold bg-transparent border-none outline-none flex-1 mr-4" style={{ color: 'var(--text-primary)' }} />
              <div className="flex items-center gap-2">
                <button onClick={handleDuplicate}
                  className="text-xs px-2.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }} title="Duplicate">📋</button>
                <button onClick={handleSaveAsTemplate}
                  className="text-xs px-2.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }} title="Save as template">📄</button>
                <button onClick={handleExportMarkdown}
                  className="text-xs px-2.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }} title="Export as Markdown">📥</button>
                <button onClick={() => handleTrashNote(selectedNote.id)}
                  className="text-xs px-2.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>Trash</button>
              </div>
            </div>
            {/* Tags */}
            <div className="px-4 py-2 border-b flex flex-wrap items-center gap-1.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              {noteTags.map((t: any) => (
                <span key={t.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  {t.name}
                  <button onClick={async () => {
                    await window.electronAPI.removeTagFromNote(selectedNote.id, t.id)
                    reloadTags()
                  }} className="ml-0.5 opacity-70 hover:opacity-100">✕</button>
                </span>
              ))}
              <TagInput noteId={selectedNote.id} onTagsChange={reloadTags} />
            </div>
            {editor && <MenuBar editor={editor} />}
            <div className="flex-1 overflow-y-auto p-4">
              <EditorContent editor={editor} />
              {/* Backlinks */}
              {backlinks.length > 0 && (
                <div className="mt-8 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Backlinks ({backlinks.length})</p>
                  <div className="space-y-1">
                    {backlinks.map(bl => (
                      <div key={bl.id} onClick={() => navigateToNote(bl.id)}
                        className="px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {bl.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Word Count */}
            <div className="px-4 py-1.5 border-t text-xs flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              <span>{wordCount.words} words</span>
              <span>{wordCount.chars} characters</span>
              <span>{Math.ceil(wordCount.words / 200)} min read</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MenuBar({ editor }: { editor: any }) {
  if (!editor) return null
  const btn = (label: string, action: () => void, active?: boolean) => (
    <button onClick={action} className="px-2 py-1 rounded text-xs font-medium transition-colors" style={{ backgroundColor: active ? 'var(--accent)' : 'var(--bg-hover)', color: active ? '#fff' : 'var(--text-secondary)' }}>
      {label}
    </button>
  )
  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
      {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {btn('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
      {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
      {btn('•', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
      {btn('1.', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {btn('☑', () => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList'))}
      {btn('⊞', () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), editor.isActive('table'))}
      {editor.isActive('table') && <>
        {btn('➕', () => editor.chain().focus().addColumnAfter().run())}
        {btn('➖', () => editor.chain().focus().deleteColumn().run())}
        {btn('➕R', () => editor.chain().focus().addRowAfter().run())}
        {btn('➖R', () => editor.chain().focus().deleteRow().run())}
      </>}
      {btn('<>', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'))}
      {btn('❄', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
    </div>
  )
}
