import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getUsers: () => ipcRenderer.invoke('db:users:list'),
  createUser: (data: any) => ipcRenderer.invoke('db:users:create', data),
  updateUser: (id: number, data: any) => ipcRenderer.invoke('db:users:update', id, data),
  deleteUser: (id: number) => ipcRenderer.invoke('db:users:delete', id),

  getProjects: () => ipcRenderer.invoke('db:projects:list'),
  createProject: (data: any) => ipcRenderer.invoke('db:projects:create', data),
  updateProject: (id: number, data: any) => ipcRenderer.invoke('db:projects:update', id, data),
  deleteProject: (id: number) => ipcRenderer.invoke('db:projects:delete', id),

  getStatuses: () => ipcRenderer.invoke('db:statuses:list'),
  createStatus: (data: any) => ipcRenderer.invoke('db:statuses:create', data),
  updateStatus: (id: number, data: any) => ipcRenderer.invoke('db:statuses:update', id, data),
  deleteStatus: (id: number) => ipcRenderer.invoke('db:statuses:delete', id),

  getPriorities: () => ipcRenderer.invoke('db:priorities:list'),
  createPriority: (data: any) => ipcRenderer.invoke('db:priorities:create', data),
  updatePriority: (id: number, data: any) => ipcRenderer.invoke('db:priorities:update', id, data),
  deletePriority: (id: number) => ipcRenderer.invoke('db:priorities:delete', id),

  getTasks: (includeArchived?: boolean) => ipcRenderer.invoke('db:tasks:list', includeArchived),
  getArchivedTasks: () => ipcRenderer.invoke('db:tasks:archived'),
  createTask: (data: any) => ipcRenderer.invoke('db:tasks:create', data),
  updateTask: (id: number, data: any) => ipcRenderer.invoke('db:tasks:update', id, data),
  deleteTask: (id: number) => ipcRenderer.invoke('db:tasks:delete', id),
  archiveTask: (id: number) => ipcRenderer.invoke('db:tasks:archive', id),
  unarchiveTask: (id: number) => ipcRenderer.invoke('db:tasks:unarchive', id),

  togglePomodoro: () => ipcRenderer.invoke('pomodoro:toggle'),

  getDbPath: () => ipcRenderer.invoke('db:getPath'),
  pickDbPath: () => ipcRenderer.invoke('db:pickPath'),

  setTheme: (theme: string) => ipcRenderer.invoke('theme:set', theme),

  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),

  // Notes
  getNotebooks: () => ipcRenderer.invoke('notes:notebooks:list'),
  createNotebook: (name: string) => ipcRenderer.invoke('notes:notebooks:create', name),
  renameNotebook: (id: string, name: string) => ipcRenderer.invoke('notes:notebooks:rename', id, name),
  deleteNotebook: (id: string) => ipcRenderer.invoke('notes:notebooks:delete', id),
  getNotes: (notebookId: string) => ipcRenderer.invoke('notes:list', notebookId),
  getAllNotes: () => ipcRenderer.invoke('notes:listAll'),
  getNoteById: (id: string) => ipcRenderer.invoke('notes:get', id),
  createNote: (notebookId: string, title: string) => ipcRenderer.invoke('notes:create', notebookId, title),
  saveNote: (id: string, title: string, content: string) => ipcRenderer.invoke('notes:save', id, title, content),
  trashNote: (id: string) => ipcRenderer.invoke('notes:trash', id),
  restoreNote: (id: string) => ipcRenderer.invoke('notes:restore', id),
  deleteNotePermanently: (id: string) => ipcRenderer.invoke('notes:delete', id),
  getTrashedNotes: () => ipcRenderer.invoke('notes:trashed'),
  searchNotes: (query: string) => ipcRenderer.invoke('notes:search', query),

  // Mind Maps
  getMindMaps: () => ipcRenderer.invoke('mindmap:list'),
  getMindMap: (id: string) => ipcRenderer.invoke('mindmap:get', id),
  createMindMap: (name: string) => ipcRenderer.invoke('mindmap:create', name),
  renameMindMap: (id: string, name: string) => ipcRenderer.invoke('mindmap:rename', id, name),
  deleteMindMap: (id: string) => ipcRenderer.invoke('mindmap:delete', id),
  saveMindMap: (id: string, nodes: any[], edges: any[]) => ipcRenderer.invoke('mindmap:save', id, nodes, edges),
})
