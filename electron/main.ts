import path from 'path'
import fs from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { app, BrowserWindow, ipcMain, Notification, dialog, shell, Menu, protocol, net } from 'electron'
import type OpenAI from 'openai'
import { initDatabase, getDbPath, setDbPath, getDatabase } from './database/db'
import * as userRepo from './database/repositories/userRepo'
import * as projectRepo from './database/repositories/projectRepo'
import * as statusRepo from './database/repositories/statusRepo'
import * as priorityRepo from './database/repositories/priorityRepo'
import * as taskRepo from './database/repositories/taskRepo'
import * as noteRepo from './database/repositories/noteRepo'
import * as mindmapRepo from './database/repositories/mindmapRepo'
import * as habitRepo from './database/repositories/habitRepo'
import * as timeRepo from './database/repositories/timeRepo'
import * as journalRepo from './database/repositories/journalRepo'
import * as linkRepo from './database/repositories/linkRepo'
import * as flashcardRepo from './database/repositories/flashcardRepo'
import * as chatRepo from './database/repositories/chatRepo'
import * as spreadsheetRepo from './database/repositories/spreadsheetRepo'
import * as drawRepo from './database/repositories/drawRepo'
import * as ideaRepo from './database/repositories/ideaRepo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

protocol.registerSchemesAsPrivileged([
  { scheme: 'drawio', privileges: { standard: true, secure: true, bypassCSP: true, stream: true, supportFetchAPI: true } }
])

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let pomodoroWindow: BrowserWindow | null = null
let focusWindow: BrowserWindow | null = null
const SPLASH_MIN_DURATION_MS = 3000
let splashShownAt = 0
const CONFIG_PATH = path.join(app.getPath('userData'), 'vibetasks-config.json')
const DEFAULT_THEME = 'dark'
const DEFAULT_ZOOM_FACTOR = 1
const MIN_ZOOM_FACTOR = 0.5
const MAX_ZOOM_FACTOR = 3
const ZOOM_STEP = 0.1

let habitsInterval: ReturnType<typeof setInterval> | null = null

function ensureHabitReminders() {
  if (habitsInterval) return
  habitsInterval = setInterval(() => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const habits = habitRepo.getHabits()
    for (const habit of habits) {
      if (habit.reminder_time === timeStr && !habit.loggedToday) {
        new Notification({
          title: 'Habit Reminder',
          body: `Don't forget to: ${habit.name}`,
        }).show()
      }
    }
  }, 60000)
}

type AppConfig = {
  theme?: string
  zoomFactor?: number
}

function preloadPath(file: string) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'electron', file)
    : path.join(app.getAppPath(), 'electron', file)
}
function loadConfig(): AppConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as AppConfig
  } catch {
    return {}
  }
}

function saveConfig(config: AppConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

function clampZoomFactor(value: number): number {
  const rounded = Math.round(value * 10) / 10
  return Math.max(MIN_ZOOM_FACTOR, Math.min(MAX_ZOOM_FACTOR, rounded))
}

function getThemeFromConfig(): string {
  const config = loadConfig()
  return typeof config.theme === 'string' ? config.theme : DEFAULT_THEME
}

function getZoomFactorFromConfig(): number {
  const config = loadConfig()
  if (typeof config.zoomFactor !== 'number' || !Number.isFinite(config.zoomFactor)) {
    return DEFAULT_ZOOM_FACTOR
  }
  return clampZoomFactor(config.zoomFactor)
}

function setMainWindowZoom(zoomFactor: number) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const nextZoomFactor = clampZoomFactor(zoomFactor)
  mainWindow.webContents.setZoomFactor(nextZoomFactor)
  const config = loadConfig()
  config.zoomFactor = nextZoomFactor
  saveConfig(config)
}

function splashHtmlPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'electron', 'splash.html')
    : path.join(app.getAppPath(), 'electron', 'splash.html')
}

function closeSplashWindow() {
  const win = splashWindow
  splashWindow = null
  if (win && !win.isDestroyed()) {
    win.hide()
    win.destroy()
  }
}

function createSplashWindow() {
  const theme = getThemeFromConfig()
  console.log('[splash] creating with theme:', theme)
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  splashWindow.once('ready-to-show', () => {
    console.log('[splash] ready-to-show')
    splashWindow?.show()
  })
  splashWindow.loadFile(splashHtmlPath(), {
    query: { theme, version: app.getVersion() },
  })
}

function revealMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isVisible()) return
  console.log('[main] revealing window')
  mainWindow.show()
  closeSplashWindow()
  mainWindow.focus()
}

function logRendererEvent(message: string, details?: unknown) {
  const suffix = details === undefined ? '' : ` ${JSON.stringify(details)}`
  console.error(`[renderer] ${message}${suffix}`)
}

