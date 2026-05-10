import { getDatabase } from '../db'
import type { Priority } from '../../src/types/models'

export function getPriorities(): Priority[] {
  return getDatabase().exec('SELECT * FROM priorities')
}

export function createPriority(data: Omit<Priority, 'id'>): Priority {
  const db = getDatabase()
  db.run('INSERT INTO priorities (name, color) VALUES (?, ?)', [data.name, data.color ?? '#a6adc8'])
  db.save()
  return db.getSingle('SELECT * FROM priorities WHERE id = ?', [db.getSingle('SELECT last_insert_rowid() as id').id])
}

export function updatePriority(id: number, data: Partial<Priority>): Priority {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE priorities SET ${fields.join(', ')} WHERE id = ?`, values)
  }
  db.save()
  return db.getSingle('SELECT * FROM priorities WHERE id = ?', [id])
}

export function deletePriority(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM priorities WHERE id = ?', [id])
  db.save()
}
