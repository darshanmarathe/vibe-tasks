import { getDatabase } from '../db'
import type { Task, TaskWithRelations } from '../../src/types/models'

export function getTasks(includeArchived = false): TaskWithRelations[] {
  const db = getDatabase()
  const where = includeArchived ? '' : ' WHERE t.archived = 0'
  const tasks = db.exec(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName,
      u.name as assignedToName, u.email as assignedToEmail
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    LEFT JOIN users u ON t.assignedTo = u.id${where}
    ORDER BY t.id DESC
  `)
  return tasks.map(t => enrichWithDependencyNames(t, db))
}

export function getArchivedTasks(): TaskWithRelations[] {
  const db = getDatabase()
  const tasks = db.exec(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName,
      u.name as assignedToName, u.email as assignedToEmail
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    LEFT JOIN users u ON t.assignedTo = u.id
    WHERE t.archived = 1
    ORDER BY t.id DESC
  `)
  return tasks.map(t => enrichWithDependencyNames(t, db))
}

export function createTask(data: Omit<Task, 'id'>): TaskWithRelations {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.run(`INSERT INTO tasks (name, description, notes, dueDate, statusId, priorityId, projectId, predecessorIds, successorIds, archived, assignedTo, completionPercent, created_at, completed_at, recurrence_type, recurrence_interval, recurrence_days_of_week, recurrence_end_date, recurrence_count, recurrence_parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.description, data.notes ?? '', data.dueDate ?? null, data.statusId, data.priorityId, data.projectId, data.predecessorIds ?? '[]', data.successorIds ?? '[]', data.archived ?? 0, data.assignedTo ?? null, data.completionPercent ?? 0, now, data.completionPercent === 100 ? now : null, data.recurrence_type ?? 'none', data.recurrence_interval ?? 1, data.recurrence_days_of_week ?? null, data.recurrence_end_date ?? null, data.recurrence_count ?? null, data.recurrence_parent_id ?? null])
  db.save()
  const id = db.getSingle('SELECT last_insert_rowid() as id').id
  const task = db.getSingle(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName,
      u.name as assignedToName, u.email as assignedToEmail
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    LEFT JOIN users u ON t.assignedTo = u.id
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
  if (data.archived !== undefined) { fields.push('archived = ?'); values.push(data.archived) }
  if (data.assignedTo !== undefined) { fields.push('assignedTo = ?'); values.push(data.assignedTo) }
  if (data.completionPercent !== undefined) { fields.push('completionPercent = ?'); values.push(data.completionPercent) }
  if (data.completionPercent !== undefined) {
    const now = new Date().toISOString()
    fields.push('completed_at = ?')
    values.push(data.completionPercent === 100 ? now : null)
  }
  if (data.recurrence_type !== undefined) { fields.push('recurrence_type = ?'); values.push(data.recurrence_type) }
  if (data.recurrence_interval !== undefined) { fields.push('recurrence_interval = ?'); values.push(data.recurrence_interval) }
  if (data.recurrence_days_of_week !== undefined) { fields.push('recurrence_days_of_week = ?'); values.push(data.recurrence_days_of_week) }
  if (data.recurrence_end_date !== undefined) { fields.push('recurrence_end_date = ?'); values.push(data.recurrence_end_date) }
  if (data.recurrence_count !== undefined) { fields.push('recurrence_count = ?'); values.push(data.recurrence_count) }
  if (data.recurrence_parent_id !== undefined) { fields.push('recurrence_parent_id = ?'); values.push(data.recurrence_parent_id) }
  if (fields.length > 0) {
    values.push(id)
    db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  const task = db.getSingle(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName,
      u.name as assignedToName, u.email as assignedToEmail
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    LEFT JOIN users u ON t.assignedTo = u.id
    WHERE t.id = ?
  `, [id])
  return enrichWithDependencyNames(task, db)
}

export function deleteTask(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM tasks WHERE id = ?', [id])
  db.save()
}

export function archiveTask(id: number): void {
  const db = getDatabase()
  db.run('UPDATE tasks SET archived = 1 WHERE id = ?', [id])
  db.save()
}

