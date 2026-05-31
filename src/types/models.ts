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
  setNotebookColor: (id: string, color: string) => Promise<void>
  getNotes: (notebookId: string, sortBy?: string) => Promise<Note[]>
  getAllNotes: (sortBy?: string) => Promise<Note[]>
  getNoteById: (id: string) => Promise<Note | null>
  createNote: (notebookId: string, title: string) => Promise<Note>
  saveNote: (id: string, title: string, content: string) => Promise<void>
  trashNote: (id: string) => Promise<void>
  restoreNote: (id: string) => Promise<void>
  deleteNotePermanently: (id: string) => Promise<void>
  getTrashedNotes: () => Promise<Note[]>
  searchNotes: (query: string) => Promise<Note[]>
  togglePin: (id: string) => Promise<void>
  getBacklinks: (title: string, excludeId: string) => Promise<{ id: string; title: string; notebook_id: string }[]>
  getAllTags: () => Promise<TagWithCount[]>
  getNoteTags: (noteId: string) => Promise<Tag[]>
  addTagToNote: (noteId: string, tagId: string) => Promise<void>
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>
  createTag: (name: string) => Promise<Tag>
  getNotesByTag: (tagId: string) => Promise<Note[]>
  deleteTag: (id: string) => Promise<void>
  searchNoteTitles: (query: string) => Promise<{ id: string; title: string; notebook_id: string }[]>
  exportNoteAsMarkdown: (id: string) => Promise<void>
  openNotesHelp: () => Promise<void>
  getRecentNotes: (limit?: number) => Promise<NoteWithNotebook[]>
  getNoteByTitle: (title: string) => Promise<Note | null>
  duplicateNote: (id: string) => Promise<Note>

  // Mind Maps
  getMindMaps: () => Promise<MindMap[]>
  getMindMap: (id: string) => Promise<MindMapFull | null>
  createMindMap: (name: string) => Promise<MindMap>
  renameMindMap: (id: string, name: string) => Promise<void>
  deleteMindMap: (id: string) => Promise<void>
  saveMindMap: (id: string, nodes: MindMapNode[], edges: MindMapEdge[]) => Promise<void>

  // Habits
  getHabits: () => Promise<Habit[]>
  getHabit: (id: number) => Promise<Habit | null>
  createHabit: (data: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'loggedToday'>) => Promise<Habit>
  updateHabit: (id: number, data: Partial<Habit>) => Promise<Habit | null>
  deleteHabit: (id: number) => Promise<void>
  logHabit: (habitId: number, date: string, completed: boolean) => Promise<Habit>
  getHabitLogs: (habitId: number, startDate: string, endDate: string) => Promise<HabitLog[]>
  getHabitYearLogs: (habitId: number, year: number) => Promise<HabitLog[]>
  getHabitStats: (habitId: number) => Promise<HabitStats>
  getWeeklyReview: () => Promise<WeeklyReview>
  logPomodoroSession: (durationMinutes: number) => Promise<void>

  // Theme
  setTheme: (theme: string) => Promise<void>

  // Time Tracking
  startTimer: (taskId: number, note?: string) => Promise<TimeEntry>
  stopTimer: (entryId: number) => Promise<TimeEntry>
  stopRunningTimer: () => Promise<TimeEntry | null>
  getRunningTimer: () => Promise<TimeEntry | null>
  getTaskTime: (taskId: number, range?: TimeRange) => Promise<number>
  getDailyReport: (date: string) => Promise<DailyReportEntry[]>
  getWeeklyReport: (startDate: string) => Promise<WeeklyReportDay[]>
  getTimeEntries: (taskId: number) => Promise<TimeEntry[]>
  deleteTimeEntry: (id: number) => Promise<void>
  updateTimeEntry: (id: number, data: Partial<TimeEntry>) => Promise<TimeEntry>
  getTotalFocusToday: (date: string) => Promise<number>

  // Journal
  getJournalEntry: (date: string) => Promise<JournalEntry | null>
  upsertJournalEntry: (date: string, data: Partial<Pick<JournalEntry, 'mood' | 'wentWell' | 'toImprove' | 'wins' | 'losses' | 'quickNotes'>>) => Promise<JournalEntry | null>
  deleteJournalEntry: (date: string) => Promise<void>
  getJournalRange: (start: string, end: string) => Promise<JournalEntry[]>
  getJournalOnThisDay: (month: number, day: number, excludeDate?: string) => Promise<OnThisDayEntry[]>
  getJournalDailyStats: (date: string) => Promise<JournalDailyStats>
  getJournalSummaryReport: (start: string, end: string, criteria: JournalSummaryCriteria) => Promise<JournalSummaryReport>

  // Focus Mode
  toggleFocus: () => Promise<void>
}

