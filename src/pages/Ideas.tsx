import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import LinkInput from '../components/LinkInput'
import type { Idea, TagWithCount } from '../types/models'

const statuses = ['draft', 'in-progress', 'completed', 'archived'] as const
const stages = ['concept', 'prototype', 'review', 'shipping'] as const

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(i === value ? 0 : i)}
          className="text-lg p-0.5 transition-colors"
          style={{ color: i <= value ? 'var(--accent)' : 'var(--text-muted)' }}>
          ★
        </button>
      ))}
    </div>
  )
}

export default function Ideas() {
  const [ideas, setIdeas] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editStatus, setEditStatus] = useState<Idea['status']>('draft')
  const [editStage, setEditStage] = useState<Idea['stage']>('concept')
  const [editImpact, setEditImpact] = useState(0)
  const [editEffort, setEditEffort] = useState(0)
  const [documents, setDocuments] = useState<any[]>([])
  const [updates, setUpdates] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [updateContent, setUpdateContent] = useState('')
  const [loading, setLoading] = useState(true)
  const autoSaveTimer = useRef<number | null>(null)
  const isNew = useRef(false)
  const prevStatus = useRef<string | null>(null)
  const prevStage = useRef<string | null>(null)

  const selected = ideas.find(i => i.id === selectedId) || null

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write your idea introduction...' }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[200px] px-0',
        style: 'color: var(--text-primary); font-size: 0.875rem; line-height: 1.7;',
      },
    },
    onUpdate: () => triggerAutoSave(),
  })

  const loadIdeas = useCallback(async () => {
    const list = await window.electronAPI.getIdeas()
    setIdeas(list)
    setLoading(false)
  }, [])

  useEffect(() => { loadIdeas() }, [loadIdeas])

  const loadDetail = useCallback(async (id: number) => {
    const [docs, ups, ts] = await Promise.all([
      window.electronAPI.getIdeaDocuments(id),
      window.electronAPI.getIdeaUpdates(id),
      window.electronAPI.getIdeaTags(id),
    ])
    setDocuments(docs)
    setUpdates(ups)
    setTags(ts)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const idea = ideas.find(i => i.id === selectedId)
    if (!idea) return
    setEditTitle(idea.title)
    setEditStatus(idea.status)
    setEditStage(idea.stage)
    setEditImpact(idea.impact)
    setEditEffort(idea.effort)
    prevStatus.current = idea.status
    prevStage.current = idea.stage
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(idea.introduction || '')
    }
    loadDetail(selectedId)
  }, [selectedId, ideas, editor, loadDetail])

  const triggerAutoSave = (title?: string) => {
    if (!selectedId || isNew.current) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(async () => {
      await window.electronAPI.updateIdea(selectedId, {
        title: title ?? editTitle,
        introduction: editor?.getHTML() || '',
        status: editStatus,
        stage: editStage,
        impact: editImpact,
        effort: editEffort,
      })
      loadIdeas()
    }, 1000)
  }

  const selectIdea = (id: number) => {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }
    setSelectedId(id)
    isNew.current = false
  }

  const handleCreate = async () => {
    const idea = await window.electronAPI.createIdea({ title: 'Untitled Idea' })
    await loadIdeas()
    setSelectedId(idea.id)
    isNew.current = true
    setTimeout(() => { isNew.current = false }, 100)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm('Delete this idea?')) return
    await window.electronAPI.deleteIdea(selectedId)
    setSelectedId(null)
    loadIdeas()
  }

  const handleStatusChange = async (val: Idea['status']) => {
    if (!selectedId) return
    const old = editStatus
    setEditStatus(val)
    if (old !== val) {
      await window.electronAPI.updateIdea(selectedId, { status: val })
      const label = `Status changed from "${old}" to "${val}"`
      await window.electronAPI.addIdeaUpdate(selectedId, label, 'status-change')
      loadDetail(selectedId)
      loadIdeas()
    }
  }

  const handleStageChange = async (val: Idea['stage']) => {
    if (!selectedId) return
    const old = editStage
    setEditStage(val)
    if (old !== val) {
      await window.electronAPI.updateIdea(selectedId, { stage: val })
      const label = `Stage changed from "${old}" to "${val}"`
      await window.electronAPI.addIdeaUpdate(selectedId, label, 'stage-change')
      loadDetail(selectedId)
      loadIdeas()
    }
  }

  const handleImpactChange = async (v: number) => {
    setEditImpact(v)
    if (selectedId) {
      await window.electronAPI.updateIdea(selectedId, { impact: v })
    }
  }

  const handleEffortChange = async (v: number) => {
    setEditEffort(v)
    if (selectedId) {
      await window.electronAPI.updateIdea(selectedId, { effort: v })
    }
  }

  const handleAddUpdate = async () => {
    if (!selectedId || !updateContent.trim()) return
    await window.electronAPI.addIdeaUpdate(selectedId, updateContent.trim(), 'comment')
    setUpdateContent('')
    loadDetail(selectedId)
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedId || !e.target.files?.length) return
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = async () => {
      const data = reader.result as string
      await window.electronAPI.addIdeaDocument(selectedId, file.name, data, file.type)
      loadDetail(selectedId)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleDeleteDocument = async (id: number) => {
    await window.electronAPI.deleteIdeaDocument(id)
    loadDetail(selectedId!)
  }

  const filtered = ideas.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  )

  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('ideas-sidebar') !== '0')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: 'var(--text-muted)' }}>Loading ideas...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 -m-6" style={{ position: 'relative' }}>
      {/* Left sidebar */}
      <div className="shrink-0 border-r flex flex-col transition-all duration-200 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', width: sidebarOpen ? 288 : 0 }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          {sidebarOpen && (
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ideas..."
              className="w-full text-sm bg-transparent border rounded-lg px-3 py-2 outline-none"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
          )}
          <button onClick={() => { setSidebarOpen(false); localStorage.setItem('ideas-sidebar', '0') }}
            className="text-xs px-1 shrink-0 ml-1" style={{ color: 'var(--text-muted)' }}
            title="Collapse sidebar">◀</button>
        </div>
        {sidebarOpen && (<>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map(idea => (
            <div key={idea.id} onClick={() => selectIdea(idea.id)}
              className="rounded-lg p-3 cursor-pointer transition-colors text-sm"
              style={{
                backgroundColor: idea.id === selectedId ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
                borderLeft: idea.id === selectedId ? '3px solid var(--accent)' : '3px solid transparent',
              }}>
              <p className="font-medium truncate">{idea.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor:
                      idea.status === 'completed' ? 'var(--accent)' :
                      idea.status === 'in-progress' ? '#f9e2af' :
                      idea.status === 'archived' ? 'var(--text-muted)' : 'var(--bg-hover)',
                    color: idea.status === 'completed' ? '#fff' : 'var(--text-primary)',
                  }}>
                  {idea.status}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(idea.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No ideas found</p>
          )}
        </div>
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleCreate}
            className="w-full text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            + New Idea
          </button>
        </div>
        </>)}
      </div>

      {!sidebarOpen && (
        <button onClick={() => { setSidebarOpen(true); localStorage.setItem('ideas-sidebar', '1') }}
          className="absolute left-0 top-2 z-10 text-xs px-1 py-2 rounded-r transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Expand sidebar">▶</button>
      )}

      {/* Detail panel */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {selected ? (
          <>
            {/* Title + Delete */}
            <div className="px-6 pt-5 pb-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <input value={editTitle} onChange={e => { setEditTitle(e.target.value); triggerAutoSave(e.target.value) }}
                className="text-xl font-semibold bg-transparent border-none outline-none flex-1 mr-4"
                style={{ color: 'var(--text-primary)' }} />
              <button onClick={handleDelete}
                className="text-xs px-3 py-1.5 rounded font-semibold"
                style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
                Delete
              </button>
            </div>

            {/* Status / Stage / Impact / Effort */}
            <div className="px-6 py-3 border-b flex items-center gap-6 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</label>
                <select value={editStatus} onChange={e => handleStatusChange(e.target.value as Idea['status'])}
                  className="text-sm bg-transparent border rounded px-2 py-1 outline-none"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Stage</label>
                <select value={editStage} onChange={e => handleStageChange(e.target.value as Idea['stage'])}
                  className="text-sm bg-transparent border rounded px-2 py-1 outline-none"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Impact</label>
                <StarRating value={editImpact} onChange={handleImpactChange} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Effort</label>
                <StarRating value={editEffort} onChange={handleEffortChange} />
              </div>
            </div>

            {/* Introduction (TipTap editor) */}
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Introduction</h3>
              {editor && <EditorContent editor={editor} />}
            </div>

            {/* Tags */}
            <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Tags</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {tags.map(t => (
                  <span key={t.id}
                    className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                    {t.name}
                    <button onClick={async () => { await window.electronAPI.removeTagFromIdea(selectedId!, t.id); loadDetail(selectedId!) }}
                      className="ml-0.5" style={{ color: 'var(--text-muted)' }}>×</button>
                  </span>
                ))}
                <AddTagInput ideaId={selectedId!} onAdd={() => loadDetail(selectedId!)} />
              </div>
            </div>

            {/* Links */}
            <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Links</h3>
              <LinkInput linkedType="idea" linkedId={selectedId!} />
            </div>

            {/* Documents */}
            <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Documents</h3>
              {documents.length > 0 && (
                <div className="space-y-1 mb-3">
                  {documents.map(doc => (
                    <div key={doc.id}
                      className="flex items-center justify-between text-sm px-3 py-1.5 rounded"
                      style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{doc.filename}</span>
                      <button onClick={() => handleDeleteDocument(doc.id)}
                        className="text-xs" style={{ color: 'var(--danger)' }}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
              <label className="inline-block text-xs font-semibold px-3 py-1.5 rounded cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                Upload Document
                <input type="file" onChange={handleDocumentUpload} className="hidden" />
              </label>
            </div>

            {/* Updates timeline */}
            <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Updates</h3>
              <div className="space-y-3 mb-3">
                {updates.map(up => (
                  <div key={up.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--bg-hover)',
                          color: up.update_type === 'comment' ? 'var(--text-primary)' : 'var(--accent)',
                        }}>
                        {up.update_type}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(up.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1" style={{ color: 'var(--text-primary)' }}>{up.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={updateContent} onChange={e => setUpdateContent(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 text-sm bg-transparent border rounded-lg px-3 py-2 outline-none"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddUpdate() } }} />
                <button onClick={handleAddUpdate}
                  className="text-xs font-semibold px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select an idea or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AddTagInput({ ideaId, onAdd }: { ideaId: number; onAdd: () => void }) {
  const [val, setVal] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])

  const handleChange = async (v: string) => {
    setVal(v)
    if (v.trim()) {
      const all = await window.electronAPI.getAllTags()
      setSuggestions(all.filter((t: TagWithCount) => t.name.toLowerCase().includes(v.toLowerCase())))
    } else {
      setSuggestions([])
    }
  }

  const add = async (name: string) => {
    const all = await window.electronAPI.getAllTags()
    const existing = all.find((t: TagWithCount) => t.name === name)
    const tag = existing ?? await window.electronAPI.createTag(name)
    await window.electronAPI.addTagToIdea(ideaId, tag.id)
    setVal('')
    setSuggestions([])
    onAdd()
  }

  return (
    <div className="relative">
      <input value={val} onChange={e => handleChange(e.target.value)}
        placeholder="Add tag..."
        className="text-xs bg-transparent border rounded px-2 py-1 outline-none w-24"
        style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(val.trim()) } }} />
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-40 rounded-lg shadow-lg z-10 border"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          {suggestions.map(s => (
            <button key={s.id} onClick={() => add(s.name)}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-primary)' }}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
