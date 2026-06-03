import { getDatabase } from '../db'

export function getLinks(filters?: { categoryId?: number; linkedType?: string; linkedId?: number | string; displayOnDashboard?: number }): any[] {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []
  if (filters?.categoryId) { conditions.push('l.category_id = ?'); params.push(filters.categoryId) }
  if (filters?.linkedType) { conditions.push('l.linked_type = ?'); params.push(filters.linkedType) }
  if (filters?.linkedId) { conditions.push('l.linked_id = ?'); params.push(filters.linkedId) }
  if (filters?.displayOnDashboard !== undefined) { conditions.push('l.display_on_dashboard = ?'); params.push(filters.displayOnDashboard) }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
  return db.exec(`SELECT l.*, c.name as category_name FROM links l LEFT JOIN link_categories c ON l.category_id = c.id ${where} ORDER BY l.created_at DESC`, params)
}

export function getLink(id: number): any {
  const db = getDatabase()
  return db.getSingle('SELECT l.*, c.name as category_name FROM links l LEFT JOIN link_categories c ON l.category_id = c.id WHERE l.id = ?', [id])
}

export function createLink(data: { url: string; text?: string; category_id?: number; display_on_dashboard?: number; linked_type?: string; linked_id?: number | string }): any {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.run(
    'INSERT INTO links (url, text, category_id, display_on_dashboard, linked_type, linked_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.url, data.text || '', data.category_id || null, data.display_on_dashboard || 0, data.linked_type || null, data.linked_id || null, now]
  )
  db.save()
  const id = db.getSingle('SELECT last_insert_rowid() as id').id
  return getLink(id)
}

export function updateLink(id: number, data: any): any {
  const db = getDatabase()
  const fields: string[] = []
  const params: any[] = []
  if (data.url !== undefined) { fields.push('url = ?'); params.push(data.url) }
  if (data.text !== undefined) { fields.push('text = ?'); params.push(data.text) }
  if (data.category_id !== undefined) { fields.push('category_id = ?'); params.push(data.category_id) }
  if (data.display_on_dashboard !== undefined) { fields.push('display_on_dashboard = ?'); params.push(data.display_on_dashboard) }
  if (data.linked_type !== undefined) { fields.push('linked_type = ?'); params.push(data.linked_type) }
  if (data.linked_id !== undefined) { fields.push('linked_id = ?'); params.push(data.linked_id) }
  if (fields.length > 0) {
    params.push(id)
    db.run(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`, params)
    db.save()
  }
  return getLink(id)
}

export function deleteLink(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM links WHERE id = ?', [id])
  db.save()
}

export function getCategories(): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM link_categories ORDER BY is_hardcoded DESC, name')
}

export function createCategory(name: string): any {
  const db = getDatabase()
  db.run('INSERT INTO link_categories (name, is_hardcoded) VALUES (?, 0)', [name])
  db.save()
  const id = db.getSingle('SELECT last_insert_rowid() as id').id
  return db.getSingle('SELECT * FROM link_categories WHERE id = ?', [id])
}

export function deleteCategory(id: number): void {
  const db = getDatabase()
  const cat = db.getSingle('SELECT * FROM link_categories WHERE id = ?', [id])
  if (cat?.is_hardcoded) throw new Error('Cannot delete a hardcoded category')
  db.run('DELETE FROM link_categories WHERE id = ?', [id])
  db.save()
}
