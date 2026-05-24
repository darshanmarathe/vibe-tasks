import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { app, BrowserWindow, ipcMain, Notification, dialog, shell } from 'electron'
import { initDatabase, getDbPath, setDbPath } from './database/db'
import TurndownService from 'turndown'
import * as userRepo from './database/repositories/userRepo'
import * as projectRepo from './database/repositories/projectRepo'
import * as statusRepo from './database/repositories/statusRepo'
import * as priorityRepo from './database/repositories/priorityRepo'
import * as taskRepo from './database/repositories/taskRepo'
import * as noteRepo from './database/repositories/noteRepo'
import * as mindmapRepo from './database/repositories/mindmapRepo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let pomodoroWindow: BrowserWindow | null = null
const CONFIG_PATH = path.join(app.getPath('userData'), 'vibetasks-config.json')
const DEFAULT_THEME = 'dark'
const DEFAULT_ZOOM_FACTOR = 1
const MIN_ZOOM_FACTOR = 0.5
const MAX_ZOOM_FACTOR = 3
const ZOOM_STEP = 0.1

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

function createWindow() {
  const theme = getThemeFromConfig()
  const overlay = theme === 'light'
    ? { color: '#f5f5f9', symbolColor: '#1e1e2e', height: 40 }
    : { color: '#1e1e2e', symbolColor: '#cdd6f4', height: 40 }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath('preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: overlay,
  })

  mainWindow.maximize()
  mainWindow.webContents.setZoomFactor(getZoomFactorFromConfig())

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
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

  ipcMain.handle('db:tasks:list', (_e, includeArchived) => taskRepo.getTasks(includeArchived))
  ipcMain.handle('db:tasks:archived', () => taskRepo.getArchivedTasks())
  ipcMain.handle('db:tasks:create', (_e, data) => taskRepo.createTask(data))
  ipcMain.handle('db:tasks:update', (_e, id, data) => taskRepo.updateTask(id, data))
  ipcMain.handle('db:tasks:delete', (_e, id) => taskRepo.deleteTask(id))
  ipcMain.handle('db:tasks:archive', (_e, id) => taskRepo.archiveTask(id))
  ipcMain.handle('db:tasks:unarchive', (_e, id) => taskRepo.unarchiveTask(id))

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

  ipcMain.handle('notes:exportMarkdown', async (_e, noteId) => {
    const note = noteRepo.getNoteById(noteId)
    if (!note) throw new Error('Note not found')
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `${note.title.replace(/[<>:"/\\|?*]/g, '_')}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return
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
  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url))

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
    await initDatabase()
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
