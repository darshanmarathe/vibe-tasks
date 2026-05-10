import { useEffect, useState, useCallback } from 'react'
import type { Priority } from '../../types/models'

const DEFAULT_COLORS = ['#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#89b4fa', '#cba6f7', '#94e2d5', '#a6adc8']

export default function PriorityTab() {
  const [items, setItems] = useState<Priority[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [editing, setEditing] = useState<Priority | null>(null)

  const load = useCallback(async () => {
    setItems(await window.electronAPI.getPriorities())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!name.trim()) return
    if (editing) {
      await window.electronAPI.updatePriority(editing.id, { name, color })
    } else {
      await window.electronAPI.createPriority({ name, color })
    }
    setName('')
    setColor(DEFAULT_COLORS[0])
    setEditing(null)
    load()
  }

  const handleEdit = (item: Priority) => {
    setEditing(item)
    setName(item.name)
    setColor(item.color)
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deletePriority(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Priority name" className="w-full border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Color</label>
          <div className="flex gap-1">
            {DEFAULT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: c === color ? 'var(--text-primary)' : 'transparent',
                  transform: c === color ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
        <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && <button onClick={() => { setEditing(null); setName(''); setColor(DEFAULT_COLORS[0]) }} className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            <th className="text-left py-2 w-8">#</th>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Color</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
              <td className="py-2">
                <span className="inline-block w-5 h-5 rounded-full border" style={{ backgroundColor: item.color, borderColor: 'var(--border)' }} />
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
