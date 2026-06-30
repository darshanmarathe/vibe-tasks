import { useEffect, useState, useCallback } from 'react'
import type { Status } from '../../types/models'

export default function StatusTab() {
  const [items, setItems] = useState<Status[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Status | null>(null)

  const load = useCallback(async () => {
    setItems(await window.electronAPI.getStatuses())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!name.trim()) return
    if (editing) {
      await window.electronAPI.updateStatus(editing.id, { name })
    } else {
      await window.electronAPI.createStatus({ name, ord: (items.length + 1) * 10 })
    }
    setName('')
    setEditing(null)
    load()
  }

  const handleEdit = (item: Status) => {
    setEditing(item)
    setName(item.name)
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteStatus(id)
    load()
  }

  const toggleComplete = async (item: Status) => {
    await window.electronAPI.updateStatus(item.id, { complete: item.complete ? 0 : 1 })
    load()
  }

  const moveItem = async (index: number, direction: -1 | 1) => {
    const newItems = [...items]
    const target = index + direction
    if (target < 0 || target >= newItems.length) return
    ;[newItems[index], newItems[target]] = [newItems[target], newItems[index]]
    const reorder = newItems.map((item, i) => ({ id: item.id, ord: i * 10 }))
    await window.electronAPI.reorderStatuses(reorder)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Status name" className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && <button onClick={() => { setEditing(null); setName('') }} className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            <th className="text-left py-2 w-8">#</th>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Complete</th>
            <th className="text-left py-2">Order</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
              <td className="py-2">
                <button
                  onClick={() => toggleComplete(item)}
                  className="text-xs px-2 py-0.5 rounded font-semibold"
                  style={{
                    backgroundColor: item.complete ? 'var(--success)' : 'var(--bg-hover)',
                    color: item.complete ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {item.complete ? '✓' : '—'}
                </button>
              </td>
              <td className="py-2">
                <div className="flex gap-1">
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-xs px-1.5 py-0.5 rounded" style={{ color: i === 0 ? 'var(--text-muted)' : 'var(--accent)' }}>▲</button>
                  <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="text-xs px-1.5 py-0.5 rounded" style={{ color: i === items.length - 1 ? 'var(--text-muted)' : 'var(--accent)' }}>▼</button>
                </div>
              </td>
              <td className="py-2 text-right space-x-2">
                <button onClick={() => handleEdit(item)} className="text-xs" style={{ color: 'var(--accent)' }}>Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-xs" style={{ color: 'var(--danger)' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
