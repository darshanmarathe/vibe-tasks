import { getDatabase } from '../db'

function now(): string {
  return new Date().toISOString()
}

export interface ChatConversationRow {
  id: number
  title: string
  provider: string
  model: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessageRow {
  id: number
  conversation_id: number
  role: string
  content: string
  created_at: string
}

export function getConversations(): ChatConversationRow[] {
  const { exec } = getDatabase()
  return exec('SELECT * FROM chat_conversations ORDER BY updated_at DESC')
}

export function createConversation(provider = 'ollama', model = 'llama3.2'): ChatConversationRow {
  const { exec, run, save } = getDatabase()
  const n = now()
  run('INSERT INTO chat_conversations (title, provider, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ['New Chat', provider, model, n, n])
  save()
  const rows = exec('SELECT * FROM chat_conversations WHERE id = last_insert_rowid()')
  return rows[0]
}

export function updateConversationTitle(id: number, title: string): void {
  const { run, save } = getDatabase()
  run('UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?', [title, now(), id])
  save()
}

export function deleteConversation(id: number): void {
  const { run, save } = getDatabase()
  run('DELETE FROM chat_messages WHERE conversation_id = ?', [id])
  run('DELETE FROM chat_conversations WHERE id = ?', [id])
  save()
}

export function addMessage(conversationId: number, role: string, content: string): ChatMessageRow {
  const { exec, run, save } = getDatabase()
  const n = now()
  run('INSERT INTO chat_messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)',
    [conversationId, role, content, n])
  run('UPDATE chat_conversations SET updated_at = ? WHERE id = ?', [n, conversationId])
  save()
  return exec('SELECT * FROM chat_messages WHERE id = last_insert_rowid()')[0]
}

export function getMessages(conversationId: number): ChatMessageRow[] {
  const { exec } = getDatabase()
  return exec('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC', [conversationId])
}

export function getAiConfig(key: string): string | null {
  const { exec } = getDatabase()
  const rows = exec('SELECT value FROM ai_config WHERE key = ?', [key])
  return rows.length > 0 ? rows[0].value : null
}

export function setAiConfig(key: string, value: string): void {
  const { run, save } = getDatabase()
  run('INSERT OR REPLACE INTO ai_config (key, value) VALUES (?, ?)', [key, value])
  save()
}
