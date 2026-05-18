export interface User {
  id: number
  name: string
  email: string
}

export interface Project {
  id: number
  name: string
  description: string
}

export interface Status {
  id: number
  name: string
  ord: number
}

export interface Priority {
  id: number
  name: string
  color: string
}

export interface Task {
  id: number
  name: string
  description: string
  notes: string
  dueDate: string | null
  statusId: number
  priorityId: number
  projectId: number
  predecessorIds: string
  successorIds: string
  archived: number
  assignedTo: number | null
  completionPercent: number
}

export interface TaskWithRelations extends Task {
  statusName: string
  priorityName: string
  priorityColor: string
  projectName: string
  predecessorNames: string
  successorNames: string
  assignedToName: string | null
  assignedToEmail: string | null
}

export interface ElectronAPI {
  // Users
  getUsers: () => Promise<User[]>
  createUser: (data: Omit<User, 'id'>) => Promise<User>
  updateUser: (id: number, data: Partial<User>) => Promise<User>
  deleteUser: (id: number) => Promise<void>

  // Projects
  getProjects: () => Promise<Project[]>
  createProject: (data: Omit<Project, 'id'>) => Promise<Project>
  updateProject: (id: number, data: Partial<Project>) => Promise<Project>
  deleteProject: (id: number) => Promise<void>

  // Statuses
  getStatuses: () => Promise<Status[]>
  createStatus: (data: Omit<Status, 'id'>) => Promise<Status>
  updateStatus: (id: number, data: Partial<Status>) => Promise<Status>
  deleteStatus: (id: number) => Promise<void>
  reorderStatuses: (items: { id: number; ord: number }[]) => Promise<void>

  // Priorities
  getPriorities: () => Promise<Priority[]>
  createPriority: (data: Omit<Priority, 'id'>) => Promise<Priority>
  updatePriority: (id: number, data: Partial<Priority>) => Promise<Priority>
  deletePriority: (id: number) => Promise<void>

  // Tasks
  getTasks: (includeArchived?: boolean) => Promise<TaskWithRelations[]>
  getArchivedTasks: () => Promise<TaskWithRelations[]>
  createTask: (data: Omit<Task, 'id'>) => Promise<TaskWithRelations>
  updateTask: (id: number, data: Partial<Task>) => Promise<TaskWithRelations>
  deleteTask: (id: number) => Promise<void>
  archiveTask: (id: number) => Promise<void>
  unarchiveTask: (id: number) => Promise<void>

  // Pomodoro
  togglePomodoro: () => Promise<void>

  // Database
  getDbPath: () => Promise<string>
  pickDbPath: () => Promise<string | null>

  // App
  getVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>

  // Notes
  getNotebooks: () => Promise<Notebook[]>
  createNotebook: (name: string) => Promise<Notebook>
  renameNotebook: (id: string, name: string) => Promise<void>
  deleteNotebook: (id: string) => Promise<void>
  getNotes: (notebookId: string) => Promise<Note[]>
  getAllNotes: () => Promise<Note[]>
  getNoteById: (id: string) => Promise<Note | null>
  createNote: (notebookId: string, title: string) => Promise<Note>
  saveNote: (id: string, title: string, content: string) => Promise<void>
  trashNote: (id: string) => Promise<void>
  restoreNote: (id: string) => Promise<void>
  deleteNotePermanently: (id: string) => Promise<void>
  getTrashedNotes: () => Promise<Note[]>
  searchNotes: (query: string) => Promise<Note[]>

  // Theme
  setTheme: (theme: string) => Promise<void>
}

export interface Notebook {
  id: string
  name: string
  created_at: string
}

export interface Note {
  id: string
  notebook_id: string
  title: string
  content: string
  is_trashed: number
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  name: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
