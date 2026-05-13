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

  // Theme
  setTheme: (theme: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
