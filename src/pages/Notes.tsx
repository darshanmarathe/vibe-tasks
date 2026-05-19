import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Notebook, Note } from '../types/models'

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
      {btn('<>', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'))}
      {btn('❄', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
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
  const autoSaveTimer = useRef<number | null>(null)
  const isNewNote = useRef(false)
  const skipAutoSave = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[300px] px-0',
        style: 'color: var(--text-primary); font-size: 0.875rem; line-height: 1.7;',
      },
    },
    onUpdate: () => {
      if (skipAutoSave.current) { skipAutoSave.current = false; return }
      triggerAutoSave()
    },
  })

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
    isNewNote.current = false
    setSelectedNote(note)
    setEditTitle(note.title)
    if (editor) {
      skipAutoSave.current = true
      editor.commands.setContent(note.content || '<p></p>')
    }
  }

  const handleCreateNote = async () => {
    if (!selectedNotebook) return
    isNewNote.current = true
    const note = await window.electronAPI.createNote(selectedNotebook, 'Untitled')
    if (note) {
      loadNotes(selectedNotebook)
      setSelectedNote(note)
      setEditTitle(note.title)
      if (editor) editor.commands.setContent('<p></p>')
    }
  }

  const triggerAutoSave = (title?: string) => {
    if (!selectedNote || isNewNote.current) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(async () => {
      await window.electronAPI.saveNote(selectedNote.id, title ?? editTitle, editor?.getHTML() || '')
      loadNotes(selectedNotebook!)
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
          <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search notes..."
            className="w-full border rounded-lg px-2.5 py-1.5 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
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
              <input value={editTitle} onChange={e => { setEditTitle(e.target.value); triggerAutoSave(e.target.value) }}
                className="text-lg font-semibold bg-transparent border-none outline-none flex-1 mr-4" style={{ color: 'var(--text-primary)' }} />
              <div className="flex items-center gap-2">
                <button onClick={() => handleTrashNote(selectedNote.id)}
                  className="text-xs px-2.5 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>Trash</button>
              </div>
            </div>
            {editor && <MenuBar editor={editor} />}
            <div className="flex-1 overflow-y-auto p-4">
              <EditorContent editor={editor} />
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
