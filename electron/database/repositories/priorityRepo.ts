import { getDatabase } from '../db'
import type { Priority } from '../../src/types/models'

export function getPriorities(): Priority[] {
  return getDatabase().exec('SELECT * FROM priorities')
}

export function createPriority(data: Omit<Priority, 'id'>): Priority {
  const db = getDatabase()
  db.run('INSERT INTO priorities (name) VALUES (?)', [data.name])
  db.save()
  return db.getSingle('SELECT * FROM priorities WHERE id = ?', [db.getSingle('SELECT last_insert_rowid() as id').id])
}

export function updatePriority(id: number, data: Partial<Priority>): Priority {
  const db = getDatabase()
  db.run('UPDATE priorities SET name = ? WHERE id = ?', [data.name, id])
  db.save()
  return db.getSingle('SELECT * FROM priorities WHERE id = ?', [id])
}

export function deletePriority(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM priorities WHERE id = ?', [id])
  db.save()
}
