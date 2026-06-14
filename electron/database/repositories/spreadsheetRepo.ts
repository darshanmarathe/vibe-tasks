import { getDatabase } from '../db'

export function getSpreadsheets(): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM spreadsheets ORDER BY updated_at DESC')
}

export function getSpreadsheet(id: number): any {
  const db = getDatabase()
  return db.getSingle('SELECT * FROM spreadsheets WHERE id = ?', [id])
}

export function createSpreadsheet(name?: string): any {
  const db = getDatabase()
  const now = new Date().toISOString()
  const defaultData = JSON.stringify([{ id: 'sheet1', name: 'Sheet1', celldata: [] }])
  db.run(
    'INSERT INTO spreadsheets (name, data, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [name || 'Untitled Spreadsheet', defaultData, now, now]
  )
  db.save()
  const id = db.getSingle('SELECT last_insert_rowid() as id').id
  return getSpreadsheet(id)
}

export function updateSpreadsheet(id: number, data: { name?: string; data?: string }): any {
  const db = getDatabase()
  const fields: string[] = []
  const params: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name) }
  if (data.data !== undefined) { fields.push('data = ?'); params.push(data.data) }
  if (fields.length > 0) {
    fields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)
    db.run(`UPDATE spreadsheets SET ${fields.join(', ')} WHERE id = ?`, params)
    db.save()
  }
  return getSpreadsheet(id)
}

export function deleteSpreadsheet(id: number): void {
  const db = getDatabase()
  db.run('DELETE FROM spreadsheets WHERE id = ?', [id])
  db.save()
}
