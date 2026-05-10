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

function exec(sql: string): any[] {
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

  // Migration: add ord column to statuses if missing
  const statusCols = exec('PRAGMA table_info(statuses)')
  if (!statusCols.some((c: any) => c.name === 'ord')) {
    db.run('ALTER TABLE statuses ADD COLUMN ord INTEGER DEFAULT 0')
    const existing = exec('SELECT id FROM statuses ORDER BY id')
    existing.forEach((s: any, i: number) => {
      db.run('UPDATE statuses SET ord = ? WHERE id = ?', [i * 10, s.id])
    })
  }
}