export interface Notebook {
  id: string
  name: string
  color: string
  created_at: string
}

export interface NoteWithNotebook extends Note {
  notebook_name: string
}

export interface Note {
  id: string
  notebook_id: string
  title: string
  content: string
  is_trashed: number
  is_pinned: number
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  name: string
}

export interface TagWithCount extends Tag {
  count: number
}

export interface MindMap {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface MindMapNode {
  id: string
  map_id: string
  title: string
  color: string
  emoji: string
  notes: string
  x: number
  y: number
  width: number
  height: number
}

export interface MindMapEdge {
  id: string
  map_id: string
  from_node: string
  to_node: string
  label: string
  dashed: number
}

export interface MindMapFull extends MindMap {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export interface Habit {
  id: number
  name: string
  description: string
  frequency: 'daily' | 'weekly'
  reminder_time: string | null
  color: string
  emoji: string
  created_at: string
  sort_order: number
  currentStreak: number
  longestStreak: number
  loggedToday: boolean
}

export interface HabitLog {
  id: number
  habit_id: number
  date: string
  completed: number
  created_at: string
}

export interface HabitStats {
  currentStreak: number
  longestStreak: number
  totalLogs: number
  completionRate: number
}

export interface WeeklyReview {
  totalTasks: number
  completedTasks: number
  habitsTracked: number
  notesWritten: number
  pomodoroSessions: number
  journalDays: number
  weekStart: string
}

export interface TimeEntry {
  id: number
  task_id: number
  task_name?: string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  note: string
  created_at: string
}

export interface TimeRange {
  start: string
  end: string
}

export interface DailyReportEntry {
  taskId: number
  taskName: string
  totalSeconds: number
  entries: TimeEntry[]
}

export interface WeeklyReportDay {
  date: string
  totalSeconds: number
  byTask: { taskId: number; taskName: string; totalSeconds: number }[]
}

export interface JournalEntry {
  id: number
  date: string
  mood: number | null
  wentWell: string
  toImprove: string
  wins: string
  losses: string
  quickNotes: string
  createdAt: string
  updatedAt: string
}

export interface JournalDailyStats {
  date: string
  tasksCompleted: number
  tasksCompletedList: { id: number; name: string }[]
  pomodoroSessions: number
  habitsCompleted: number
  habitsTotal: number
  focusTimeSeconds: number
  notesWritten: number
}

export interface OnThisDayEntry {
  date: string
  mood: number | null
  wentWell: string
  yearsAgo: number
}

export interface JournalSummaryCriteria {
  includeMood: boolean
  includeWentWell: boolean
  includeToImprove: boolean
  includeWins: boolean
  includeLosses: boolean
  includeQuickNotes: boolean
  includeTasksCompleted: boolean
  includePomodoros: boolean
  includeHabits: boolean
  includeFocusTime: boolean
  includeNotesWritten: boolean
}

export interface JournalSummaryDay {
  date: string
  entry: JournalEntry | null
  stats: JournalDailyStats | null
}

export interface JournalSummaryReport {
  startDate: string
  endDate: string
  daysJournaled: number
  averageMood: number | null
  totalPomodoroSessions: number
  totalTasksCompleted: number
  totalFocusTimeSeconds: number
  totalNotesWritten: number
  totalHabitsCompleted: number
  allWins: { date: string; text: string }[]
  allLosses: { date: string; text: string }[]
  days: JournalSummaryDay[]
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
