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
      name TEXT NOT NULL
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
    db.run(`INSERT INTO statuses (name) VALUES ('To Do'), ('In Progress'), ('Review'), ('Done');`)
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

  // Migration: add ord column to statuses if missing
  const statusCols = exec('PRAGMA table_info(statuses)')
  if (!statusCols.some((c: any) => c.name === 'ord')) {
    db.run('ALTER TABLE statuses ADD COLUMN ord INTEGER DEFAULT 0')
    const existing = exec('SELECT id FROM statuses ORDER BY id')
    existing.forEach((s: any, i: number) => {
      db.run('UPDATE statuses SET ord = ? WHERE id = ?', [i * 10, s.id])
    })
  }

  runNoteMigrations()
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
}

function runMindMapMigrations() {
  const tables = exec("SELECT name FROM sqlite_master WHERE type='table'")
  const tableNames = tables.map((t: any) => t.name)
  if (tableNames.includes('mindmaps')) {
    // Migrate: add image column if missing
    try { db.exec('ALTER TABLE mindmap_nodes ADD COLUMN image TEXT DEFAULT ""') } catch {}
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
      image TEXT DEFAULT ''
    );
    CREATE TABLE mindmap_edges (
      id TEXT PRIMARY KEY,
      map_id TEXT NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
      from_node TEXT NOT NULL,
      to_node TEXT NOT NULL,
      label TEXT DEFAULT '',
      dashed INTEGER DEFAULT 0
    );
  `)
}
