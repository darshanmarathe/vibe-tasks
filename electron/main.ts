import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { app, BrowserWindow, ipcMain, Notification, dialog } from 'electron'
import { initDatabase, getDbPath, setDbPath } from './database/db'
import * as userRepo from './database/repositories/userRepo'
import * as projectRepo from './database/repositories/projectRepo'
import * as statusRepo from './database/repositories/statusRepo'
import * as priorityRepo from './database/repositories/priorityRepo'
import * as taskRepo from './database/repositories/taskRepo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let pomodoroWindow: BrowserWindow | null = null
const CONFIG_PATH = path.join(app.getPath('userData'), 'vibetasks-config.json')

function preloadPath(file: string) {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'electron', file)
    : path.join(app.getAppPath(), 'electron', file)
}

function getThemeFromConfig(): string {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    return config.theme || 'dark'
  } catch {
    return 'dark'
  }
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

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
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

  ipcMain.handle('theme:get', () => {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
      return config.theme || 'dark'
    } catch {
      return 'dark'
    }
  })

  ipcMain.handle('theme:set', (_e, theme: string) => {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
      config.theme = theme
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
    } catch {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({ theme }, null, 2))
    }
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
