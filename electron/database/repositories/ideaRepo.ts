import { getDatabase } from '../db'

export function getIdeas(filters?: { status?: string; stage?: string; sortBy?: string }): any[] {
  const db = getDatabase()
  let sql = 'SELECT * FROM ideas'
  const clauses: string[] = []
  const params: any[] = []
  if (filters?.status) { clauses.push('status = ?'); params.push(filters.status) }
  if (filters?.stage) { clauses.push('stage = ?'); params.push(filters.stage) }
  if (clauses.length > 0) sql += ' WHERE ' + clauses.join(' AND ')
  const sort = filters?.sortBy || 'updated_at'
  const dir = sort === 'created_at' ? 'ASC' : 'DESC'
  sql += ` ORDER BY ${sort} ${dir}`
  return db.exec(sql, params)
}

export function getIdea(id: number): any {
  const db = getDatabase()
  return db.getSingle('SELECT * FROM ideas WHERE id = ?', [id])
}

export function createIdea(data: any): any {
  const db = getDatabase()
  const now = new Date().toISOString()
  const result = db.run(
    'INSERT INTO ideas (title, introduction, status, stage, impact, effort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [data.title || 'Untitled Idea', data.introduction || '', data.status || 'draft', data.stage || 'concept', data.impact || 0, data.effort || 0, now, now]
  )
  db.save()
  return db.getSingle('SELECT * FROM ideas WHERE id = ?', [result.lastInsertRowid])
}

export function updateIdea(id: number, data: any): any {
  const db = getDatabase()
  const fields: string[] = []
  const values: any[] = []
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
  if (data.introduction !== undefined) { fields.push('introduction = ?'); values.push(data.introduction) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.stage !== undefined) { fields.push('stage = ?'); values.push(data.stage) }
  if (data.impact !== undefined) { fields.push('impact = ?'); values.push(data.impact) }
  if (data.effort !== undefined) { fields.push('effort = ?'); values.push(data.effort) }
  if (fields.length > 0) {
    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    db.run(`UPDATE ideas SET ${fields.join(', ')} WHERE id = ?`, values)
    db.save()
  }
  return db.getSingle('SELECT * FROM ideas WHERE id = ?', [id])
}

export function deleteIdea(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM ideas WHERE id = ?', [id])
  db.save()
}

export function getIdeaDocuments(ideaId: number): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM idea_documents WHERE idea_id = ? ORDER BY created_at', [ideaId])
}

export function addIdeaDocument(ideaId: number, filename: string, data: string, mimeType: string): any {
  const db = getDatabase()
  const now = new Date().toISOString()
  const fileSize = data.length
  const result = db.run(
    'INSERT INTO idea_documents (idea_id, filename, data, mime_type, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [ideaId, filename, data, mimeType, fileSize, now]
  )
  db.save()
  return db.getSingle('SELECT * FROM idea_documents WHERE id = ?', [result.lastInsertRowid])
}

export function deleteIdeaDocument(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM idea_documents WHERE id = ?', [id])
  db.save()
}

export function getIdeaUpdates(ideaId: number): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM idea_updates WHERE idea_id = ? ORDER BY created_at DESC', [ideaId])
}

export function addIdeaUpdate(ideaId: number, content: string, updateType?: string): any {
  const db = getDatabase()
  const now = new Date().toISOString()
  const result = db.run(
    'INSERT INTO idea_updates (idea_id, content, update_type, created_at) VALUES (?, ?, ?, ?)',
    [ideaId, content, updateType || 'comment', now]
  )
  db.save()
  return db.getSingle('SELECT * FROM idea_updates WHERE id = ?', [result.lastInsertRowid])
}

export function getIdeaTags(ideaId: number): any[] {
  const db = getDatabase()
  return db.exec(
    'SELECT t.* FROM tags t JOIN idea_tags it ON t.id = it.tag_id WHERE it.idea_id = ? ORDER BY t.name',
    [ideaId]
  )
}

export function addTagToIdea(ideaId: number, tagId: string): void {
  const db = getDatabase()
  db.run('INSERT OR IGNORE INTO idea_tags (idea_id, tag_id) VALUES (?, ?)', [ideaId, tagId])
  db.save()
}

export function removeTagFromIdea(ideaId: number, tagId: string): void {
  const db = getDatabase()
  db.run('DELETE FROM idea_tags WHERE idea_id = ? AND tag_id = ?', [ideaId, tagId])
  db.save()
}

export function getRecentIdeas(limit?: number): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM ideas ORDER BY updated_at DESC LIMIT ?', [limit || 5])
}