function createWindow() {
  const theme = getThemeFromConfig()
  console.log('[main] createWindow called with theme:', theme)
  const overlay = theme === 'light'
    ? { color: '#f5f5f9', symbolColor: '#1e1e2e', height: 40 }
    : { color: '#1e1e2e', symbolColor: '#cdd6f4', height: 40 }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: preloadPath('preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: overlay,
  })

  mainWindow.maximize()
  mainWindow.webContents.setZoomFactor(getZoomFactorFromConfig())

  mainWindow.once('ready-to-show', () => {
    console.log('[main] ready-to-show')
    revealMainWindow()
  })
  mainWindow.once('show', () => {
    console.log('[main] window shown')
    closeSplashWindow()
  })
  mainWindow.once('focus', () => {
    console.log('[main] window focused')
    closeSplashWindow()
  })
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[main] did-finish-load')
    revealMainWindow()
  })
  setTimeout(() => {
    console.log('[main] 5s timeout fallback reveal')
    revealMainWindow()
  }, 5000)

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob:; " +
          "frame-src 'self' drawio:; " +
          "script-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' http://localhost:* ws://localhost:*; " +
          "font-src 'self' data:;"
        ]
      }
    })
  })

  // Enable spell checker
  if (mainWindow) {
    mainWindow.webContents.session.spellCheckerEnabled = true
  }

  // Set languages once dictionary is ready
  const setLanguages = () => {
    try {
      if (!mainWindow) return
      const available = mainWindow.webContents.session.availableSpellCheckerLanguages
      const systemLang = app.getLocale()
      const langs = [systemLang, systemLang.split('-')[0], 'en-US'].filter(l => l && available.includes(l))
      if (langs.length > 0) {
        mainWindow.webContents.session.setSpellCheckerLanguages(langs)
      }
    } catch {}
  }

  mainWindow.webContents.session.on('spellcheck-dictionary-initialized', () => setLanguages())

  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('[main] loading dev URL:', process.env.VITE_DEV_SERVER_URL)
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    const file = path.join(__dirname, '../dist/index.html')
    console.log('[main] loading file:', file)
    mainWindow.loadFile(file)
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[main] did-fail-load:', { errorCode, errorDescription, validatedURL })
    logRendererEvent('load failed', { errorCode, errorDescription, validatedURL })
    revealMainWindow()
  })
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render-process-gone:', details)
    logRendererEvent('process gone', details)
    revealMainWindow()
  })
  mainWindow.webContents.on('console-message', (details) => {
    const { level, message, lineNumber, sourceId } = details
    if (level === 'info' || level === 'debug') return
    logRendererEvent(message, { level, line: lineNumber, sourceId })
  })
  mainWindow.webContents.on('did-finish-load', () => {
    setLanguages()
    if (mainWindow?.isVisible()) closeSplashWindow()
  })
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
      return
    }

    if (input.type !== 'keyDown' || !(input.control || input.meta)) return

    const currentZoomFactor = mainWindow?.webContents.getZoomFactor() ?? DEFAULT_ZOOM_FACTOR

    if (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd') {
      event.preventDefault()
      setMainWindowZoom(currentZoomFactor + ZOOM_STEP)
      return
    }

    if (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract') {
      event.preventDefault()
      setMainWindowZoom(currentZoomFactor - ZOOM_STEP)
      return
    }

    if (input.key === '0' || input.code === 'Numpad0') {
      event.preventDefault()
      setMainWindowZoom(DEFAULT_ZOOM_FACTOR)
    }
  })

  // Spell check context menu (Chrome-like right-click suggestions)
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menuItems: Electron.MenuItemConstructorOptions[] = []

    // Spelling suggestions
    if (params.misspelledWord) {
      const suggestions = params.dictionarySuggestions || []
      suggestions.forEach(suggestion => {
        menuItems.push({
          label: suggestion,
          click: () => mainWindow?.webContents.insertText(suggestion),
        })
      })
      if (suggestions.length > 0) {
        menuItems.push({ type: 'separator' })
      }
      menuItems.push({
        label: `Add "${params.misspelledWord}" to dictionary`,
        click: () => mainWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      })
      menuItems.push({ type: 'separator' })
    }

    // Standard edit actions
    if (params.selectionText) {
      menuItems.push(
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      )
    }
    menuItems.push(
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
    )

    const menu = Menu.buildFromTemplate(menuItems)
    menu.popup({ window: mainWindow ?? undefined })
  })
}

