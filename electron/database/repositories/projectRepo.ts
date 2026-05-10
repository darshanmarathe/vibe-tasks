import { getDatabase } from '../db'
import type { Project } from '../../src/types/models'

export function getProjects(): Project[] {
  return getDatabase().exec('SELECT * FROM projects')
}

export function createProject(data: Omit<Project, 'id'>): Project {
  const db = getDatabase()
  db.run('INSERT INTO projects (name, description) VALUES (?, ?)', [data.name, data.description])
  db.save()
  return db.getSingle('SELECT * FROM projects WHERE id = ?', [db.getSingle('SELECT last_insert_rowid() as id').id])
}

export function updateProject(id: number, data: Partial<Project>): Project {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  return db.getSingle('SELECT * FROM projects WHERE id = ?', [id])
}

export function deleteProject(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM projects WHERE id = ?', [id])
  db.save()
}
