import { getDatabase } from '../db'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function getDiagrams(): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM draw_diagrams ORDER BY updated_at DESC')
}

export function getDiagram(id: string): any {
  const db = getDatabase()
  return db.getSingle('SELECT * FROM draw_diagrams WHERE id = ?', [id])
}

export function createDiagram(name: string): any {
  const db = getDatabase()
  const id = uid()
  const now = new Date().toISOString()
  db.run(
    'INSERT INTO draw_diagrams (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, '', now, now]
  )
  db.save()
  return db.getSingle('SELECT * FROM draw_diagrams WHERE id = ?', [id])
}

export function renameDiagram(id: string, name: string): void {
  const db = getDatabase()
  db.run('UPDATE draw_diagrams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, id])
  db.save()
}

export function deleteDiagram(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM draw_diagrams WHERE id = ?', [id])
  db.save()
}

export function saveDiagram(id: string, data: string): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.run('UPDATE draw_diagrams SET data = ?, updated_at = ? WHERE id = ?', [data, now, id])
  db.save()
}
