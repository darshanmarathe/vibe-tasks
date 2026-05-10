import { getDatabase } from '../db'
import type { Task, TaskWithRelations } from '../../src/types/models'

export function getTasks(): TaskWithRelations[] {
  return getDatabase().exec(`
    SELECT t.*, s.name as statusName, p.name as priorityName, pr.name as projectName
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    ORDER BY t.id DESC
  `)
}

export function createTask(data: Omit<Task, 'id'>): TaskWithRelations {
  const db = getDatabase()
  db.run('INSERT INTO tasks (name, description, dueDate, statusId, priorityId, projectId) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.description, data.dueDate ?? null, data.statusId, data.priorityId, data.projectId])
  db.save()
  const id = db.getSingle('SELECT last_insert_rowid() as id').id
  return db.getSingle(`
    SELECT t.*, s.name as statusName, p.name as priorityName, pr.name as projectName
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    WHERE t.id = ?
  `, [id])
}

export function updateTask(id: number, data: Partial<Task>): TaskWithRelations {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.dueDate !== undefined) { fields.push('dueDate = ?'); values.push(data.dueDate) }
  if (data.statusId !== undefined) { fields.push('statusId = ?'); values.push(data.statusId) }
  if (data.priorityId !== undefined) { fields.push('priorityId = ?'); values.push(data.priorityId) }
  if (data.projectId !== undefined) { fields.push('projectId = ?'); values.push(data.projectId) }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  return db.getSingle(`
    SELECT t.*, s.name as statusName, p.name as priorityName, pr.name as projectName
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    WHERE t.id = ?
  `, [id])
}

export function deleteTask(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM tasks WHERE id = ?', [id])
  db.save()
}
