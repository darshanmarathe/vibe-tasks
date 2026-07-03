# Ideas Feature — Implementation Plan

## Overview

A dedicated Ideas management feature within Vibe Tasks. Each idea stores a **title**, **introduction** (rich text), **links**, **documents** (attachments), and a **comment/update timeline**. Follows the exact same 5-layer pattern as every other feature (Notes, Habits, Flashcards, etc.).

---

## 1. Database Schema

Add `runIdeaMigrations()` to `electron/database/db.ts`, called from `runMigrations()`.

```sql
CREATE TABLE IF NOT EXISTS ideas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL DEFAULT 'Untitled Idea',
  introduction    TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft',
  stage           TEXT DEFAULT 'concept',
  impact          INTEGER DEFAULT 0,
  effort          INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_documents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  idea_id         INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  data            BLOB NOT NULL,
  mime_type       TEXT DEFAULT 'application/octet-stream',
  file_size       INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idea_docs_idea ON idea_documents(idea_id);

CREATE TABLE IF NOT EXISTS idea_updates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  idea_id         INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  update_type     TEXT NOT NULL DEFAULT 'comment',
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idea_updates_idea ON idea_updates(idea_id);
```

**Links**: reuse existing `links` table with `linked_type='idea'`, `linked_id=<id>`.
**Tags**: reuse existing `tags` table via a new `idea_tags` junction.

---

## 2. TypeScript Models

Add to `src/types/models.ts`:

```ts
export interface Idea {
  id: number
  title: string
  introduction: string
  status: 'draft' | 'in-progress' | 'completed' | 'archived'
  stage: 'concept' | 'prototype' | 'review' | 'shipping'
  impact: number
  effort: number
  created_at: string
  updated_at: string
}

export interface IdeaDocument {
  id: number
  idea_id: number
  filename: string
  data: string
  mime_type: string
  file_size: number
  created_at: string
}

export interface IdeaUpdate {
  id: number
  idea_id: number
  content: string
  update_type: 'comment' | 'status-change' | 'stage-change'
  created_at: string
}
```

Add to `ElectronAPI`:

```ts
getIdeas: (filters?: { status?: string; stage?: string; sortBy?: string }) => Promise<Idea[]>
getIdea: (id: number) => Promise<Idea | null>
createIdea: (data: Partial<Idea>) => Promise<Idea>
updateIdea: (id: number, data: Partial<Idea>) => Promise<Idea>
deleteIdea: (id: number) => Promise<void>
getIdeaDocuments: (ideaId: number) => Promise<IdeaDocument[]>
addIdeaDocument: (ideaId: number, filename: string, data: string, mimeType: string) => Promise<IdeaDocument>
deleteIdeaDocument: (id: number) => Promise<void>
getIdeaUpdates: (ideaId: number) => Promise<IdeaUpdate[]>
addIdeaUpdate: (ideaId: number, content: string, updateType?: string) => Promise<IdeaUpdate>
```

---

## 3. Repository

Create `electron/database/repositories/ideaRepo.ts` (pattern: `noteRepo.ts`).

| Function | Description |
|---|---|
| `getIdeas(filters?)` | SELECT with optional WHERE status/stage + sort |
| `getIdea(id)` | SELECT single row |
| `createIdea(data)` | INSERT into ideas, return new row |
| `updateIdea(id, data)` | UPDATE ideas SET ..., return updated row |
| `deleteIdea(id)` | DELETE from ideas (cascade handles docs + updates) |
| `getIdeaDocuments(ideaId)` | SELECT from idea_documents WHERE idea_id |
| `addIdeaDocument(ideaId, filename, data, mimeType)` | INSERT into idea_documents |
| `deleteIdeaDocument(id)` | DELETE from idea_documents |
| `getIdeaUpdates(ideaId)` | SELECT from idea_updates WHERE idea_id ORDER BY created_at |
| `addIdeaUpdate(ideaId, content, updateType)` | INSERT into idea_updates |

---

## 4. IPC Handlers

Add to `electron/main.ts` in `registerIpcHandlers()`:

```ts
ipcMain.handle('ideas:list', (_e, filters) => ideaRepo.getIdeas(filters))
ipcMain.handle('ideas:get', (_e, id) => ideaRepo.getIdea(id))
ipcMain.handle('ideas:create', (_e, data) => ideaRepo.createIdea(data))
ipcMain.handle('ideas:update', (_e, id, data) => ideaRepo.updateIdea(id, data))
ipcMain.handle('ideas:delete', (_e, id) => ideaRepo.deleteIdea(id))
ipcMain.handle('ideas:documents:list', (_e, ideaId) => ideaRepo.getIdeaDocuments(ideaId))
ipcMain.handle('ideas:documents:add', (_e, ideaId, filename, data, mimeType) => ideaRepo.addIdeaDocument(ideaId, filename, data, mimeType))
ipcMain.handle('ideas:documents:delete', (_e, id) => ideaRepo.deleteIdeaDocument(id))
ipcMain.handle('ideas:updates:list', (_e, ideaId) => ideaRepo.getIdeaUpdates(ideaId))
ipcMain.handle('ideas:updates:add', (_e, ideaId, content, updateType) => ideaRepo.addIdeaUpdate(ideaId, content, updateType))
```

