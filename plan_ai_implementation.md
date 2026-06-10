# AI Chat Implementation Plan

## Overview
Integrate an AI chat feature into Vibe Tasks with both local (Ollama) and cloud (Gemini/Groq) provider support, persistent chat history in SQLite, and streaming responses.

---

## New Dependency
- **`openai`** — universal SDK for all providers (Ollama, Gemini, Groq all support OpenAI-compatible API)

---

## 1. Database — `electron/database/db.ts`
Add `runAiChatMigrations()` to create:

### `chat_conversations` table
```sql
CREATE TABLE IF NOT EXISTS chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT 'New Chat',
  provider TEXT NOT NULL DEFAULT 'ollama',
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

### `chat_messages` table
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL,       -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
)
```

### `ai_config` table
```sql
CREATE TABLE IF NOT EXISTS ai_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
)
```
Defaults: `provider=ollama`, `model=llama3.2`, `api_key=`

---

## 2. Repo — `electron/database/repositories/chatRepo.ts`
Functions:
- `createConversation(provider, model)` → conversation
- `getConversations()` → conversations (ordered by updated_at desc)
- `updateConversationTitle(id, title)` → void
- `deleteConversation(id)` → void (cascading via FK)
- `addMessage(conversationId, role, content)` → message
- `getMessages(conversationId)` → messages (ordered by created_at)
- `clearMessages(id)` → void
- `getAiConfig(key)` → string | null
- `setAiConfig(key, value)` → void

---

## 3. Provider Client — helper in main process
Shared `createAiClient()` function:
```ts
function createAiClient() {
  const provider = getAiConfig('provider') || 'ollama'
  const apiKey = getAiConfig('api_key') || ''
  if (provider === 'ollama')
    return new OpenAI({ baseURL: 'http://localhost:11434/v1' })
  if (provider === 'gemini')
    return new OpenAI({ baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKey })
  if (provider === 'groq')
    return new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey })
}
```

---

## 4. IPC — `electron/main.ts` inside `registerIpcHandlers()`

### Request/Response handlers (`ipcMain.handle`)
| Channel | Returns |
|---|---|
| `ai:chat:conversations:list` | `ChatConversation[]` |
| `ai:chat:conversations:create` | `ChatConversation` |
| `ai:chat:conversations:delete` | `void` |
| `ai:chat:conversations:rename` | `void` |
| `ai:chat:messages:list` | `ChatMessage[]` |
| `ai:chat:config:get` | `{ provider, apiKey, model }` |
| `ai:chat:config:set` | `void` |

### Streaming handler (`ipcMain.on` — event-based)
| Channel | Behavior |
|---|---|
| `ai:chat:send` | Saves user message → creates stream → emits `ai:chat:chunk` events → saves assistant response |
| `ai:chat:cancel` | Aborts active stream for given conversationId |

### Events sent to renderer
- `ai:chat:chunk` — `{ conversationId, delta?: string, done: boolean, fullContent?: string }`

Stream cancellation uses an `AbortController` map keyed by `conversationId`.

---

## 5. Preload — `electron/preload.ts` + `electron/preload.cjs`
Add matching bridge methods for all 9 IPC channels. The streaming listener uses:
```ts
onChatChunk: (callback) => {
  const handler = (_e, data) => callback(data)
  ipcRenderer.on('ai:chat:chunk', handler)
  return () => ipcRenderer.removeListener('ai:chat:chunk', handler)
}
```

---

## 6. Types — `src/types/models.ts`
New interfaces:
```ts
ChatConversation { id, title, provider, model, created_at, updated_at }
ChatMessage { id, conversation_id, role, content, created_at }
```

New `ElectronAPI` methods (9 total):
```ts
getConversations, createConversation, deleteConversation, renameConversation,
getMessages, sendChatMessage, cancelChat, onChatChunk,
getAiConfig, setAiConfig
```

---

## 7. Page — `src/pages/AiChat.tsx`
Layout:
- **Left panel** — conversation list with New / Delete / Rename
- **Right panel** — message list (auto-scroll) + text input + Send / Cancel buttons
- Streaming display: append deltas to the latest assistant message in real-time
- Model/provider indicator shown per conversation

---

## 8. Route — `src/App.tsx`
Add `<Route path="/ai-chat" element={<AiChat />} />`

## 9. Sidebar — `src/components/Layout.tsx`
Add `{ path: '/ai-chat', label: 'AI Chat', icon: '🤖' }` to `navGroups`

---

## Summary of All Files Changed

| File | Change |
|---|---|
| `electron/database/db.ts` | Add `runAiChatMigrations()` + 3 new tables |
| `electron/database/repositories/chatRepo.ts` | **New file** — all chat DB operations |
| `electron/main.ts` | 9 IPC handlers in `registerIpcHandlers()` |
| `electron/preload.ts` | 9 bridge methods + streaming listener |
| `electron/preload.cjs` | Same 9 bridge methods (in sync) |
| `src/types/models.ts` | 2 interfaces + 9 ElectronAPI methods |
| `src/pages/AiChat.tsx` | **New file** — full chat UI |
| `src/App.tsx` | Route for `/ai-chat` |
| `src/components/Layout.tsx` | Sidebar entry |
| `package.json` | Add `openai` dependency |

