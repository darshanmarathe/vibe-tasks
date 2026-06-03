import { useEffect, useState, useCallback } from 'react'
import type { Link, LinkCategory } from '../types/models'

interface Props {
  linkedType: string
  linkedId: number | string
  onLinksChange?: () => void
}

export default function LinkInput({ linkedType, linkedId, onLinksChange }: Props) {
  const [links, setLinks] = useState<Link[]>([])
  const [categories, setCategories] = useState<LinkCategory[]>([])
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [dashboard, setDashboard] = useState(false)

  const typeToCategory: Record<string, string> = { task: 'Tasks', note: 'Notes', mindmap: 'Mindmaps', journal: 'Journals' }

  const load = useCallback(async () => {
    const [l, c] = await Promise.all([
      window.electronAPI.getLinks({ linkedType, linkedId }),
      window.electronAPI.getLinkCategories(),
    ])
    setLinks(l)
    setCategories(c)
  }, [linkedType, linkedId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const catName = typeToCategory[linkedType]
    if (catName && categoryId === 0) {
      const match = categories.find(c => c.name === catName)
      if (match) setCategoryId(match.id)
    }
  }, [categories, linkedType])

  const addLink = async () => {
    if (!url.trim()) return
    await window.electronAPI.createLink({
      url: url.trim(),
      text: text.trim() || url.trim(),
      category_id: categoryId || categories[0]?.id || undefined,
      display_on_dashboard: dashboard ? 1 : 0,
      linked_type: linkedType,
      linked_id: linkedId,
    })
    setUrl('')
    setText('')
    setDashboard(false)
    load()
    onLinksChange?.()
  }

  const removeLink = async (id: number) => {
    await window.electronAPI.deleteLink(id)
    load()
    onLinksChange?.()
  }

  return (
    <div className="space-y-2">
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map(link => (
            <span key={link.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              <button onClick={e => { e.stopPropagation(); window.electronAPI.openExternal(link.url) }}
                className="hover:underline truncate max-w-[200px] text-left"
                style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                {link.text || link.url}
              </button>
              <button onClick={() => removeLink(link.id)}
                className="ml-0.5 opacity-70 hover:opacity-100">&times;</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="URL..."
          className="flex-1 min-w-[140px] border rounded px-2 py-1 text-xs"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="Text (optional)"
          className="w-24 border rounded px-2 py-1 text-xs"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}
          className="border rounded px-2 py-1 text-xs"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <option value={0}>Category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={dashboard} onChange={e => setDashboard(e.target.checked)} />
          Dashboard
        </label>
        <button onClick={addLink} className="px-2 py-1 rounded text-xs font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+</button>
      </div>
    </div>
  )
}
