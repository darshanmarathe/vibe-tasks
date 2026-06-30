import { getDatabase } from '../db'
import type { Status } from '../../src/types/models'

export function getStatuses(): Status[] {
  return getDatabase().exec('SELECT * FROM statuses ORDER BY ord ASC, id ASC')
}

export function createStatus(data: Omit<Status, 'id'>): Status {
  const db = getDatabase()
  const max = db.getSingle('SELECT COALESCE(MAX(ord), 0) + 10 as nextOrd FROM statuses')
  const ord = data.ord ?? max.nextOrd
  if (data.complete) {
    db.run('UPDATE statuses SET complete = 0')
  }
  db.run('INSERT INTO statuses (name, ord, complete) VALUES (?, ?, ?)', [data.name, ord, data.complete ? 1 : 0])
  db.save()
  return db.getSingle('SELECT * FROM statuses WHERE id = ?', [db.getSingle('SELECT last_insert_rowid() as id').id])
}

export function updateStatus(id: number, data: Partial<Status>): Status {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.ord !== undefined) { fields.push('ord = ?'); values.push(data.ord) }
  if (data.complete !== undefined) {
    // Only one status can be the "complete" marker
    if (data.complete) {
      db.run('UPDATE statuses SET complete = 0')
    }
    fields.push('complete = ?'); values.push(data.complete ? 1 : 0)
  }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE statuses SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  return db.getSingle('SELECT * FROM statuses WHERE id = ?', [id])
}

export function deleteStatus(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM statuses WHERE id = ?', [id])
  db.save()
}

export function reorderStatuses(items: { id: number; ord: number }[]): void {
  const db = getDatabase()
  for (const item of items) {
    db.run('UPDATE statuses SET ord = ? WHERE id = ?', [item.ord, item.id])
  }
  db.save()
}
