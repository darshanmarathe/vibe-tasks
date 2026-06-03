import { useEffect, useState, useCallback } from 'react'
import type { LinkCategory } from '../../types/models'

export default function LinkCategoriesTab() {
  const [items, setItems] = useState<LinkCategory[]>([])
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    setItems(await window.electronAPI.getLinkCategories())
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!name.trim()) return
    await window.electronAPI.createLinkCategory(name.trim())
    setName('')
    load()
  }

  const remove = async (id: number) => {
    if (!window.confirm('Delete this category?')) return
    try {
      await window.electronAPI.deleteLinkCategory(id)
      load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Category name"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <button onClick={add} className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Add</button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Type</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(cat => (
            <tr key={cat.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{cat.name}</td>
              <td className="py-2" style={{ color: 'var(--text-muted)' }}>
                {cat.is_hardcoded ? <span title="Built-in category">🔒 Hardcoded</span> : 'Custom'}
              </td>
              <td className="py-2 text-right">
                {cat.is_hardcoded ? (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                ) : (
                  <button onClick={() => remove(cat.id)} className="text-xs" style={{ color: 'var(--danger)' }}>Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
