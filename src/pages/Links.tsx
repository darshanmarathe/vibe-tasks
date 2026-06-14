import { useEffect, useState, useCallback } from 'react'
import type { Link, LinkCategory } from '../types/models'

export default function Links() {
  const [links, setLinks] = useState<Link[]>([])
  const [categories, setCategories] = useState<LinkCategory[]>([])
  const [filterCat, setFilterCat] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState(0)
  const [dashboard, setDashboard] = useState(false)

  const load = useCallback(async () => {
    const [l, c] = await Promise.all([
      window.electronAPI.getLinks(filterCat ? { categoryId: filterCat } : undefined),
      window.electronAPI.getLinkCategories(),
    ])
    setLinks(l)
    setCategories(c)
  }, [filterCat])

  useEffect(() => { load() }, [load])

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
              <input value={url} onChange={e => setUrl(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
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
              <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No links yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
