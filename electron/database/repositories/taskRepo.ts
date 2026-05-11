import { getDatabase } from '../db'
import type { Task, TaskWithRelations } from '../../src/types/models'

export function getTasks(): TaskWithRelations[] {
  const db = getDatabase()
  const tasks = db.exec(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    ORDER BY t.id DESC
  `)
  return tasks.map(t => enrichWithDependencyNames(t, db))
}

export function createTask(data: Omit<Task, 'id'>): TaskWithRelations {
  const db = getDatabase()
  db.run('INSERT INTO tasks (name, description, notes, dueDate, statusId, priorityId, projectId, predecessorIds, successorIds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.description, data.notes ?? '', data.dueDate ?? null, data.statusId, data.priorityId, data.projectId, data.predecessorIds ?? '[]', data.successorIds ?? '[]'])
  db.save()
  const id = db.getSingle('SELECT last_insert_rowid() as id').id
  const task = db.getSingle(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    WHERE t.id = ?
  `, [id])
  return enrichWithDependencyNames(task, db)
}

function enrichWithDependencyNames(task: any, db: any): TaskWithRelations {
  if (!task) {
    return { predecessorNames: '', successorNames: '' } as any
  }
  const predIds = JSON.parse(task.predecessorIds || '[]') as number[]
  const succIds = JSON.parse(task.successorIds || '[]') as number[]
  const predNames = predIds.length > 0
    ? predIds.map((id: number) => {
        const t = db.getSingle('SELECT name FROM tasks WHERE id = ?', [id])
        return t ? t.name : `#${id}`
      }).join(', ')
    : ''
  const succNames = succIds.length > 0
    ? succIds.map((id: number) => {
        const t = db.getSingle('SELECT name FROM tasks WHERE id = ?', [id])
        return t ? t.name : `#${id}`
      }).join(', ')
    : ''
  return { ...task, predecessorNames: predNames, successorNames: succNames }
}

export function updateTask(id: number, data: Partial<Task>): TaskWithRelations {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
  if (data.dueDate !== undefined) { fields.push('dueDate = ?'); values.push(data.dueDate) }
  if (data.statusId !== undefined) { fields.push('statusId = ?'); values.push(data.statusId) }
  if (data.priorityId !== undefined) { fields.push('priorityId = ?'); values.push(data.priorityId) }
  if (data.projectId !== undefined) { fields.push('projectId = ?'); values.push(data.projectId) }
  if (data.predecessorIds !== undefined) { fields.push('predecessorIds = ?'); values.push(data.predecessorIds) }
  if (data.successorIds !== undefined) { fields.push('successorIds = ?'); values.push(data.successorIds) }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  const task = db.getSingle(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    WHERE t.id = ?
  `, [id])
  return enrichWithDependencyNames(task, db)
}

export function deleteTask(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM tasks WHERE id = ?', [id])
  db.save()
}