export function unarchiveTask(id: number): void {
  const db = getDatabase()
  db.run('UPDATE tasks SET archived = 0 WHERE id = ?', [id])
  db.save()
}

export function getRecurringTasks(): TaskWithRelations[] {
  const db = getDatabase()
  const tasks = db.exec(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName,
      u.name as assignedToName, u.email as assignedToEmail
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    LEFT JOIN users u ON t.assignedTo = u.id
    WHERE t.archived = 0 AND t.recurrence_type IS NOT NULL AND t.recurrence_type != 'none'
    ORDER BY t.id DESC
  `)
  return tasks.map(t => enrichWithDependencyNames(t, db))
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function addMonths(date: string, months: number): string {
  const d = new Date(date)
  const targetDay = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() !== targetDay) d.setDate(0)
  return d.toISOString().split('T')[0]
}

function addYears(date: string, years: number): string {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split('T')[0]
}

function findNextDayOfWeek(fromDate: string, daysOfWeek: number[]): string {
  const d = new Date(fromDate)
  for (let i = 1; i <= 7; i++) {
    d.setDate(d.getDate() + 1)
    if (daysOfWeek.includes(d.getDay())) {
      return d.toISOString().split('T')[0]
    }
  }
  return addDays(fromDate, 1)
}

export function generateNextOccurrence(id: number): TaskWithRelations | null {
  const db = getDatabase()
  const task = db.getSingle('SELECT * FROM tasks WHERE id = ?', [id])
  if (!task || !task.recurrence_type || task.recurrence_type === 'none') return null

  const now = new Date().toISOString()
  let nextDue: string | null = null

  if (task.dueDate) {
    const interval = task.recurrence_interval || 1
    switch (task.recurrence_type) {
      case 'daily':
        nextDue = addDays(task.dueDate, interval)
        break
      case 'weekly':
        if (task.recurrence_days_of_week) {
          const days = task.recurrence_days_of_week.split(',').map(Number)
          nextDue = findNextDayOfWeek(task.dueDate, days)
        } else {
          nextDue = addDays(task.dueDate, interval * 7)
        }
        break
      case 'monthly':
        nextDue = addMonths(task.dueDate, interval)
        break
      case 'yearly':
        nextDue = addYears(task.dueDate, interval)
        break
    }
  }

  // Check end conditions
  if (!nextDue) return null
  if (task.recurrence_end_date && nextDue > task.recurrence_end_date) return null
  if (task.recurrence_count !== null && task.recurrence_count !== 0) {
    // Decrement count on parent
    db.run('UPDATE tasks SET recurrence_count = ? WHERE id = ?', [(task.recurrence_count || 1) - 1, id])
    db.save()
  }

  const parentId = task.recurrence_parent_id || id

  db.run(`INSERT INTO tasks (name, description, notes, dueDate, statusId, priorityId, projectId,
    predecessorIds, successorIds, archived, assignedTo, completionPercent, created_at, completed_at,
    recurrence_type, recurrence_interval, recurrence_days_of_week, recurrence_end_date, recurrence_count, recurrence_parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.name, task.description, task.notes ?? '', nextDue, task.statusId, task.priorityId, task.projectId,
      task.predecessorIds ?? '[]', task.successorIds ?? '[]', 0, task.assignedTo, 0, now, null,
      task.recurrence_type, task.recurrence_interval, task.recurrence_days_of_week,
      task.recurrence_end_date, task.recurrence_count !== null ? task.recurrence_count - 1 : null, parentId])
  db.save()

  const newId = db.getSingle('SELECT last_insert_rowid() as id').id
  const newTask = db.getSingle(`
    SELECT t.*, s.name as statusName, p.name as priorityName, p.color as priorityColor, pr.name as projectName,
      u.name as assignedToName, u.email as assignedToEmail
    FROM tasks t
    JOIN statuses s ON t.statusId = s.id
    JOIN priorities p ON t.priorityId = p.id
    JOIN projects pr ON t.projectId = pr.id
    LEFT JOIN users u ON t.assignedTo = u.id
    WHERE t.id = ?
  `, [newId])
  return enrichWithDependencyNames(newTask, db)
}