---

## 5. Preload Bridge

Add to `electron/preload.ts`:

```ts
getIdeas: (filters?) => ipcRenderer.invoke('ideas:list', filters),
getIdea: (id) => ipcRenderer.invoke('ideas:get', id),
createIdea: (data) => ipcRenderer.invoke('ideas:create', data),
updateIdea: (id, data) => ipcRenderer.invoke('ideas:update', id, data),
deleteIdea: (id) => ipcRenderer.invoke('ideas:delete', id),
getIdeaDocuments: (ideaId) => ipcRenderer.invoke('ideas:documents:list', ideaId),
addIdeaDocument: (ideaId, filename, data, mimeType) => ipcRenderer.invoke('ideas:documents:add', ideaId, filename, data, mimeType),
deleteIdeaDocument: (id) => ipcRenderer.invoke('ideas:documents:delete', id),
getIdeaUpdates: (ideaId) => ipcRenderer.invoke('ideas:updates:list', ideaId),
addIdeaUpdate: (ideaId, content, updateType) => ipcRenderer.invoke('ideas:updates:add', ideaId, content, updateType),
```

---

## 6. Frontend Page

Create `src/pages/Ideas.tsx` — 3-panel layout matching Notes pattern:

```
┌──────────────────────────────────────────────────────────┐
│  Left sidebar (idea list)    │  Detail panel              │
│  ┌──────────────────────┐   │  ┌──────────────────────┐  │
│  │ Search / Filter bar  │   │  │ Title input          │  │
│  ├──────────────────────┤   │  ├──────────────────────┤  │
│  │ Idea card 1          │   │  │ Status/Stage/Impact  │  │
│  │ Idea card 2          │   │  │ (dropdowns + stars)  │  │
│  │ Idea card 3          │   │  ├──────────────────────┤  │
│  │ ...                  │   │  │ Introduction         │  │
│  ├──────────────────────┤   │  │ (TipTap editor)      │  │
│  │ [+ New Idea]         │   │  ├──────────────────────┤  │
│  └──────────────────────┘   │  │ Links (LinkInput)    │  │
│                              │  ├──────────────────────┤  │
│                              │  │ Documents            │  │
│                              │  │ (upload / list)      │  │
│                              │  ├──────────────────────┤  │
│                              │  │ Updates (timeline)   │  │
│                              │  └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

| Section | Implementation |
|---|---|
| Title | `<input>` with auto-save on blur |
| Status dropdown | `draft`, `in-progress`, `completed`, `archived` |
| Stage dropdown | `concept`, `prototype`, `review`, `shipping` |
| Impact/Effort | Star rating (1–5), clickable |
| Introduction | TipTap editor (reuse config from Notes.tsx) |
| Links | `<LinkInput linkedType="idea" linkedId={idea.id} />` |
| Documents | File input → `FileReader` base64 → `addIdeaDocument()`, list with delete |
| Updates | Textarea + submit, reverse-chronological feed. System auto-posts when status/stage changes |
| Search | Filter ideas by title text |

---

## 7. Navigation

In `src/components/Layout.tsx`, add to the **Knowledge** group:

```ts
{ path: '/ideas', label: 'Ideas', icon: '💡' },
```

---

## 8. Routes

In `src/App.tsx`:

```ts
import Ideas from './pages/Ideas'
// ...
<Route path="/ideas" element={<Ideas />} />
```

---

## 9. Dashboard Widget (optional)

Add a "Recent Ideas" card to `src/pages/Dashboard.tsx` showing latest 5 ideas with status badges, following the existing dashboard card pattern.

---

## Feature Coverage Matrix

| Requirement | How it's handled |
|---|---|
| Title | `ideas.title` — text input |
| Introduction | `ideas.introduction` — TipTap rich editor |
| Links | Existing `links` table with `linked_type='idea'` |
| Documents | `idea_documents` table — file upload → base64 storage |
| Comments & Updates | `idea_updates` table — threaded timeline feed |
| Status workflow | `ideas.status` — dropdown (draft → in-progress → completed → archived) |
| Stage tracking | `ideas.stage` — dropdown (concept → prototype → review → shipping) |
| Impact/Effort scoring | `ideas.impact` + `ideas.effort` — 1–5 star ratings |
| Search/Filter | Full-text search on title + filter by status/stage |
| Tags | Reuse `tags` table via `idea_tags` junction |

---

## Implementation Order

| Step | What | Files |
|---|---|---|
| 1 | DB migration | `electron/database/db.ts` |
| 2 | Types & ElectronAPI | `src/types/models.ts` |
| 3 | Repository | `electron/database/repositories/ideaRepo.ts` |
| 4 | IPC handlers | `electron/main.ts` |
| 5 | Preload bridge | `electron/preload.ts` |
| 6 | Page component | `src/pages/Ideas.tsx` |
| 7 | Route + Nav | `src/App.tsx`, `src/components/Layout.tsx` |
| 8 | Dashboard widget (optional) | `src/pages/Dashboard.tsx` |
