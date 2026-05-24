# Notes Feature Spec

## Overview
Local-first WYSIWYG notes manager with TipTap editor. Notebook hierarchy, auto-save, search, and trash system. No cloud dependency — everything stored in local SQLite.

## Current Features (v1.4.x)

### Notebooks ✅
- ✅ Create, rename, delete notebooks
- ✅ List all notebooks in sidebar
- ✅ Notes grouped by notebook

### Notes ✅
- ✅ Create, edit, save notes
- ✅ Trash / restore / permanently delete
- ✅ Auto-save with 1s debounce
- ✅ Title + rich content (TipTap WYSIWYG)
- ✅ Search across all notes (title + content)

### TipTap Editor ✅
- ✅ Bold, Italic, Strike
- ✅ Headings (H1–H3)
- ✅ Bullet & ordered lists
- ✅ Code blocks
- ✅ Clickable links

## Database Schema

| Table | Columns |
|-------|---------|
| notebooks | id TEXT PK, name TEXT, created_at TEXT |
| notes | id TEXT PK, notebook_id TEXT FK, title TEXT, content TEXT, is_trashed INTEGER, created_at TEXT, updated_at TEXT |
| tags | id TEXT PK, name TEXT UNIQUE |
| note_tags | note_id TEXT FK, tag_id TEXT FK (composite PK) |

## Feature Pipeline (Planned)

### P1 — Quick Wins
| # | Feature | Description |
|---|---------|-------------|
| 1 | **Backlinks** | Display notes that link to the current note (parsed from `[[wikilink]]` syntax in content) |
| 2 | **Tagging** | Add/remove tags per note, filter notes by tag, tag sidebar |
| 3 | **Note Linking** | `[[Note Title]]` autocomplete to link notes; clickable to navigate |
| 4 | **Quick Switcher** | Ctrl+P / Cmd+P palette to search and jump to any note |
| 5 | **Pin / Favorite** | Pin important notes to top of list |
| 6 | **Markdown Export** | Export single note or full notebook as `.md` files |
| 7 | **Todo Checklists** | TipTap task list with checkbox toggle inside notes |
| 8 | **Word Count** | Status bar showing words, characters, reading time |

### P2 — Power Features
| # | Feature | Description |
|---|---------|-------------|
| 9 | **Daily Notes** | One-click create/open today's note (Ctrl+D), auto-titled with date |
| 10 | **Templates** | Create reusable note templates; apply when creating a new note |
| 11 | **Duplicate Note** | Right-click or menu option to duplicate a note |
| 12 | **Embed Images** | Drag-drop or paste images into editor, stored locally as base64 or `media/` folder |
| 13 | **Sort Notes** | Sort by last modified, created, alphabetical |
| 14 | **Color Labels** | Assign color to notebooks for visual organization |
| 15 | **Reading Time** | Display estimated reading time in note list |
| 16 | **Table Support** | TipTap table extension (insert, edit, delete rows/cols) |

### P3 — Advanced
| # | Feature | Description |
|---|---------|-------------|
| 17 | **Local Graph View** | Force-directed graph showing note connections (backlinks) for the current notebook |
| 18 | **Version History** | Store note snapshots on save; restore previous versions |
| 19 | **Block References** | Reference specific heading or paragraph from another note (`Note Title#heading`) |
| 20 | **Password Protect** | Lock individual notes or notebooks with a passphrase (AES encrypt content in DB) |
| 21 | **Markdown Import** | Import `.md` files — create notes with frontmatter metadata |
| 22 | **Split Pane** | View two notes side-by-side |
| 23 | **PDF Export** | Export note as PDF (print-to-PDF via window or TipTap export) |
| 24 | **Collapsible Headings** | Collapse/expand sections under headings for better navigation |
| 25 | **Slash Commands** | Type `/` in editor to insert tables, code blocks, dividers, etc. |

