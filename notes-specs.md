## Notes Management

### 2. Core Feature Specifications

#### 2.1 Notebook & Note Management

- **Hierarchical Structure:** Notebooks contain multiple Notes. No deep nesting.
- **Note Properties:** Title, Content (Markdown), Created Timestamp, Updated Timestamp, Tags.
- **CRUD Operations:** Create, Read, Update, Delete for Notebooks and Notes.
- **Trash System:** Soft-delete moves notes to Trash. Permanent deletion requires explicit purge.

#### 2.2 Markdown Editor

- **Dual Mode:** Split-screen view or toggle view (Edit Mode / Preview Mode).
- **Syntax Support:** Headers, Bold, Italic, Lists, Code Blocks, Tables, Checkboxes.
- **Auto-Save:** Local debounced save triggers 1 second after typing stops.

#### 2.3 Search & Organization

- **Full-Text Search:** Query note titles and content using SQLite FTS5 extension.
- **Tagging System:** Global tag list. Notes accept multiple tags for cross-referencing.
- **Sorting:** Order note lists by "Last Modified", "Date Created", or "Alphabetical".

### 3. Database Schema (SQLite)

```sql
CREATE TABLE notebooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    notebook_id TEXT,
    title TEXT DEFAULT 'Untitled',
    content TEXT DEFAULT '',
    is_trashed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE note_tags (
    note_id TEXT,
    tag_id TEXT,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

### 4. IPC API Bridge (preload.js)

- `window.api.getNotebooks()` — Fetches all active notebooks.
- `window.api.getNotes(notebookId)` — Fetches active notes for a specific notebook.
- `window.api.saveNote(noteId, title, content)` — Updates note data and updated_at timestamp.
- `window.api.searchNotes(query)` — Executes SQLite FTS5 query across all un-trashed notes.

### 5. Offline & System Performance

- **Zero Latency:** App must load under 200ms using local SQLite indexing.
- **File Attachments:** Images dropped into notes are saved into a local `~/AppData/Local/[AppName]/media` folder.
- **Export/Import:** Single-click export of data to a `.zip` archive containing Markdown files.

### Open Questions

- Do you require real-time cloud synchronization (e.g., Supabase, CouchDB) or strictly offline local-first storage?
- Should the editor support WYSIWYG visual editing (like Notion) or pure Markdown syntax (like Obsidian)?
- Do you need advanced security features like database encryption (SQLCipher)?
