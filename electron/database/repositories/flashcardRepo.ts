import { getDatabase } from '../db'
import type { FlashcardDeck, Flashcard } from '../../../src/types/models'

function now(): string {
  return new Date().toISOString()
}

function dateOnly(): string {
  return now().split('T')[0]
}

export function getDecks(): FlashcardDeck[] {
  const { exec } = getDatabase()
  return exec('SELECT * FROM flashcard_decks ORDER BY name')
}

export function createDeck(name: string, description = ''): FlashcardDeck {
  const { run, save } = getDatabase()
  run('INSERT INTO flashcard_decks (name, description, created_at) VALUES (?, ?, ?)', [name, description, now()])
  save()
  return getDecks().find(d => d.name === name)!
}

export function updateDeck(id: number, data: Partial<FlashcardDeck>): FlashcardDeck {
  const { exec, run, save } = getDatabase()
  const sets: string[] = []
  const vals: any[] = []
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
  if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description) }
  if (sets.length > 0) {
    vals.push(id)
    run(`UPDATE flashcard_decks SET ${sets.join(', ')} WHERE id = ?`, vals)
    save()
  }
  return exec('SELECT * FROM flashcard_decks WHERE id = ?', [id])[0]
}

export function deleteDeck(id: number): void {
  const { run, save } = getDatabase()
  run('DELETE FROM flashcard_decks WHERE id = ?', [id])
  save()
}

// ── Flashcards ──

const FLASHCARD_COLS = 'id, deck_id, front, back, ease_factor, interval, repetitions, next_review_date, created_at, updated_at'

function rowToFlashcard(row: any): Flashcard {
  return {
    id: row.id,
    deck_id: row.deck_id,
    front: row.front,
    back: row.back,
    ease_factor: row.ease_factor,
    interval: row.interval,
    repetitions: row.repetitions,
    next_review_date: row.next_review_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function getFlashcards(deckId: number): Flashcard[] {
  const { exec } = getDatabase()
  return exec(`SELECT ${FLASHCARD_COLS} FROM flashcards WHERE deck_id = ? ORDER BY id`, [deckId]).map(rowToFlashcard)
}

export function createFlashcard(deckId: number, front: string, back: string): Flashcard {
  const { run, save } = getDatabase()
  const n = now()
  run('INSERT INTO flashcards (deck_id, front, back, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [deckId, front, back, n, n])
  save()
  const { exec } = getDatabase()
  const row = exec('SELECT * FROM flashcards WHERE id = last_insert_rowid()')[0]
  return rowToFlashcard(row)
}

export function updateFlashcard(id: number, data: Partial<Flashcard>): Flashcard {
  const { exec, run, save } = getDatabase()
  const sets: string[] = ['updated_at = ?']
  const vals: any[] = [now()]
  const allowed = ['front', 'back', 'ease_factor', 'interval', 'repetitions', 'next_review_date']
  for (const key of allowed) {
    if ((data as any)[key] !== undefined) {
      sets.push(`${key} = ?`)
      vals.push((data as any)[key])
    }
  }
  vals.push(id)
  run(`UPDATE flashcards SET ${sets.join(', ')} WHERE id = ?`, vals)
  save()
  const row = exec(`SELECT ${FLASHCARD_COLS} FROM flashcards WHERE id = ?`, [id])[0]
  return rowToFlashcard(row)
}

export function deleteFlashcard(id: number): void {
  const { run, save } = getDatabase()
  run('DELETE FROM flashcards WHERE id = ?', [id])
  save()
}

// ── SM-2 Algorithm ──

export function reviewFlashcard(id: number, quality: number): Flashcard {
  const { exec } = getDatabase()
  const row = exec(`SELECT ${FLASHCARD_COLS} FROM flashcards WHERE id = ?`, [id])[0]
  if (!row) throw new Error('Flashcard not found')

  let { ease_factor, interval, repetitions } = rowToFlashcard(row)

  const q = Math.max(0, Math.min(5, Math.round(quality)))

  if (q >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * ease_factor)
    repetitions++
  } else {
    repetitions = 0
    interval = 1
  }

  ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + interval)
  const next_review_date = nextDate.toISOString().split('T')[0]

  const { run, save } = getDatabase()
  const n = now()
  run(`UPDATE flashcards SET ease_factor = ?, interval = ?, repetitions = ?, next_review_date = ?, updated_at = ? WHERE id = ?`,
    [ease_factor, interval, repetitions, next_review_date, n, id])
  save()

  const updated = exec(`SELECT ${FLASHCARD_COLS} FROM flashcards WHERE id = ?`, [id])[0]
  return rowToFlashcard(updated)
}

export function getDueFlashcards(deckId?: number): Flashcard[] {
  const { exec } = getDatabase()
  const today = dateOnly()
  let sql = `SELECT ${FLASHCARD_COLS} FROM flashcards WHERE (next_review_date IS NULL OR next_review_date <= ?)`
  const params: any[] = [today]
  if (deckId) {
    sql += ' AND deck_id = ?'
    params.push(deckId)
  }
  sql += ' ORDER BY next_review_date ASC, id ASC'
  return exec(sql, params).map(rowToFlashcard)
}
