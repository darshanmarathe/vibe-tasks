import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

let db: SqlJsDatabase
let currentDbPath: string

const CONFIG_PATH = path.join(app.getPath('userData'), 'vibetasks-config.json')

function getDefaultDbPath() {
  return path.join(app.getPath('userData'), 'vibetasks.db')
}

function loadConfig(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveConfig(config: Record<string, string>) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

function getConfiguredDbPath(): string {
  const config = loadConfig()
  return config.customDbPath || getDefaultDbPath()
}

function exec(sql: string, params?: any[]): any[] {
  if (params && params.length > 0) {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows: any[] = []
    while (stmt.step()) {
      const cols = stmt.getColumnNames()
      const vals = stmt.get()
      const obj: any = {}
      cols.forEach((col: string, i: number) => { obj[col] = vals[i] })
      rows.push(obj)
    }
    stmt.free()
    return rows
  }
  const results = db.exec(sql)
  const rows: any[] = []
  for (const r of results) {
    for (const row of r.values) {
      const obj: any = {}
      r.columns.forEach((col: string, i: number) => {
        obj[col] = row[i]
      })
      rows.push(obj)
    }
  }
  return rows
}

function getSingle(sql: string, params?: any[]): any {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  let result: any = null
  if (stmt.step()) {
    const cols = stmt.getColumnNames()
    const vals = stmt.get()
    result = {}
    cols.forEach((col: string, i: number) => {
      result[col] = vals[i]
    })
  }
  stmt.free()
  return result
}

function run(sql: string, params?: any[]): { changes: number; lastInsertRowid: number } {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  stmt.step()
  const result = {
    changes: db.getRowsModified(),
    lastInsertRowid: getSingle('SELECT last_insert_rowid() as id')?.id ?? 0,
  }
  stmt.free()
  return result
}

function saveToDisk() {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(currentDbPath, buffer)
}

export function getDatabase() {
  return { exec, getSingle, run, save: saveToDisk, db }
}

export function getDbPath() {
  return currentDbPath
}

export function setDbPath(newPath: string) {
  saveToDisk()
  const config = loadConfig()
  config.customDbPath = newPath
  saveConfig(config)
  currentDbPath = newPath
}

export async function initDatabase() {
  const SQL = await initSqlJs()
  currentDbPath = getConfiguredDbPath()

  if (fs.existsSync(currentDbPath)) {
    const buffer = fs.readFileSync(currentDbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  runMigrations()
  saveToDisk()
}

function runMigrations() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      email TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS statuses (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      complete INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS priorities (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      dueDate     TEXT,
      statusId    INTEGER NOT NULL REFERENCES statuses(id),
      priorityId  INTEGER NOT NULL REFERENCES priorities(id),
      projectId   INTEGER NOT NULL REFERENCES projects(id)
    );
  `)

  const statusCount = exec('SELECT COUNT(*) as count FROM statuses')
  if (statusCount.length === 0 || statusCount[0].count === 0) {
    db.run(`INSERT INTO statuses (name, complete) VALUES ('To Do', 0), ('In Progress', 0), ('Review', 0), ('Done', 1);`)
    db.run(`INSERT INTO priorities (name) VALUES ('Low'), ('Medium'), ('High'), ('Critical');`)
  }

  // Migration: add dueDate column if missing
  const taskCols = exec('PRAGMA table_info(tasks)')
  if (!taskCols.some((c: any) => c.name === 'dueDate')) {
    db.run('ALTER TABLE tasks ADD COLUMN dueDate TEXT')
  }

  // Migration: add color column to priorities if missing
  const priorityCols = exec('PRAGMA table_info(priorities)')
  if (!priorityCols.some((c: any) => c.name === 'color')) {
    db.run("ALTER TABLE priorities ADD COLUMN color TEXT DEFAULT '#a6adc8'")
    db.run("UPDATE priorities SET color = '#a6e3a1' WHERE name = 'Low'")
    db.run("UPDATE priorities SET color = '#f9e2af' WHERE name = 'Medium'")
    db.run("UPDATE priorities SET color = '#fab387' WHERE name = 'High'")
    db.run("UPDATE priorities SET color = '#f38ba8' WHERE name = 'Critical'")
  }

  // Migration: add notes and dependency columns to tasks if missing
  let cols = exec('PRAGMA table_info(tasks)')
  if (!cols.some((c: any) => c.name === 'notes')) {
    db.run("ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT ''")
    cols = exec('PRAGMA table_info(tasks)')
  }
  if (!cols.some((c: any) => c.name === 'predecessorIds')) {
    db.run("ALTER TABLE tasks ADD COLUMN predecessorIds TEXT DEFAULT '[]'")
    cols = exec('PRAGMA table_info(tasks)')
  }
  if (!cols.some((c: any) => c.name === 'successorIds')) {
    db.run("ALTER TABLE tasks ADD COLUMN successorIds TEXT DEFAULT '[]'")
  }

  // Migration: add archived column to tasks if missing
  cols = exec('PRAGMA table_info(tasks)')
  if (!cols.some((c: any) => c.name === 'archived')) {
    db.run('ALTER TABLE tasks ADD COLUMN archived INTEGER DEFAULT 0')
  }

  // Migration: add assignedTo column to tasks if missing
  cols = exec('PRAGMA table_info(tasks)')
  if (!cols.some((c: any) => c.name === 'assignedTo')) {
    db.run('ALTER TABLE tasks ADD COLUMN assignedTo INTEGER REFERENCES users(id)')
  }

  // Migration: add completionPercent column to tasks if missing
  cols = exec('PRAGMA table_info(tasks)')
  if (!cols.some((c: any) => c.name === 'completionPercent')) {
    db.run('ALTER TABLE tasks ADD COLUMN completionPercent INTEGER DEFAULT 0')
  }

  // Migration: add recurrence columns to tasks if missing
  cols = exec('PRAGMA table_info(tasks)')
  if (!cols.some((c: any) => c.name === 'recurrence_type')) {
    db.run("ALTER TABLE tasks ADD COLUMN recurrence_type TEXT DEFAULT 'none'")
    cols = exec('PRAGMA table_info(tasks)')
  }
  if (!cols.some((c: any) => c.name === 'recurrence_interval')) {
    db.run('ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER DEFAULT 1')
    cols = exec('PRAGMA table_info(tasks)')
  }
  if (!cols.some((c: any) => c.name === 'recurrence_days_of_week')) {
    db.run('ALTER TABLE tasks ADD COLUMN recurrence_days_of_week TEXT')
    cols = exec('PRAGMA table_info(tasks)')
  }
  if (!cols.some((c: any) => c.name === 'recurrence_end_date')) {
    db.run('ALTER TABLE tasks ADD COLUMN recurrence_end_date TEXT')
    cols = exec('PRAGMA table_info(tasks)')
  }
  if (!cols.some((c: any) => c.name === 'recurrence_count')) {
    db.run('ALTER TABLE tasks ADD COLUMN recurrence_count INTEGER')
    cols = exec('PRAGMA table_info(tasks)')
  }
  if (!cols.some((c: any) => c.name === 'recurrence_parent_id')) {
    db.run('ALTER TABLE tasks ADD COLUMN recurrence_parent_id INTEGER REFERENCES tasks(id)')
  }

  // Migration: add startDate and durationDays columns for Gantt chart
  cols = exec('PRAGMA table_info(tasks)')
  if (!cols.some((c: any) => c.name === 'startDate')) {
    db.run('ALTER TABLE tasks ADD COLUMN startDate TEXT')
  }
  cols = exec('PRAGMA table_info(tasks)')
  if (!cols.some((c: any) => c.name === 'durationDays')) {
    db.run('ALTER TABLE tasks ADD COLUMN durationDays INTEGER DEFAULT 1')
  }

  // Migration: add ord column to statuses if missing
  const statusCols = exec('PRAGMA table_info(statuses)')
  if (!statusCols.some((c: any) => c.name === 'ord')) {
    db.run('ALTER TABLE statuses ADD COLUMN ord INTEGER DEFAULT 0')
    const existing = exec('SELECT id FROM statuses ORDER BY id')
    existing.forEach((s: any, i: number) => {
      db.run('UPDATE statuses SET ord = ? WHERE id = ?', [i * 10, s.id])
    })
  }

  // Migration: add complete column to statuses if missing
  const statusCols2 = exec('PRAGMA table_info(statuses)')
  if (!statusCols2.some((c: any) => c.name === 'complete')) {
    db.run('ALTER TABLE statuses ADD COLUMN complete INTEGER DEFAULT 0')
    const done = exec("SELECT id FROM statuses WHERE LOWER(name) = 'done'")
    if (done.length > 0) {
      db.run('UPDATE statuses SET complete = 1 WHERE id = ?', [done[0].id])
    }
  }

  runNoteMigrations()
  runLinkMigrations()
  runFlashcardMigrations()
  runAiChatMigrations()
  runSpreadsheetMigrations()
  runDrawMigrations()
  runIdeaMigrations()

  // Seed sample Gantt tasks if DB is empty
  const taskCount = exec('SELECT COUNT(*) as count FROM tasks')
  if (taskCount[0].count === 0) {
    const projCount = exec('SELECT COUNT(*) as count FROM projects')
    if (projCount[0].count === 0) {
      db.run("INSERT INTO projects (name, description) VALUES ('Sample Project', 'Demo project for Gantt chart')")
    }
    const proj = exec('SELECT id FROM projects LIMIT 1')[0]
    const pid = proj.id
    const today = new Date()
    const d = (offset: number) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt.toISOString().slice(0, 10) }

    db.run(`INSERT INTO tasks (name, description, notes, dueDate, startDate, durationDays, statusId, priorityId, projectId, predecessorIds, successorIds, archived, assignedTo, completionPercent, created_at, completed_at, recurrence_type, recurrence_interval, recurrence_days_of_week, recurrence_end_date, recurrence_count, recurrence_parent_id) VALUES
      ('Research requirements', 'Gather and document project requirements', '', '${d(0)}', '${d(0)}', 1, 4, 2, ${pid}, '[]', '[2,3]', 0, null, 100, datetime('now'), datetime('now'), 'none', 1, null, null, null, null),
      ('Design mockups', 'Create UI/UX mockups for all screens', '', '${d(1)}', '${d(1)}', 1, 2, 3, ${pid}, '[1]', '[4]', 0, null, 60, datetime('now'), null, 'none', 1, null, null, null, null),
      ('Set up database', 'Design and implement database schema', '', '${d(2)}', '${d(2)}', 1, 2, 3, ${pid}, '[1]', '[4]', 0, null, 40, datetime('now'), null, 'none', 1, null, null, null, null),
      ('Implement backend API', 'Build REST API endpoints', '', '${d(3)}', '${d(3)}', 1, 2, 4, ${pid}, '[2,3]', '[5]', 0, null, 20, datetime('now'), null, 'none', 1, null, null, null, null),
      ('Build frontend', 'Implement React UI components', '', '${d(4)}', '${d(4)}', 1, 1, 3, ${pid}, '[4]', '[6]', 0, null, 0, datetime('now'), null, 'none', 1, null, null, null, null),
      ('Testing & QA', 'Write tests and perform QA', '', '${d(5)}', '${d(5)}', 1, 1, 2, ${pid}, '[5]', '[]', 0, null, 0, datetime('now'), null, 'none', 1, null, null, null, null),
      ('Documentation', 'Write user and API documentation', '', '${d(6)}', '${d(6)}', 1, 1, 1, ${pid}, '[4]', '[]', 0, null, 0, datetime('now'), null, 'none', 1, null, null, null, null),
      ('Deploy to staging', 'Deploy the app to staging environment', '', '${d(7)}', '${d(7)}', 1, 1, 4, ${pid}, '[6,7]', '[]', 0, null, 0, datetime('now'), null, 'none', 1, null, null, null, null)`)
  } else {
    // Assign dates to existing tasks that lack both startDate and dueDate
    const undated = exec('SELECT id FROM tasks WHERE startDate IS NULL AND dueDate IS NULL')
    if (undated.length > 0) {
      const today = new Date()
      const d = (offset: number) => { const dt = new Date(today); dt.setDate(dt.getDate() + offset); return dt.toISOString().slice(0, 10) }
      undated.forEach((t: any, i: number) => {
        const start = d(i)
        const due = d(i)
        db.run('UPDATE tasks SET startDate = ?, durationDays = 1, dueDate = ? WHERE id = ?', [start, due, t.id])
      })
    }
  }
}

function runNoteMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      notebook_id TEXT,
      title TEXT DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      is_trashed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT,
      tag_id TEXT,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)

  // Migration: add is_pinned column if missing
  const noteCols = exec('PRAGMA table_info(notes)')
  if (!noteCols.some((c: any) => c.name === 'is_pinned')) {
    db.run('ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0')
  }

  // Migration: add color column to notebooks if missing
  const nbCols = exec('PRAGMA table_info(notebooks)')
  if (!nbCols.some((c: any) => c.name === 'color')) {
    db.run("ALTER TABLE notebooks ADD COLUMN color TEXT DEFAULT ''")
  }

  runMindMapMigrations()
  runHabitMigrations()
}

function runHabitMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'daily',
      reminder_time TEXT,
      color TEXT DEFAULT '#89b4fa',
      emoji TEXT DEFAULT '✅',
      created_at TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(habit_id, date)
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      completed_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 25
    );
  `)

  const taskCols = exec('PRAGMA table_info(tasks)')
  if (!taskCols.some((c: any) => c.name === 'created_at')) {
    db.run('ALTER TABLE tasks ADD COLUMN created_at TEXT')
  }
  if (!taskCols.some((c: any) => c.name === 'completed_at')) {
    db.run('ALTER TABLE tasks ADD COLUMN completed_at TEXT')
  }

  runTimeMigrations()
}

function runTimeMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id          INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time       TEXT NOT NULL,
      end_time         TEXT,
      duration_seconds INTEGER,
      note             TEXT DEFAULT '',
      created_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_time_entries_task  ON time_entries(task_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start_time);
  `)

  runJournalMigrations()
}

function runJournalMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL UNIQUE,
      mood          INTEGER,
      went_well     TEXT DEFAULT '',
      to_improve    TEXT DEFAULT '',
      wins          TEXT DEFAULT '',
      losses        TEXT DEFAULT '',
      quick_notes   TEXT DEFAULT '',
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
  `)

  const journalCols = exec('PRAGMA table_info(journal_entries)')
  if (!journalCols.some((c: any) => c.name === 'wins')) {
    db.run("ALTER TABLE journal_entries ADD COLUMN wins TEXT DEFAULT ''")
  }
  if (!journalCols.some((c: any) => c.name === 'losses')) {
    db.run("ALTER TABLE journal_entries ADD COLUMN losses TEXT DEFAULT ''")
  }
}

