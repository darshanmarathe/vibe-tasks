import { getDatabase } from '../db'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function getNotebooks(): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM notebooks ORDER BY name')
}

export function createNotebook(name: string): any {
  const db = getDatabase()
  const id = uid()
  db.run('INSERT INTO notebooks (id, name) VALUES (?, ?)', [id, name])
  db.save()
  return db.getSingle('SELECT * FROM notebooks WHERE id = ?', [id])
}

export function renameNotebook(id: string, name: string): void {
  const db = getDatabase()
  db.run('UPDATE notebooks SET name = ? WHERE id = ?', [name, id])
  db.save()
}

export function deleteNotebook(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM notebooks WHERE id = ?', [id])
  db.save()
}

export function getNotes(notebookId: string): any[] {
  const db = getDatabase()
  return db.exec(
    'SELECT * FROM notes WHERE notebook_id = ? AND is_trashed = 0 ORDER BY updated_at DESC',
    [notebookId]
  )
}

export function getAllNotes(): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM notes WHERE is_trashed = 0 ORDER BY updated_at DESC')
}

export function getNoteById(id: string): any {
  const db = getDatabase()
  return db.getSingle('SELECT * FROM notes WHERE id = ?', [id])
}

export function createNote(notebookId: string, title: string): any {
  const db = getDatabase()
  const id = uid()
  db.run('INSERT INTO notes (id, notebook_id, title) VALUES (?, ?, ?)', [id, notebookId, title])
  db.save()
  return db.getSingle('SELECT * FROM notes WHERE id = ?', [id])
}

export function saveNote(id: string, title: string, content: string): void {
  const db = getDatabase()
  db.run('UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, content, id])
  db.save()
}

export function trashNote(id: string): void {
  const db = getDatabase()
  db.run('UPDATE notes SET is_trashed = 1 WHERE id = ?', [id])
  db.save()
}

export function restoreNote(id: string): void {
  const db = getDatabase()
  db.run('UPDATE notes SET is_trashed = 0 WHERE id = ?', [id])
  db.save()
}

export function deleteNotePermanently(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM notes WHERE id = ?', [id])
  db.save()
}

export function getTrashedNotes(): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM notes WHERE is_trashed = 1 ORDER BY updated_at DESC')
}

export function getTags(): any[] {
  const db = getDatabase()
  return db.exec('SELECT * FROM tags ORDER BY name')
}

export function createTag(name: string): any {
  const db = getDatabase()
  const id = uid()
  db.run('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', [id, name])
  db.save()
  return db.getSingle('SELECT * FROM tags WHERE id = ?', [id])
}

export function deleteTag(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM tags WHERE id = ?', [id])
  db.save()
}

export function addTagToNote(noteId: string, tagId: string): void {
  const db = getDatabase()
  db.run('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [noteId, tagId])
  db.save()
}

export function removeTagFromNote(noteId: string, tagId: string): void {
  const db = getDatabase()
  db.run('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?', [noteId, tagId])
  db.save()
}

export function getNoteTags(noteId: string): any[] {
  const db = getDatabase()
  return db.exec(
    'SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?',
    [noteId]
  )
}

export function searchNotes(query: string): any[] {
  const db = getDatabase()
  const like = `%${query}%`
  return db.exec(
    'SELECT * FROM notes WHERE is_trashed = 0 AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC',
    [like, like]
  )
}
