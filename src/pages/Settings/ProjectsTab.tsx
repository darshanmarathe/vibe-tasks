import { useEffect, useState, useCallback } from 'react'
import type { Project } from '../../types/models'

export default function ProjectsTab() {
  const [items, setItems] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editing, setEditing] = useState<Project | null>(null)

  const load = useCallback(async () => {
    setItems(await window.electronAPI.getProjects())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!name.trim()) return
    if (editing) {
      await window.electronAPI.updateProject(editing.id, { name, description })
    } else {
      await window.electronAPI.createProject({ name, description })
    }
    setName('')
    setDescription('')
    setEditing(null)
    load()
  }

  const handleEdit = (item: Project) => {
    setEditing(item)
    setName(item.name)
    setDescription(item.description)
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteProject(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && <button onClick={() => { setEditing(null); setName(''); setDescription('') }} className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Description</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{item.description}</td>
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