function runMindMapMigrations() {
  const tables = exec("SELECT name FROM sqlite_master WHERE type='table'")
  const tableNames = tables.map((t: any) => t.name)
  if (tableNames.includes('mindmaps')) {
    // Migrate: add image column if missing
    try { db.exec('ALTER TABLE mindmap_nodes ADD COLUMN image TEXT DEFAULT ""') } catch {}
    // Migrate: add shape column if missing
    const nodeCols = exec('PRAGMA table_info(mindmap_nodes)')
    if (!nodeCols.some((c: any) => c.name === 'shape')) {
      try { db.exec("ALTER TABLE mindmap_nodes ADD COLUMN shape TEXT DEFAULT 'rounded'") } catch {}
    }
    // Migrate: add edge_type column if missing
    const edgeCols = exec('PRAGMA table_info(mindmap_edges)')
    if (!edgeCols.some((c: any) => c.name === 'edge_type')) {
      try { db.exec("ALTER TABLE mindmap_edges ADD COLUMN edge_type TEXT DEFAULT 'default'") } catch {}
    }
    return
  }

  db.exec(`
    CREATE TABLE mindmaps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Untitled Map',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE mindmap_nodes (
      id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Node',
      color TEXT DEFAULT '#89b4fa',
      emoji TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      width REAL NOT NULL DEFAULT 200,
      height REAL NOT NULL DEFAULT 80,
      image TEXT DEFAULT '',
      shape TEXT DEFAULT 'rounded'
    );
    CREATE TABLE mindmap_edges (
      id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
      from_node TEXT NOT NULL,
      to_node TEXT NOT NULL,
      label TEXT DEFAULT '',
      dashed INTEGER DEFAULT 0,
      edge_type TEXT DEFAULT 'default'
    );
  `)
}

function runLinkMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS link_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_hardcoded INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      text TEXT DEFAULT '',
      category_id INTEGER REFERENCES link_categories(id),
      display_on_dashboard INTEGER NOT NULL DEFAULT 0,
      linked_type TEXT,
      linked_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS link_tags (
      link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (link_id, tag_id)
    );
  `)

  const catCount = exec('SELECT COUNT(*) as count FROM link_categories')
  if (catCount[0].count === 0) {
    db.run(`INSERT OR IGNORE INTO link_categories (name, is_hardcoded) VALUES ('General',1), ('Tasks',1), ('Notes',1), ('Mindmaps',1), ('Journals',1)`)
  }
}

function runAiChatMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT 'New Chat',
      provider TEXT NOT NULL DEFAULT 'ollama',
      model TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);

    CREATE TABLE IF NOT EXISTS ai_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Migration: add api_key column if missing
  const convCols = exec('PRAGMA table_info(chat_conversations)')
  if (!convCols.some((c: any) => c.name === 'api_key')) {
    db.run("ALTER TABLE chat_conversations ADD COLUMN api_key TEXT DEFAULT ''")
  }
  if (!convCols.some((c: any) => c.name === 'system_prompt')) {
    db.run("ALTER TABLE chat_conversations ADD COLUMN system_prompt TEXT DEFAULT ''")
  }
  if (!convCols.some((c: any) => c.name === 'temperature')) {
    db.run("ALTER TABLE chat_conversations ADD COLUMN temperature REAL DEFAULT 0.7")
  }
  if (!convCols.some((c: any) => c.name === 'max_tokens')) {
    db.run("ALTER TABLE chat_conversations ADD COLUMN max_tokens INTEGER DEFAULT 4096")
  }

  // Migration: add pinned column to chat_messages
  const msgCols = exec('PRAGMA table_info(chat_messages)')
  if (!msgCols.some((c: any) => c.name === 'pinned')) {
    db.run("ALTER TABLE chat_messages ADD COLUMN pinned INTEGER DEFAULT 0")
  }

  // Seed default config
  const existing = exec("SELECT value FROM ai_config WHERE key = 'provider'")
  if (existing.length === 0) {
    db.run("INSERT INTO ai_config (key, value) VALUES ('provider', 'ollama')")
    db.run("INSERT INTO ai_config (key, value) VALUES ('model', 'llama3.2')")
    db.run("INSERT INTO ai_config (key, value) VALUES ('api_key', '')")
  }
}

function runFlashcardMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_review ON flashcards(next_review_date);
  `)
}

function runSpreadsheetMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS spreadsheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Untitled Spreadsheet',
      data TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}

function runDrawMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS draw_diagrams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Untitled',
      data TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}

function runIdeaMigrations() {
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS idea_tags (
      idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (idea_id, tag_id)
    );
  `)
}
