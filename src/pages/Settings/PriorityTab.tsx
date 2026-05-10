import { useEffect, useState, useCallback } from 'react'
import type { Priority } from '../../types/models'

export default function PriorityTab() {
  const [items, setItems] = useState<Priority[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Priority | null>(null)

  const load = useCallback(async () => {
    setItems(await window.electronAPI.getPriorities())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!name.trim()) return
    if (editing) {
      await window.electronAPI.updatePriority(editing.id, { name })
    } else {
      await window.electronAPI.createPriority({ name })
    }
    setName('')
    setEditing(null)
    load()
  }

  const handleEdit = (item: Priority) => {
    setEditing(item)
    setName(item.name)
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deletePriority(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Priority name" className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && <button onClick={() => { setEditing(null); setName('') }} className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            <th className="text-left py-2">Name</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
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
