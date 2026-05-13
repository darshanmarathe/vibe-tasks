const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getUsers: () => ipcRenderer.invoke('db:users:list'),
  createUser: (data) => ipcRenderer.invoke('db:users:create', data),
  updateUser: (id, data) => ipcRenderer.invoke('db:users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('db:users:delete', id),

  getProjects: () => ipcRenderer.invoke('db:projects:list'),
  createProject: (data) => ipcRenderer.invoke('db:projects:create', data),
  updateProject: (id, data) => ipcRenderer.invoke('db:projects:update', id, data),
  deleteProject: (id) => ipcRenderer.invoke('db:projects:delete', id),

  getStatuses: () => ipcRenderer.invoke('db:statuses:list'),
  createStatus: (data) => ipcRenderer.invoke('db:statuses:create', data),
  updateStatus: (id, data) => ipcRenderer.invoke('db:statuses:update', id, data),
  deleteStatus: (id) => ipcRenderer.invoke('db:statuses:delete', id),
  reorderStatuses: (items) => ipcRenderer.invoke('db:statuses:reorder', items),

  getPriorities: () => ipcRenderer.invoke('db:priorities:list'),
  createPriority: (data) => ipcRenderer.invoke('db:priorities:create', data),
  updatePriority: (id, data) => ipcRenderer.invoke('db:priorities:update', id, data),
  deletePriority: (id) => ipcRenderer.invoke('db:priorities:delete', id),

  getTasks: (includeArchived) => ipcRenderer.invoke('db:tasks:list', includeArchived),
  getArchivedTasks: () => ipcRenderer.invoke('db:tasks:archived'),
  createTask: (data) => ipcRenderer.invoke('db:tasks:create', data),
  updateTask: (id, data) => ipcRenderer.invoke('db:tasks:update', id, data),
  deleteTask: (id) => ipcRenderer.invoke('db:tasks:delete', id),
  archiveTask: (id) => ipcRenderer.invoke('db:tasks:archive', id),
  unarchiveTask: (id) => ipcRenderer.invoke('db:tasks:unarchive', id),

  togglePomodoro: () => ipcRenderer.invoke('pomodoro:toggle'),

  getDbPath: () => ipcRenderer.invoke('db:getPath'),
  pickDbPath: () => ipcRenderer.invoke('db:pickPath'),

  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
})
