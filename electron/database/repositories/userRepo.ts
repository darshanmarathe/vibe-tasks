import { getDatabase } from '../db'
import type { User } from '../../src/types/models'

export function getUsers(): User[] {
  return getDatabase().exec('SELECT * FROM users')
}

export function createUser(data: Omit<User, 'id'>): User {
  const db = getDatabase()
  db.run('INSERT INTO users (name, email) VALUES (?, ?)', [data.name, data.email])
  db.save()
  return db.getSingle('SELECT * FROM users WHERE id = ?', [db.getSingle('SELECT last_insert_rowid() as id').id])
}

export function updateUser(id: number, data: Partial<User>): User {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  return db.getSingle('SELECT * FROM users WHERE id = ?', [id])
}

export function deleteUser(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM users WHERE id = ?', [id])
  db.save()
}