function createPomodoroWindow() {
  if (pomodoroWindow) {
    pomodoroWindow.focus()
    return
  }

  pomodoroWindow = new BrowserWindow({
    width: 220,
    height: 300,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath('pomodoroPreload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const pomodoroPath = app.isPackaged
    ? path.join(process.resourcesPath, 'electron', 'pomodoro.html')
    : path.join(app.getAppPath(), 'electron', 'pomodoro.html')
  pomodoroWindow.loadFile(pomodoroPath)

  pomodoroWindow.on('closed', () => {
    pomodoroWindow = null
  })
}

function createFocusWindow() {
  if (focusWindow) {
    focusWindow.focus()
    return
  }

  focusWindow = new BrowserWindow({
    width: 240,
    height: 380,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath('focusPreload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const focusPath = app.isPackaged
    ? path.join(process.resourcesPath, 'electron', 'focus.html')
    : path.join(app.getAppPath(), 'electron', 'focus.html')
  focusWindow.loadFile(focusPath)

  focusWindow.on('closed', () => {
    focusWindow = null
  })
}

function registerIpcHandlers() {
  ipcMain.handle('db:users:list', () => userRepo.getUsers())
  ipcMain.handle('db:users:create', (_e, data) => userRepo.createUser(data))
  ipcMain.handle('db:users:update', (_e, id, data) => userRepo.updateUser(id, data))
  ipcMain.handle('db:users:delete', (_e, id) => userRepo.deleteUser(id))

  ipcMain.handle('db:projects:list', () => projectRepo.getProjects())
  ipcMain.handle('db:projects:create', (_e, data) => projectRepo.createProject(data))
  ipcMain.handle('db:projects:update', (_e, id, data) => projectRepo.updateProject(id, data))
  ipcMain.handle('db:projects:delete', (_e, id) => projectRepo.deleteProject(id))

  ipcMain.handle('db:statuses:list', () => statusRepo.getStatuses())
  ipcMain.handle('db:statuses:create', (_e, data) => statusRepo.createStatus(data))
  ipcMain.handle('db:statuses:update', (_e, id, data) => statusRepo.updateStatus(id, data))
  ipcMain.handle('db:statuses:delete', (_e, id) => statusRepo.deleteStatus(id))
  ipcMain.handle('db:statuses:reorder', (_e, items) => statusRepo.reorderStatuses(items))

  ipcMain.handle('db:priorities:list', () => priorityRepo.getPriorities())
  ipcMain.handle('db:priorities:create', (_e, data) => priorityRepo.createPriority(data))
  ipcMain.handle('db:priorities:update', (_e, id, data) => priorityRepo.updatePriority(id, data))
  ipcMain.handle('db:priorities:delete', (_e, id) => priorityRepo.deletePriority(id))

  ipcMain.handle('db:tasks:list', (_e, includeArchived, includeGenerated) => taskRepo.getTasks(includeArchived, includeGenerated))
  ipcMain.handle('db:tasks:archived', () => taskRepo.getArchivedTasks())
  ipcMain.handle('db:tasks:create', (_e, data) => taskRepo.createTask(data))
  ipcMain.handle('db:tasks:update', (_e, id, data) => taskRepo.updateTask(id, data))
  ipcMain.handle('db:tasks:delete', (_e, id) => taskRepo.deleteTask(id))
  ipcMain.handle('db:tasks:archive', (_e, id) => taskRepo.archiveTask(id))
  ipcMain.handle('db:tasks:unarchive', (_e, id) => taskRepo.unarchiveTask(id))
  ipcMain.handle('db:tasks:recurring', () => taskRepo.getRecurringTasks())
  ipcMain.handle('db:tasks:generate-next', (_e, id) => taskRepo.generateNextOccurrence(id))
  ipcMain.handle('db:tasks:generate-all', (_e, id) => taskRepo.generateAllOccurrences(id))

  // ── Flashcards ──
  ipcMain.handle('flashcard:decks:list', () => flashcardRepo.getDecks())
  ipcMain.handle('flashcard:decks:create', (_e, name, description) => flashcardRepo.createDeck(name, description))
  ipcMain.handle('flashcard:decks:update', (_e, id, data) => flashcardRepo.updateDeck(id, data))
  ipcMain.handle('flashcard:decks:delete', (_e, id) => flashcardRepo.deleteDeck(id))
  ipcMain.handle('flashcard:list', (_e, deckId) => flashcardRepo.getFlashcards(deckId))
  ipcMain.handle('flashcard:create', (_e, deckId, front, back) => flashcardRepo.createFlashcard(deckId, front, back))
  ipcMain.handle('flashcard:update', (_e, id, data) => flashcardRepo.updateFlashcard(id, data))
  ipcMain.handle('flashcard:delete', (_e, id) => flashcardRepo.deleteFlashcard(id))
  ipcMain.handle('flashcard:review', (_e, id, quality) => flashcardRepo.reviewFlashcard(id, quality))
  ipcMain.handle('flashcard:due', (_e, deckId) => flashcardRepo.getDueFlashcards(deckId))

  // ── Spreadsheets ──
  ipcMain.handle('spreadsheet:list', () => spreadsheetRepo.getSpreadsheets())
  ipcMain.handle('spreadsheet:get', (_e, id) => spreadsheetRepo.getSpreadsheet(id))
  ipcMain.handle('spreadsheet:create', (_e, name) => spreadsheetRepo.createSpreadsheet(name))
  ipcMain.handle('spreadsheet:update', (_e, id, data) => spreadsheetRepo.updateSpreadsheet(id, data))
  ipcMain.handle('spreadsheet:delete', (_e, id) => spreadsheetRepo.deleteSpreadsheet(id))

  // ── Draw (BETA) ──
  ipcMain.handle('draw:list', () => drawRepo.getDiagrams())
  ipcMain.handle('draw:get', (_e, id) => drawRepo.getDiagram(id))
  ipcMain.handle('draw:create', (_e, name) => drawRepo.createDiagram(name))
  ipcMain.handle('draw:rename', (_e, id, name) => drawRepo.renameDiagram(id, name))
  ipcMain.handle('draw:delete', (_e, id) => drawRepo.deleteDiagram(id))
  ipcMain.handle('draw:save', (_e, id, data) => drawRepo.saveDiagram(id, data))

  const drawioPath = app.isPackaged
    ? path.join(process.resourcesPath, 'drawio')
    : path.join(app.getAppPath(), 'public', 'drawio')
  protocol.handle('drawio', async (request) => {
    const url = new URL(request.url)
    let filePath = url.pathname.replace(/^\//, '')
    if (!filePath) filePath = 'index.html'
    const fullPath = path.resolve(drawioPath, filePath)
    // Prevent path traversal outside drawio directory
    if (!fullPath.startsWith(drawioPath)) {
      return new Response(null, { status: 403 })
    }
    return net.fetch(pathToFileURL(fullPath).href)
  })

  // ── Utilities ──
  ipcMain.handle('util:showSaveDialog', async (_e, options: Electron.SaveDialogOptions) => {
    const r = await dialog.showSaveDialog(mainWindow!, options)
    if (r.canceled || !r.filePath) return null
    return r.filePath
  })
  ipcMain.handle('util:writeBinaryFile', async (_e, filePath: string, data: number[]) => {
    fs.writeFileSync(filePath, Buffer.from(data))
  })

  // ── Data Portability ──

  const CSV_TABLES = ['users', 'projects', 'statuses', 'priorities', 'link_categories', 'tags']

  function escapeCsv(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
      return '"' + val.replace(/"/g, '""') + '"'
    }
    return val
  }

  function parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current)
    return result
  }

  ipcMain.handle('db:export-json', async () => {
    const { exec } = getDatabase()
    const tables = [...CSV_TABLES, 'tasks', 'notebooks', 'notes', 'note_tags',
      'habits', 'habit_logs', 'pomodoro_sessions', 'time_entries', 'journal_entries',
      'mindmaps', 'mindmap_nodes', 'mindmap_edges', 'links']

    const data: Record<string, any[]> = {}
    for (const table of tables) {
      data[table] = exec(`SELECT * FROM ${table}`)
    }

    const json = JSON.stringify({ version: app.getVersion(), exportedAt: new Date().toISOString(), data }, null, 2)

    const r = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Data as JSON',
      defaultPath: `vibetasks-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (r.canceled || !r.filePath) return null
    fs.writeFileSync(r.filePath, json, 'utf-8')
    return r.filePath
  })

  ipcMain.handle('db:import-json', async () => {
    const r = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import Data from JSON',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (r.canceled || r.filePaths.length === 0) return 0

    const content = fs.readFileSync(r.filePaths[0], 'utf-8')
    const parsed = JSON.parse(content)
    if (!parsed.data) throw new Error('Invalid backup file')

    const { exec, run, save } = getDatabase()
    const wipeOrder = [...CSV_TABLES, 'tasks', 'notebooks', 'notes', 'note_tags',
      'habits', 'habit_logs', 'pomodoro_sessions', 'time_entries', 'journal_entries',
      'mindmaps', 'mindmap_nodes', 'mindmap_edges', 'links'].reverse()

    exec('BEGIN TRANSACTION')
    try {
      for (const table of wipeOrder) {
        if (parsed.data[table]) exec(`DELETE FROM ${table}`)
      }

      const insertOrder = ['users', 'projects', 'statuses', 'priorities', 'link_categories', 'tags',
        'tasks', 'notebooks', 'note_tags', 'notes',
        'habits', 'habit_logs', 'pomodoro_sessions', 'time_entries', 'journal_entries',
        'mindmaps', 'mindmap_nodes', 'mindmap_edges', 'links']

      let total = 0
      for (const table of insertOrder) {
        const rows = parsed.data[table]
        if (!rows || rows.length === 0) continue
        for (const row of rows) {
          const cols = Object.keys(row)
          const vals = cols.map(c => row[c])
          run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals)
          total++
        }
      }

      exec('COMMIT')
      save()
      return total
    } catch (err) {
      exec('ROLLBACK')
      throw err
    }
  })

  ipcMain.handle('db:export-csv', async () => {
    const { exec } = getDatabase()
    const tasks = exec(`SELECT t.*, s.name as status_name, p.name as priority_name,
      pr.name as project_name, u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN statuses s ON t.statusId = s.id
      LEFT JOIN priorities p ON t.priorityId = p.id
      LEFT JOIN projects pr ON t.projectId = pr.id
      LEFT JOIN users u ON t.assignedTo = u.id
      ORDER BY t.id`)

    const cols = tasks.length > 0 ? Object.keys(tasks[0]) : ['id', 'name', 'description', 'notes', 'dueDate', 'statusId', 'status_name', 'priorityId', 'priority_name', 'projectId', 'project_name', 'predecessorIds', 'successorIds', 'archived', 'assignedTo', 'assigned_to_name', 'completionPercent', 'created_at', 'completed_at', 'recurrence_type', 'recurrence_interval', 'recurrence_days_of_week', 'recurrence_end_date', 'recurrence_count', 'recurrence_parent_id']

    const csvRows: string[] = [cols.map(c => escapeCsv(c)).join(',')]
    for (const task of tasks) {
      csvRows.push(cols.map(c => escapeCsv(String(task[c] ?? ''))).join(','))
    }

    const csv = csvRows.join('\r\n')
    const r = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Tasks as CSV',
      defaultPath: `tasks-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (r.canceled || !r.filePath) return null
    fs.writeFileSync(r.filePath, '\uFEFF' + csv, 'utf-8')
    return r.filePath
  })

  ipcMain.handle('db:import-csv', async () => {
    const r = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import Tasks from CSV',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      properties: ['openFile'],
    })
    if (r.canceled || r.filePaths.length === 0) return 0

    const content = fs.readFileSync(r.filePaths[0], 'utf-8').replace(/^\uFEFF/, '')
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
    if (lines.length < 2) return 0

    const header = parseCsvLine(lines[0])
    const { exec, run, save } = getDatabase()
    let imported = 0

    exec('BEGIN TRANSACTION')
    try {
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCsvLine(lines[i])
        const row: Record<string, string> = {}
        header.forEach((col, idx) => { row[col] = vals[idx] ?? '' })

        run(`INSERT INTO tasks (name, description, notes, dueDate, statusId, priorityId, projectId,
          predecessorIds, successorIds, archived, assignedTo, completionPercent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
          row.name || 'Imported Task',
          row.description || '',
          row.notes || '',
          row.dueDate || null,
          parseInt(row.statusId) || 1,
          parseInt(row.priorityId) || 1,
          parseInt(row.projectId) || 1,
          '[]', '[]',
          parseInt(row.archived) || 0,
          row.assignedTo ? parseInt(row.assignedTo) : null,
          parseInt(row.completionPercent) || 0,
        ])
        imported++
      }
      exec('COMMIT')
      save()
      return imported
    } catch (err) {
      exec('ROLLBACK')
      throw err
    }
  })

  ipcMain.handle('db:export-task-share', async (_e, taskId: number) => {
    const { exec } = getDatabase()
    const tasks = exec(`SELECT * FROM tasks WHERE id = ?`, [taskId])
    if (tasks.length === 0) throw new Error('Task not found')

    const shareData = {
      sharedAt: new Date().toISOString(),
      appVersion: app.getVersion(),
      task: tasks[0],
    }

    const json = JSON.stringify(shareData, null, 2)
    const r = await dialog.showSaveDialog(mainWindow!, {
      title: 'Share Task',
      defaultPath: `share-task-${taskId}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (r.canceled || !r.filePath) return null
    fs.writeFileSync(r.filePath, json, 'utf-8')
    return r.filePath
  })

  ipcMain.handle('db:import-share-link', async () => {
    const r = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import Shared Task',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (r.canceled || r.filePaths.length === 0) return null

    const content = fs.readFileSync(r.filePaths[0], 'utf-8')
    const parsed = JSON.parse(content)
    if (!parsed.task) throw new Error('Invalid share file')

    const { exec, run, save } = getDatabase()
    const task = parsed.task
    delete task.id

    const cols = Object.keys(task)
    const vals = cols.map(c => task[c])
    run(`INSERT INTO tasks (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, vals)
    save()

    const inserted = exec('SELECT * FROM tasks WHERE id = last_insert_rowid()')
    return inserted.length > 0 ? inserted[0] : null
  })

  ipcMain.handle('pomodoro:toggle', () => {
    if (pomodoroWindow) {
      pomodoroWindow.close()
    } else {
      createPomodoroWindow()
    }
  })

  ipcMain.handle('pomodoro:notify', (_e, title, body) => {
    new Notification({ title, body }).show()
  })
  ipcMain.handle('pomodoro:close', () => {
    if (pomodoroWindow) pomodoroWindow.close()
  })
  ipcMain.handle('pomodoro:minimize', () => {
    if (pomodoroWindow) pomodoroWindow.minimize()
  })

  ipcMain.handle('db:getPath', () => {
    return getDbPath()
  })

  ipcMain.handle('db:pickPath', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Select or Create Database File',
      defaultPath: getDbPath(),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile', 'createFile', 'promptToCreate'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const newPath = result.filePaths[0]
    setDbPath(newPath)
    return newPath
  })

  ipcMain.handle('pomodoro:soundPath', () => {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'xylophone.mp3')
      : path.join(app.getAppPath(), 'xylophone.mp3')
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  // Notes
  ipcMain.handle('notes:notebooks:list', () => noteRepo.getNotebooks())
  ipcMain.handle('notes:notebooks:create', (_e, name) => noteRepo.createNotebook(name))
  ipcMain.handle('notes:notebooks:rename', (_e, id, name) => noteRepo.renameNotebook(id, name))
  ipcMain.handle('notes:notebooks:delete', (_e, id) => noteRepo.deleteNotebook(id))
  ipcMain.handle('notes:list', (_e, notebookId, sortBy) => {
    console.log('[notes:list] called with:', { notebookId })
    try {
      const result = noteRepo.getNotes(notebookId, sortBy)
      console.log('[notes:list] result count:', result?.length)
      return result
    } catch (err) {
      console.error('[notes:list] error:', err)
      throw err
    }
  })
  ipcMain.handle('notes:listAll', (_e, sortBy) => noteRepo.getAllNotes(sortBy))
  ipcMain.handle('notes:get', (_e, id) => noteRepo.getNoteById(id))
  ipcMain.handle('notes:create', (_e, notebookId, title) => {
    console.log('[notes:create] called with:', { notebookId, title })
    try {
      const result = noteRepo.createNote(notebookId, title)
      console.log('[notes:create] result:', result)
      return result
    } catch (err) {
      console.error('[notes:create] error:', err)
      throw err
    }
  })
  ipcMain.handle('notes:save', (_e, id, title, content) => noteRepo.saveNote(id, title, content))
  ipcMain.handle('notes:trash', (_e, id) => noteRepo.trashNote(id))
  ipcMain.handle('notes:restore', (_e, id) => noteRepo.restoreNote(id))
  ipcMain.handle('notes:delete', (_e, id) => noteRepo.deleteNotePermanently(id))
  ipcMain.handle('notes:trashed', () => noteRepo.getTrashedNotes())
  ipcMain.handle('notes:search', (_e, query) => noteRepo.searchNotes(query))
  ipcMain.handle('notes:togglePin', (_e, id) => noteRepo.togglePin(id))
  ipcMain.handle('notes:backlinks', (_e, title, excludeId) => noteRepo.getBacklinks(title, excludeId))
  ipcMain.handle('notes:tags:all', () => noteRepo.getAllTags())
  ipcMain.handle('notes:tags:getForNote', (_e, noteId) => noteRepo.getNoteTags(noteId))
  ipcMain.handle('notes:tags:add', (_e, noteId, tagId) => noteRepo.addTagToNote(noteId, tagId))
  ipcMain.handle('notes:tags:remove', (_e, noteId, tagId) => noteRepo.removeTagFromNote(noteId, tagId))
  ipcMain.handle('notes:tags:create', (_e, name) => noteRepo.createTag(name))
  ipcMain.handle('notes:tags:notesByTag', (_e, tagId) => noteRepo.getNotesByTag(tagId))
  ipcMain.handle('notes:tags:delete', (_e, id) => noteRepo.deleteTag(id))
  ipcMain.handle('notes:searchTitles', (_e, query) => noteRepo.searchNoteTitles(query))
  ipcMain.handle('notes:recent', (_e, limit) => noteRepo.getRecentNotes(limit || 10))
  ipcMain.handle('notes:getByTitle', (_e, title) => noteRepo.getNoteByTitle(title))
  ipcMain.handle('notes:duplicate', (_e, id) => noteRepo.duplicateNote(id))
  ipcMain.handle('notes:notebooks:setColor', (_e, id, color) => noteRepo.setNotebookColor(id, color))

  ipcMain.handle('notes:openHelp', () => {
    const helpPath = app.isPackaged
      ? path.join(__dirname, '../dist/notes-help.html')
      : path.join(__dirname, '../public/notes-help.html')
    const helpWin = new BrowserWindow({
      width: 900,
      height: 700,
      title: 'Notes Help',
      autoHideMenuBar: true,
    })
    helpWin.loadFile(helpPath)
  })

  ipcMain.handle('links:list', (_e, filters) => linkRepo.getLinks(filters))
  ipcMain.handle('links:get', (_e, id) => linkRepo.getLink(id))
  ipcMain.handle('links:create', (_e, data) => linkRepo.createLink(data))
  ipcMain.handle('links:update', (_e, id, data) => linkRepo.updateLink(id, data))
  ipcMain.handle('links:delete', (_e, id) => linkRepo.deleteLink(id))
  ipcMain.handle('links:categories:list', () => linkRepo.getCategories())
  ipcMain.handle('links:categories:create', (_e, name) => linkRepo.createCategory(name))
  ipcMain.handle('links:categories:delete', (_e, id) => linkRepo.deleteCategory(id))

  ipcMain.handle('notes:exportMarkdown', async (_e, noteId) => {
    const note = noteRepo.getNoteById(noteId)
    if (!note) throw new Error('Note not found')
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `${note.title.replace(/[<>:"/\\|?*]/g, '_')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return
    const { default: TurndownService } = await import('turndown')
    const turndown = new TurndownService()
    const markdown = turndown.turndown(note.content || '')
    fs.writeFileSync(result.filePath, `# ${note.title}\n\n${markdown}`, 'utf-8')
  })

  // Mind Maps
  ipcMain.handle('mindmap:list', () => mindmapRepo.getMindMaps())
  ipcMain.handle('mindmap:get', (_e, id) => mindmapRepo.getMindMap(id))
  ipcMain.handle('mindmap:create', (_e, name) => mindmapRepo.createMindMap(name))
  ipcMain.handle('mindmap:rename', (_e, id, name) => mindmapRepo.renameMindMap(id, name))
  ipcMain.handle('mindmap:delete', (_e, id) => mindmapRepo.deleteMindMap(id))
  ipcMain.handle('mindmap:save', (_e, id, nodes, edges) => mindmapRepo.saveMindMap(id, nodes, edges))
  // Ideas
  ipcMain.handle('ideas:list', (_e, filters) => ideaRepo.getIdeas(filters))
  ipcMain.handle('ideas:get', (_e, id) => ideaRepo.getIdea(id))
  ipcMain.handle('ideas:create', (_e, data) => ideaRepo.createIdea(data))
  ipcMain.handle('ideas:update', (_e, id, data) => ideaRepo.updateIdea(id, data))
  ipcMain.handle('ideas:delete', (_e, id) => ideaRepo.deleteIdea(id))
  ipcMain.handle('ideas:recent', (_e, limit) => ideaRepo.getRecentIdeas(limit))
  ipcMain.handle('ideas:documents:list', (_e, ideaId) => ideaRepo.getIdeaDocuments(ideaId))
  ipcMain.handle('ideas:documents:add', (_e, ideaId, filename, data, mimeType) => ideaRepo.addIdeaDocument(ideaId, filename, data, mimeType))
  ipcMain.handle('ideas:documents:delete', (_e, id) => ideaRepo.deleteIdeaDocument(id))
  ipcMain.handle('ideas:updates:list', (_e, ideaId) => ideaRepo.getIdeaUpdates(ideaId))
  ipcMain.handle('ideas:updates:add', (_e, ideaId, content, updateType) => ideaRepo.addIdeaUpdate(ideaId, content, updateType))
  ipcMain.handle('ideas:tags:get', (_e, ideaId) => ideaRepo.getIdeaTags(ideaId))
  ipcMain.handle('ideas:tags:add', (_e, ideaId, tagId) => ideaRepo.addTagToIdea(ideaId, tagId))
  ipcMain.handle('ideas:tags:remove', (_e, ideaId, tagId) => ideaRepo.removeTagFromIdea(ideaId, tagId))
  ipcMain.handle('ideas:tags:all-mappings', () => ideaRepo.getAllIdeaTags())

  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url))
  ipcMain.handle('app:closeWindow', () => { mainWindow?.close() })

  // Habits
  ipcMain.handle('habits:list', () => { ensureHabitReminders(); return habitRepo.getHabits() })
  ipcMain.handle('habits:get', (_e, id) => { ensureHabitReminders(); return habitRepo.getHabit(id) })
  ipcMain.handle('habits:create', (_e, data) => { ensureHabitReminders(); return habitRepo.createHabit(data) })
  ipcMain.handle('habits:update', (_e, id, data) => { ensureHabitReminders(); return habitRepo.updateHabit(id, data) })
  ipcMain.handle('habits:delete', (_e, id) => { ensureHabitReminders(); return habitRepo.deleteHabit(id) })
  ipcMain.handle('habits:log', (_e, habitId, date, completed) => { ensureHabitReminders(); return habitRepo.logHabit(habitId, date, completed) })
  ipcMain.handle('habits:logs', (_e, habitId, startDate, endDate) => { ensureHabitReminders(); return habitRepo.getHabitLogs(habitId, startDate, endDate) })
  ipcMain.handle('habits:yearLogs', (_e, habitId, year) => { ensureHabitReminders(); return habitRepo.getYearLogs(habitId, year) })
  ipcMain.handle('habits:stats', (_e, habitId) => { ensureHabitReminders(); return habitRepo.getHabitStats(habitId) })
  ipcMain.handle('habits:weeklyReview', () => { ensureHabitReminders(); return habitRepo.getWeeklyReview() })
  ipcMain.handle('habits:pomodoroLog', (_e, durationMinutes) => { ensureHabitReminders(); return habitRepo.logPomodoroSession(durationMinutes) })

  // Time Tracking
  ipcMain.handle('time:start', (_e, taskId, note) => {
    const entry = timeRepo.startTimer(taskId, note)
    focusWindow?.webContents.send('focus:timerUpdate', entry)
    return entry
  })
  ipcMain.handle('time:stop', (_e, entryId) => {
    const entry = timeRepo.stopTimer(entryId)
    focusWindow?.webContents.send('focus:timerUpdate', null)
    return entry
  })
  ipcMain.handle('time:stopRunning', () => {
    const entry = timeRepo.stopRunningTimer()
    focusWindow?.webContents.send('focus:timerUpdate', null)
    return entry
  })
  ipcMain.handle('time:running',      ()                   => timeRepo.getRunningTimer())
  ipcMain.handle('time:taskTime',     (_e, taskId, range)  => timeRepo.getTaskTime(taskId, range))
  ipcMain.handle('time:dailyReport',  (_e, date)           => timeRepo.getDailyReport(date))
  ipcMain.handle('time:weeklyReport', (_e, startDate)      => timeRepo.getWeeklyReport(startDate))
  ipcMain.handle('time:entries',      (_e, taskId)         => timeRepo.getAllTimeEntries(taskId))
  ipcMain.handle('time:delete',       (_e, id)             => timeRepo.deleteEntry(id))
  ipcMain.handle('time:update',       (_e, id, data)       => timeRepo.updateEntry(id, data))
  ipcMain.handle('time:totalToday',   (_e, date)           => timeRepo.getTotalFocusToday(date))

  // Journal
  ipcMain.handle('journal:get',        (_e, date)              => journalRepo.getEntry(date))
  ipcMain.handle('journal:upsert',     (_e, date, data)        => journalRepo.upsertEntry(date, data))
  ipcMain.handle('journal:delete',     (_e, date)              => journalRepo.deleteEntry(date))
  ipcMain.handle('journal:range',      (_e, start, end)        => journalRepo.getEntriesInRange(start, end))
  ipcMain.handle('journal:onThisDay',  (_e, month, day, exclude) => journalRepo.getOnThisDay(month, day, exclude))
  ipcMain.handle('journal:dailyStats', (_e, date)              => journalRepo.getDailyStats(date))
  ipcMain.handle('journal:summaryReport', (_e, start, end, criteria) => journalRepo.getSummaryReport(start, end, criteria))

  // Focus Mode
  ipcMain.handle('focus:toggle', () => {
    if (focusWindow) { focusWindow.close() } else { createFocusWindow() }
  })
  ipcMain.handle('focus:close',    () => { focusWindow?.close() })
  ipcMain.handle('focus:minimize', () => { focusWindow?.minimize() })

  // Pomodoro session complete — logs habit session + stops running timer
  ipcMain.handle('pomodoro:sessionComplete', (_e, durationMinutes) => {
    habitRepo.logPomodoroSession(durationMinutes)
    const running = timeRepo.getRunningTimer()
    if (running) {
      timeRepo.stopTimer(running.id)
      focusWindow?.webContents.send('focus:timerUpdate', null)
    }
  })

  // ── AI Chat ──

  const activeStreams = new Map<number, AbortController>()

  ipcMain.handle('ai:chat:conversations:list', () => chatRepo.getConversations())
  ipcMain.handle('ai:chat:conversations:create', (_e, provider?: string, model?: string, apiKey?: string) =>
    chatRepo.createConversation(provider, model, apiKey))
  ipcMain.handle('ai:chat:conversations:delete', (_e, id) => chatRepo.deleteConversation(id))
  ipcMain.handle('ai:chat:conversations:rename', (_e, id, title) => chatRepo.updateConversationTitle(id, title))
  ipcMain.handle('ai:chat:conversations:updateConfig', (_e, id, provider, model, apiKey, systemPrompt?, temperature?, maxTokens?) => chatRepo.updateConversationConfig(id, provider, model, apiKey, systemPrompt, temperature, maxTokens))
  ipcMain.handle('ai:chat:messages:list', (_e, id) => chatRepo.getMessages(id))
  ipcMain.handle('ai:chat:messages:delete', (_e, id) => chatRepo.deleteMessage(id))
  ipcMain.handle('ai:chat:messages:delete-after', (_e, conversationId, afterId) => chatRepo.deleteMessagesAfter(conversationId, afterId))

  ipcMain.handle('ai:chat:config:get', () => ({
    provider: chatRepo.getAiConfig('provider') || 'ollama',
    apiKey: chatRepo.getAiConfig('api_key') || '',
    model: chatRepo.getAiConfig('model') || 'llama3.2',
  }))

  ipcMain.handle('ai:chat:config:set', (_e, config) => {
    if (config.provider) chatRepo.setAiConfig('provider', config.provider)
    if (config.apiKey !== undefined) chatRepo.setAiConfig('api_key', config.apiKey)
    if (config.model) chatRepo.setAiConfig('model', config.model)
  })

  ipcMain.handle('ai:chat:ollama-models', async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      const data = await res.json() as any
      const models: string[] = (data.models || []).map((m: any) => m.name)
      console.log('[AI Chat] fetched Ollama models:', models)
      return models
    } catch (err: any) {
      console.error('[AI Chat] failed to fetch Ollama models:', err.message)
      return []
    }
  })

  ipcMain.handle('ai:chat:provider-models', async (_e, baseUrl: string, apiKey?: string) => {
    try {
      const headers: Record<string, string> = {}
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const res = await fetch(`${baseUrl}/models`, { headers })
      const data = await res.json() as any
      const models: string[] = (data.data || []).map((m: any) => m.id).filter(Boolean)
      console.log('[AI Chat] fetched provider models from', baseUrl, ':', models)
      return models
    } catch (err: any) {
      console.error('[AI Chat] failed to fetch provider models:', err.message)
      return []
    }
  })

  const STREAM_TIMEOUT_MS = 120_000
  let openaiModule: typeof OpenAI | null = null

  async function streamAiResponse(event: Electron.IpcMainEvent, conversationId: number, logPrefix: string) {
    const existing = activeStreams.get(conversationId)
    if (existing) existing.abort()

    const abortController = new AbortController()
    const streamKey = conversationId
    activeStreams.set(streamKey, abortController)
    const thisController = abortController

    try {
      const convs = chatRepo.getConversations()
      const conv = convs.find(c => c.id === conversationId)
      const provider = conv?.provider || 'ollama'
      const apiKey = conv?.api_key || ''
      const model = conv?.model || 'llama3.2'
      const systemPrompt = conv?.system_prompt || ''
      const temperature = conv?.temperature ?? 0.7
      const maxTokens = conv?.max_tokens ?? 4096
      console.log(`[${logPrefix}] config`, { provider, model, hasApiKey: !!apiKey, convFound: !!conv })

      let client: OpenAI
      if (!openaiModule) {
        openaiModule = (await import('openai')).default
      }
      const OpenAI = openaiModule
      if (provider === 'ollama') {
        console.log(`[${logPrefix}] using ollama`)
        client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' })
      } else if (provider === 'openai') {
        console.log(`[${logPrefix}] using openai`)
        client = new OpenAI({ apiKey })
      } else if (provider === 'gemini') {
        console.log(`[${logPrefix}] using gemini`)
        client = new OpenAI({ baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKey })
      } else if (provider === 'groq') {
        console.log(`[${logPrefix}] using groq`)
        client = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey })
      } else if (provider === 'mistral') {
        console.log(`[${logPrefix}] using mistral`)
        client = new OpenAI({ baseURL: 'https://api.mistral.ai/v1', apiKey })
      } else if (provider === 'openrouter') {
        console.log(`[${logPrefix}] using openrouter`)
        client = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey })
      } else if (provider === 'opencode') {
        console.log(`[${logPrefix}] using opencode`)
        client = new OpenAI({ baseURL: 'https://opencode.ai/zen/v1', apiKey })
      } else if (provider === 'opencode-go') {
        console.log(`[${logPrefix}] using opencode-go`)
        client = new OpenAI({ baseURL: 'https://opencode.ai/zen/go/v1', apiKey })
      } else {
        console.log(`[${logPrefix}] using unknown provider, falling back`)
        client = new OpenAI({ apiKey })
      }

      const history = chatRepo.getMessages(conversationId)
      const msgs = history.map((m: any) => ({ role: m.role, content: m.content }))
      const sp = systemPrompt || 'You are a helpful assistant integrated into Vibe Tasks, a desktop task management app. You help users manage tasks, notes, habits, and productivity. Respond concisely and helpfully. IMPORTANT: Do NOT add line numbers inside code blocks. Never prefix code lines with numbers like "1 ", "2 ", etc. The code viewer displays its own line-number gutter automatically.'
      if (!msgs.some(m => m.role === 'system')) {
        msgs.unshift({ role: 'system', content: sp })
      }

      let fullContent = ''
      console.log(`[${logPrefix}] creating stream...`)
      const stream = await client.chat.completions.create({
        model,
        messages: msgs,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }, { signal: abortController.signal })
      console.log(`[${logPrefix}] stream created, iterating...`)

      let lastChunkAt = Date.now()
      const timeoutInterval = setInterval(() => {
        if (Date.now() - lastChunkAt > STREAM_TIMEOUT_MS) {
          console.warn(`[${logPrefix}] stream timeout after ${STREAM_TIMEOUT_MS}ms of inactivity`)
          abortController.abort()
        }
      }, 10_000)

      try {
        for await (const chunk of stream) {
          lastChunkAt = Date.now()
          const delta = chunk.choices[0]?.delta?.content || ''
          if (delta) {
            fullContent += delta
            event.sender.send('ai:chat:chunk', { conversationId, delta })
          }
        }
      } finally {
        clearInterval(timeoutInterval)
      }

      console.log(`[${logPrefix}] stream complete, fullContent length:`, fullContent.length)
      try {
        chatRepo.addMessage(conversationId, 'assistant', fullContent)
      } catch (dbErr: any) {
        console.error(`[${logPrefix}] failed to save assistant message:`, dbErr.message)
      }
      event.sender.send('ai:chat:chunk', { conversationId, done: true })
    } catch (err: any) {
      console.error(`[${logPrefix}] error:`, err.name, err.message, 'status:', err.status, 'code:', err.code, 'type:', err.type)
      if (err.name === 'AbortError') {
        console.log(`[${logPrefix}] stream aborted for conv`, conversationId)
        event.sender.send('ai:chat:chunk', { conversationId, done: true })
      } else {
        const statusHint = err.status ? ` (HTTP ${err.status})` : ''
        const bodyHint = err.message.includes('(no body)') ? ' — the API returned no error details. Check your API key is valid and the model is accessible.' : ''
        event.sender.send('ai:chat:chunk', { conversationId, error: `${err.message}${statusHint}${bodyHint}` })
      }
    } finally {
      if (activeStreams.get(streamKey) === thisController) {
        activeStreams.delete(streamKey)
      }
    }
  }

  ipcMain.on('ai:chat:send', async (event, { conversationId, message }) => {
    console.log('[ai:chat:send] received', { conversationId, message: message.substring(0, 50) })
    try {
      chatRepo.addMessage(conversationId, 'user', message)
    } catch (err: any) {
      console.error('[ai:chat:send] failed to save user message:', err.message)
      event.sender.send('ai:chat:chunk', { conversationId, error: `Failed to save message: ${err.message}` })
      return
    }
    await streamAiResponse(event, conversationId, 'ai:chat:send')
  })

  ipcMain.on('ai:chat:retry', async (event, { conversationId }) => {
    console.log('[ai:chat:retry] received', { conversationId })
    await streamAiResponse(event, conversationId, 'ai:chat:retry')
  })

  ipcMain.on('ai:chat:cancel', (_e, conversationId) => {
    const existing = activeStreams.get(conversationId)
    if (existing) existing.abort()
  })

  ipcMain.handle('theme:get', () => {
    return getThemeFromConfig()
  })

  ipcMain.handle('theme:set', (_e, theme: string) => {
    const config = loadConfig()
    config.theme = theme
    saveConfig(config)
    if (mainWindow) {
      const overlay = theme === 'light'
        ? { color: '#f5f5f9', symbolColor: '#1e1e2e', height: 40 }
        : { color: '#1e1e2e', symbolColor: '#cdd6f4', height: 40 }
      mainWindow.setTitleBarOverlay(overlay)
    }
    if (pomodoroWindow && !pomodoroWindow.isDestroyed()) {
      pomodoroWindow.webContents.send('theme:changed', theme)
    }
  })
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    console.log('[startup] app ready, creating splash...')
    splashShownAt = Date.now()
    createSplashWindow()
    console.log('[startup] splash created, initializing database...')
    await initDatabase()
    console.log('[startup] database initialized, registering IPC handlers...')
    registerIpcHandlers()
    console.log('[startup] IPC handlers registered')

    const remaining = Math.max(0, SPLASH_MIN_DURATION_MS - (Date.now() - splashShownAt))
    console.log(`[startup] splash min duration remaining: ${remaining}ms, creating main window...`)
    setTimeout(() => {
      console.log('[startup] creating main window now')
      createWindow()
    }, remaining)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
