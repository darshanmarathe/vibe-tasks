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

  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  // Notes
  getNotebooks: () => ipcRenderer.invoke('notes:notebooks:list'),
  createNotebook: (name) => ipcRenderer.invoke('notes:notebooks:create', name),
  renameNotebook: (id, name) => ipcRenderer.invoke('notes:notebooks:rename', id, name),
  deleteNotebook: (id) => ipcRenderer.invoke('notes:notebooks:delete', id),
  getNotes: (notebookId) => ipcRenderer.invoke('notes:list', notebookId),
  getAllNotes: () => ipcRenderer.invoke('notes:listAll'),
  getNoteById: (id) => ipcRenderer.invoke('notes:get', id),
  createNote: (notebookId, title) => ipcRenderer.invoke('notes:create', notebookId, title),
  saveNote: (id, title, content) => ipcRenderer.invoke('notes:save', id, title, content),
  trashNote: (id) => ipcRenderer.invoke('notes:trash', id),
  restoreNote: (id) => ipcRenderer.invoke('notes:restore', id),
  deleteNotePermanently: (id) => ipcRenderer.invoke('notes:delete', id),
  getTrashedNotes: () => ipcRenderer.invoke('notes:trashed'),
  searchNotes: (query) => ipcRenderer.invoke('notes:search', query),

  // Mind Maps
  getMindMaps: () => ipcRenderer.invoke('mindmap:list'),
  getMindMap: (id) => ipcRenderer.invoke('mindmap:get', id),
  createMindMap: (name) => ipcRenderer.invoke('mindmap:create', name),
  renameMindMap: (id, name) => ipcRenderer.invoke('mindmap:rename', id, name),
  deleteMindMap: (id) => ipcRenderer.invoke('mindmap:delete', id),
  saveMindMap: (id, nodes, edges) => ipcRenderer.invoke('mindmap:save', id, nodes, edges),
})