### P4 — Ecosystem
| # | Feature | Description |
|---|---------|-------------|
| 26 | **Link to Tasks** | Create a Task from a note (opens task form, links back) |
| 27 | **Link to Mind Map Node** | Attach note to a mind map node for rich context |
| 28 | **Dashboard Widget** | Recent notes widget on Dashboard (last 5 edited) |
| 29 | **Global Search** | Search cross all notes from app-wide search bar |

## Implementation Notes
- **Backlinks**: Full-text search for `[[...]]` patterns in note content; store in a `backlinks` table or query on demand
- **Tagging**: Use the existing `tags` + `note_tags` schema, add tag input in note editor toolbar
- **Linking**: TipTap extension that autocompletes note titles wrapped in `[[...]]`; click handler navigates to note
- **Quick Switcher**: Modal with fuzzy search over all note titles, keyboard navigable
- **Daily Notes**: Auto-create note with title `2026-05-24` (today's date) in a "Daily" notebook
- **Templates**: Store as notes in a special `_templates` notebook or a separate `templates` table
- **Graph View**: Use @xyflow/react (same as Mind Map) with notes as nodes and backlinks as edges
- **Version History**: Store diffs or full snapshots in a `note_versions` table on each save
- **Local media**: Save dropped images to `{userData}/media/{note_id}/` folder

## Plan

### P1 Implementation Plan

#### 1. Backlinks

**What**: Panel showing which other notes link to the current note via `[[Title]]` syntax.

| Layer | Changes |
|-------|---------|
| **IPC** | Add `getBacklinks(noteId, title)` — `SELECT id, title, notebook_id FROM notes WHERE content LIKE '%[[title]]%' AND id != ?` |
| **Preload** | Add `getBacklinks` method to `ElectronAPI` |
| **UI** | Collapsible panel below the editor: "Backlinks (3)" with clickable note titles. Extract surrounding snippet for context |
| **Key detail** | Escape `%` and `_` in the title for LIKE safety; use `content LIKE '%' || ? || '%'` with SQL |

---

#### 2. Tagging

**What**: Add/remove tags per note, filter by tag, tag sidebar. Tables already exist.

| Layer | Changes |
|-------|---------|
| **DB** | No schema changes needed (tags + note_tags tables already exist) |
| **IPC** | `getAllTags()` → `SELECT t.*, COUNT(nt.note_id) as count FROM tags t LEFT JOIN note_tags nt ON t.id=nt.tag_id GROUP BY t.id`; `addTagToNote` / `removeTagFromNote` / `getNotesByTag` |
| **Preload** | 4 new methods |
| **UI** | Tag input bar in editor toolbar: type name → enter → badge created. Badges shown below note title. Sidebar section listing tags with note counts |
| **Key detail** | `addTagToNote` uses `INSERT OR IGNORE`; creates tag first if not exists via `INSERT OR IGNORE INTO tags` |

---

#### 3. Note Linking (`[[wikilink]]`)

**What**: Type `[[` → autocomplete dropdown of note titles → renders as clickable link.

| Layer | Changes |
|-------|---------|
| **DB** | No changes |
| **IPC** | Add `searchNoteTitles(query)` — `SELECT id, title, notebook_id FROM notes WHERE is_trashed=0 AND title LIKE '%' || ? || '%' LIMIT 10` |
| **Preload** | Add `searchNoteTitles` |
| **UI** | Custom **TipTap WikiLink extension**: on `[[` keystroke, show a floating autocomplete popup; on selection, insert a `<span data-wikilink="noteId">Title</span>`; on click, navigate to that note |
| **Key detail** | The TipTap extension stores `noteId` as a data attribute on a custom inline node, not `[[text]]` — survives HTML round-trips through the DB |

---

#### 4. Quick Switcher (Ctrl+P)

**What**: Modal overlay for jumping to any note by typing its title.

| Layer | Changes |
|-------|---------|
| **IPC** | Reuse existing `getAllNotes()` |
| **UI** | React portal modal: input field at top, fuzzy-filtered list below. Arrow keys to navigate, Enter to open, Escape to close. Show notebook name as subtitle + updated_at |
| **Key detail** | Use `useMemo` with debounced query (150ms) over the all-notes list. Keyboard handler registered via `useEffect` for Ctrl+P / Cmd+P |

---

#### 5. Pin / Favorite

**What**: Pin important notes to the top of the list.

| Layer | Changes |
|-------|---------|
| **DB** | `ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0` |
| **IPC** | `togglePin(noteId)` — `UPDATE notes SET is_pinned = CASE WHEN is_pinned THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`; update `getNotes` / `getAllNotes` to `ORDER BY is_pinned DESC, updated_at DESC` |
| **Preload** | Add `togglePin` |
| **UI** | 📌 pin icon in note list row; toggle on click. Pinned notes highlighted and appear first. Toggle button in note header toolbar |

---

#### 6. Markdown Export

**What**: Export single note or full notebook as `.md` file(s).

| Layer | Changes |
|-------|---------|
| **IPC** | Add `exportNoteAsMarkdown(noteId, savePath)` — converts TipTap HTML to Markdown using `turndown`, writes to `savePath` via `fs.writeFileSync` |
| **Preload** | Add `exportNoteAsMarkdown` |
| **UI** | Right-click note → "Export as Markdown" → Electron `dialog.showSaveDialog`. For notebook export: batch loop with `dialog.showOpenDialog({ properties: ['openDirectory'] })` |
| **Key detail** | Install `turndown` for HTML→MD conversion; or use TipTap's `editor.getText()` for plain-text |

---

#### 7. Todo Checklists

**What**: Checkbox task lists inside notes (TipTap extension).

| Layer | Changes |
|-------|---------|
| **DB** | No changes — checkboxes are HTML in the content field |
| **UI** | Install `@tiptap/extension-task-list` and `@tiptap/extension-task-item`. Add a `☑` button to the editor toolbar that toggles the task list node |
| **Key detail** | Task items store checked/unchecked state as HTML attribute — the TipTap extensions handle this natively |

---

#### 8. Word Count

**What**: Status bar showing words, characters, reading time at the bottom of the editor.

| Layer | Changes |
|-------|---------|
| **DB** | No changes |
| **UI** | Bottom bar component. Subscribe to `editor.on('update', ...)` → `editor.getText()` → `.split(/\s+/).filter(Boolean).length` for words, `.length` for chars. Reading time = `Math.ceil(words / 200)` min |
| **Key detail** | Memoize via `useMemo` with editor text dependency to avoid re-renders on every keystroke |

---

### Summary

| # | Feature | Schema Change | New IPC | Preload | Main UI |
|---|---------|:---:|:---:|:---:|--------|
| 1 | Backlinks | — | 1 | 1 | Panel below editor |
| 2 | Tagging | — | 4 | 4 | Tag input + sidebar |
| 3 | WikiLinks | — | 1 | 1 | TipTap extension |
| 4 | Quick Switcher | — | — | — | Modal overlay |
| 5 | Pin / Favorite | +1 column | 1 + update queries | 1 | Pin icon in list |
| 6 | Markdown Export | — | 1 | 1 | Context menu + save dialog |
| 7 | Checklists | — | — | — | TipTap extensions only |
| 8 | Word Count | — | — | — | Status bar component |

**Total**: 1 DB migration, 8 new IPC handlers, 8 preload methods, ~6 new UI components/extensions.

## Release Roadmap
| Version | Features |
|---------|----------|
| 1.4.0 | ✅ TipTap WYSIWYG editor, notebooks, trash, search |
| 1.4.5 | Backlinks, Tagging, Note Linking (`[[wikilink]]`), Quick Switcher |
| 1.4.6 | Pin/Favorite, Markdown Export, Checklists, Word Count |
| 1.5.2 | Daily Notes, Templates, Duplicate, Image Embed |
| 1.5.3 | Sort, Color Labels, Tables, Reading Time |
| 1.6.1 | Graph View, Version History, Block References |
| 1.6.2 | Password Protect, Markdown Import, Split Pane, PDF Export |
