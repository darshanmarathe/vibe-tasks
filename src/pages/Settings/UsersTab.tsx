import { useEffect, useState, useCallback } from 'react'
import type { User } from '../../types/models'

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState<User | null>(null)

  const load = useCallback(async () => {
    setUsers(await window.electronAPI.getUsers())
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return
    if (editing) {
      await window.electronAPI.updateUser(editing.id, { name, email })
    } else {
      await window.electronAPI.createUser({ name, email })
    }
    setName('')
    setEmail('')
    setEditing(null)
    load()
  }

  const handleEdit = (u: User) => {
    setEditing(u)
    setName(u.name)
    setEmail(u.email)
  }

  const handleDelete = async (id: number) => {
    await window.electronAPI.deleteUser(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="flex-1 border rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && <button onClick={() => { setEditing(null); setName(''); setEmail('') }} className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            <th className="text-left py-2">Name</th>
            <th className="text-left py-2">Email</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
              <td className="py-2" style={{ color: 'var(--text-primary)' }}>{u.name}</td>
              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
              <td className="py-2 text-right space-x-2">
                <button onClick={() => handleEdit(u)} className="text-xs" style={{ color: 'var(--accent)' }}>Edit</button>
                <button onClick={() => handleDelete(u.id)} className="text-xs" style={{ color: 'var(--danger)' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
