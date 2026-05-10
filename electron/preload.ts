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

  getTasks: () => ipcRenderer.invoke('db:tasks:list'),
  createTask: (data: any) => ipcRenderer.invoke('db:tasks:create', data),
  updateTask: (id: number, data: any) => ipcRenderer.invoke('db:tasks:update', id, data),
  deleteTask: (id: number) => ipcRenderer.invoke('db:tasks:delete', id),

  togglePomodoro: () => ipcRenderer.invoke('pomodoro:toggle'),

  getDbPath: () => ipcRenderer.invoke('db:getPath'),
  pickDbPath: () => ipcRenderer.invoke('db:pickPath'),
})
