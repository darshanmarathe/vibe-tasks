import { useEffect, useState, useCallback, useRef } from 'react'
import type { Notebook, Note } from '../types/models'

function renderMarkdown(text: string): string {
  if (!text) return '<p style="color:var(--text-muted)">Start writing...</p>'
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-2 mb-1" style="color:var(--text-primary)">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1" style="color:var(--text-primary)">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1" style="color:var(--text-primary)">$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc" style="color:var(--text-secondary)">$1</li>')
  html = html.replace(/`(.+?)`/g, '<code class="text-xs px-1 rounded" style="background:var(--bg-hover);color:var(--accent)">$1</code>')
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--accent)">$1</a>')
  html = html.replace(/\n/g, '<br>')
  return html
}

export default function Notes() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Note[] | null>(null)
  const [newNotebookName, setNewNotebookName] = useState('')
  const autoSaveTimer = useRef<number | null>(null)

  const loadNotebooks = useCallback(async () => {
    const nb = await window.electronAPI.getNotebooks()
    setNotebooks(nb)
    if (nb.length > 0 && !selectedNotebook) setSelectedNotebook(nb[0].id)
  }, [])

  useEffect(() => { loadNotebooks() }, [loadNotebooks])

  const loadNotes = useCallback(async (notebookId: string) => {
    const n = await window.electronAPI.getNotes(notebookId)
    setNotes(n)
    setSearchResults(null)
  }, [])

  useEffect(() => {
    if (selectedNotebook) loadNotes(selectedNotebook)
  }, [selectedNotebook, loadNotes])

  const selectNote = (note: Note) => {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }
    setSelectedNote(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setPreview(false)
  }

  const handleAutoSave = (title: string, content: string) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(async () => {
      if (selectedNote) {
        await window.electronAPI.saveNote(selectedNote.id, title, content)
        loadNotes(selectedNotebook!)
      }
    }, 1000)
  }

  const handleCreateNote = async () => {
    console.log('[Notes] handleCreateNote clicked, selectedNotebook:', selectedNotebook)
    if (!selectedNotebook) { console.warn('[Notes] no notebook selected'); return }
    console.log('[Notes] calling createNote IPC...')
    const note = await window.electronAPI.createNote(selectedNotebook, 'Untitled')
    console.log('[Notes] createNote returned:', note)
    if (note) {
      loadNotes(selectedNotebook)
      selectNote(note)
    } else {
      console.error('[Notes] createNote returned null/undefined')
    }
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

  const handleSearch = async (q: string) => {
    setSearch(q)
    if (!q.trim()) { setSearchResults(null); return }
    const results = await window.electronAPI.searchNotes(q)
    setSearchResults(results)
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 -m-6">
      {/* Notebooks sidebar */}
      <div className="w-52 shrink-0 border-r flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full border rounded-lg px-2.5 py-1.5 text-xs"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {notebooks.map(nb => (
            <div key={nb.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm group transition-colors"
              style={{ backgroundColor: selectedNotebook === nb.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              onClick={() => setSelectedNotebook(nb.id)}
            >
              <span className="shrink-0">📓</span>
              <span className="truncate flex-1">{nb.name}</span>
              <button onClick={e => { e.stopPropagation(); handleDeleteNotebook(nb.id) }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>✕</button>
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
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {searchResults !== null ? 'Search Results' : 'Notes'}
          </span>
          <button onClick={handleCreateNote} className="text-xs px-2 py-1 rounded font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+ New</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(searchResults !== null ? searchResults : notes).map(note => (
            <div key={note.id}
              className="px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors"
              style={{ backgroundColor: selectedNote?.id === note.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              onClick={() => selectNote(note)}
            >
              <p className="font-medium truncate">{note.title}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(note.updated_at)}</p>
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
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <input value={editTitle} onChange={e => { setEditTitle(e.target.value); handleAutoSave(e.target.value, editContent) }}
                className="text-lg font-semibold bg-transparent border-none outline-none flex-1 mr-4" style={{ color: 'var(--text-primary)' }} />
              <div className="flex items-center gap-2">
                <button onClick={() => { handleTrashNote(selectedNote.id) }}
                  className="text-xs px-2.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>Trash</button>
                <button onClick={() => setPreview(!preview)}
                  className="text-xs px-2.5 py-1 rounded font-semibold transition-colors"
                  style={{ backgroundColor: preview ? 'var(--accent)' : 'var(--bg-hover)', color: preview ? '#fff' : 'var(--text-secondary)' }}>
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {preview ? (
                <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(editContent) }} />
              ) : (
                <textarea value={editContent} onChange={e => { setEditContent(e.target.value); handleAutoSave(editTitle, e.target.value) }}
                  className="w-full h-full resize-none border-none outline-none text-sm leading-relaxed" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}
                  placeholder="Write in Markdown...&#10;&#10;## Heading&#10;**Bold** *Italic*&#10;- List item&#10;`code`" />
              )}
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