---

## Order of Implementation

### Phase 1 — Core AI Chat (no native deps)
1. `openai` dependency in package.json + `npm install`
2. SQLite migrations in `db.ts`
3. `chatRepo.ts` — all repo functions
4. Types in `models.ts`
5. IPC handlers in `main.ts`
6. Preload bridge in both files
7. `AiChat.tsx` page
8. Route in `App.tsx`
9. Sidebar entry in `Layout.tsx`

---

## Phase 2 — Vector Search with LanceDB (RAG layer)

Add semantic search across notes, tasks, and chat history to give the AI context about the user's data.

### New Dependency
- **`@lancedb/lancedb`** — embedded vector database (Rust native addon, `napi-rs`)
- **`electron-rebuild`** (dev) — rebuild native addon for Electron's Node.js ABI

### How It Works
```
User asks: "What did I decide about the budget?"
  → embed query with Ollama (nomic-embed-text) or cloud embedding API
  → vector search across notes + tasks + flashcard content + chat history
  → inject top-k results as context into the AI chat prompt
  → AI responds with knowledge of the user's actual data
```

### Database — LanceDB storage
No new SQLite tables. LanceDB stores its data in a directory (e.g. `app.getPath('userData')/lancedb`). Each collection gets a table:
- `notes_embeddings` — note title + content + vector
- `tasks_embeddings` — task title + description + vector  
- `flashcards_embeddings` — card question + answer + vector
- `chat_history_embeddings` — past messages + vector

### Embedding Strategy
Two options, user-configurable:
| Option | Provider | Cost | Quality |
|---|---|---|---|
| Local | Ollama `nomic-embed-text` (768d) | Free, offline | Good |
| Cloud | OpenAI `text-embedding-3-small` | ~$0.0004/1K tokens | Excellent |

### Indexing Flow (main process)
```
On note/task/flashcard create/update:
  → generate embedding via selected provider
  → upsert into LanceDB table (id + text + vector + metadata)

On app startup:
  → re-index any unindexed records (optional background job)
  → maintain a `last_indexed` column in each SQLite table
```

### Search Flow (main process)
```
When user sends a chat message:
  → optionally search LanceDB for related content
  → embed the user's message
  → vectorSearch() across all tables (or selected ones)
  → filter results by score threshold
  → format as context block and prepend to AI prompt
```

### IPC — `electron/main.ts` inside `registerIpcHandlers()`
| Channel | Returns |
|---|---|
| `ai:rag:search` | `{ source, title, content, score }[]` — search all indexed content |
| `ai:rag:reindex` | `void` — force re-index all content |
| `ai:rag:status` | `{ indexedNotes, indexedTasks, ... }` — index stats |

### Preload — `electron/preload.ts` + `electron/preload.cjs`
Add 3 bridge methods:
- `ragSearch(query)` — semantic search across indexed content
- `ragReindex()` — force re-index
- `ragStatus()` — get index stats

### Types — `src/types/models.ts`
```ts
interface RagResult {
  source: 'note' | 'task' | 'flashcard' | 'chat'
  id: number
  title: string
  content: string
  score: number
}
```

Add to `ElectronAPI`:
```ts
ragSearch: (query: string) => Promise<RagResult[]>
ragReindex: () => Promise<void>
ragStatus: () => Promise<{ indexedNotes: number; indexedTasks: number; indexedFlashcards: number; indexedChats: number }>
```

### Integration with AiChat
The `AiChat.tsx` page gets:
- A toggle button "Search my data" (enable/disable RAG context injection)
- Results shown as inline citation chips below the AI response
- Configurable in settings (which content types to search)

### Electron Build Notes
`@lancedb/lancedb` is a native Rust addon. It must be rebuilt for Electron:
```bash
npx @electron/rebuild -m node_modules/@lancedb/lancedb
```
This should be added as a postinstall script in `package.json`:
```json
"scripts": {
  "postinstall": "electron-rebuild -f -w @lancedb/lancedb"
}
```

### When to implement
**Phase 2 is additive** — Phase 1 (AI Chat) works completely independently. LanceDB only adds RAG context injection. Implement after Phase 1 is stable.

### Summary of Files Changed (Phase 2)

| File | Change |
|---|---|
| `package.json` | Add `@lancedb/lancedb`, `electron-rebuild`; add postinstall script |
| `electron/main.ts` | 3 new IPC handlers for LanceDB operations |
| `electron/preload.ts` | 3 bridge methods |
| `electron/preload.cjs` | Same 3 bridge methods |
| `src/types/models.ts` | `RagResult` interface + 3 ElectronAPI methods |
| `src/pages/AiChat.tsx` | RAG toggle + citation display |
| `src/components/Settings/AiConfigTab.tsx` | RAG config (which sources, toggle) |
