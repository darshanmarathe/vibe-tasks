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

  getTasks: (includeArchived?: boolean, includeGenerated?: boolean) => ipcRenderer.invoke('db:tasks:list', includeArchived, includeGenerated),
  getArchivedTasks: () => ipcRenderer.invoke('db:tasks:archived'),
  createTask: (data: any) => ipcRenderer.invoke('db:tasks:create', data),
  updateTask: (id: number, data: any) => ipcRenderer.invoke('db:tasks:update', id, data),
  deleteTask: (id: number) => ipcRenderer.invoke('db:tasks:delete', id),
  archiveTask: (id: number) => ipcRenderer.invoke('db:tasks:archive', id),
  unarchiveTask: (id: number) => ipcRenderer.invoke('db:tasks:unarchive', id),
  getRecurringTasks: () => ipcRenderer.invoke('db:tasks:recurring'),
  generateNextOccurrence: (id: number) => ipcRenderer.invoke('db:tasks:generate-next', id),
  generateAllOccurrences: (id: number) => ipcRenderer.invoke('db:tasks:generate-all', id),

  // Data Portability
  exportJson: () => ipcRenderer.invoke('db:export-json'),
  importJson: () => ipcRenderer.invoke('db:import-json'),
  exportTasksCsv: () => ipcRenderer.invoke('db:export-csv'),
  importTasksCsv: () => ipcRenderer.invoke('db:import-csv'),
  exportTaskShare: (taskId: number) => ipcRenderer.invoke('db:export-task-share', taskId),
  importShareLink: () => ipcRenderer.invoke('db:import-share-link'),

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
  setNotebookColor: (id: string, color: string) => ipcRenderer.invoke('notes:notebooks:setColor', id, color),
  getNotes: (notebookId: string, sortBy?: string) => ipcRenderer.invoke('notes:list', notebookId, sortBy),
  getAllNotes: (sortBy?: string) => ipcRenderer.invoke('notes:listAll', sortBy),
  getNoteById: (id: string) => ipcRenderer.invoke('notes:get', id),
  createNote: (notebookId: string, title: string) => ipcRenderer.invoke('notes:create', notebookId, title),
  saveNote: (id: string, title: string, content: string) => ipcRenderer.invoke('notes:save', id, title, content),
  trashNote: (id: string) => ipcRenderer.invoke('notes:trash', id),
  restoreNote: (id: string) => ipcRenderer.invoke('notes:restore', id),
  deleteNotePermanently: (id: string) => ipcRenderer.invoke('notes:delete', id),
  getTrashedNotes: () => ipcRenderer.invoke('notes:trashed'),
  searchNotes: (query: string) => ipcRenderer.invoke('notes:search', query),
  togglePin: (id: string) => ipcRenderer.invoke('notes:togglePin', id),
  getBacklinks: (title: string, excludeId: string) => ipcRenderer.invoke('notes:backlinks', title, excludeId),
  getAllTags: () => ipcRenderer.invoke('notes:tags:all'),
  getNoteTags: (noteId: string) => ipcRenderer.invoke('notes:tags:getForNote', noteId),
  addTagToNote: (noteId: string, tagId: string) => ipcRenderer.invoke('notes:tags:add', noteId, tagId),
  removeTagFromNote: (noteId: string, tagId: string) => ipcRenderer.invoke('notes:tags:remove', noteId, tagId),
  createTag: (name: string) => ipcRenderer.invoke('notes:tags:create', name),
  getNotesByTag: (tagId: string) => ipcRenderer.invoke('notes:tags:notesByTag', tagId),
  deleteTag: (id: string) => ipcRenderer.invoke('notes:tags:delete', id),
  searchNoteTitles: (query: string) => ipcRenderer.invoke('notes:searchTitles', query),
  exportNoteAsMarkdown: (id: string) => ipcRenderer.invoke('notes:exportMarkdown', id),
  openNotesHelp: () => ipcRenderer.invoke('notes:openHelp'),
  getRecentNotes: (limit?: number) => ipcRenderer.invoke('notes:recent', limit),
  getNoteByTitle: (title: string) => ipcRenderer.invoke('notes:getByTitle', title),
  duplicateNote: (id: string) => ipcRenderer.invoke('notes:duplicate', id),

  // Mind Maps
  getMindMaps: () => ipcRenderer.invoke('mindmap:list'),
  getMindMap: (id: string) => ipcRenderer.invoke('mindmap:get', id),
  createMindMap: (name: string) => ipcRenderer.invoke('mindmap:create', name),
  renameMindMap: (id: string, name: string) => ipcRenderer.invoke('mindmap:rename', id, name),
  deleteMindMap: (id: string) => ipcRenderer.invoke('mindmap:delete', id),
  saveMindMap: (id: string, nodes: any[], edges: any[]) => ipcRenderer.invoke('mindmap:save', id, nodes, edges),

  // Habits
  getHabits: () => ipcRenderer.invoke('habits:list'),
  getHabit: (id: number) => ipcRenderer.invoke('habits:get', id),
  createHabit: (data: any) => ipcRenderer.invoke('habits:create', data),
  updateHabit: (id: number, data: any) => ipcRenderer.invoke('habits:update', id, data),
  deleteHabit: (id: number) => ipcRenderer.invoke('habits:delete', id),
  logHabit: (habitId: number, date: string, completed: boolean) => ipcRenderer.invoke('habits:log', habitId, date, completed),
  getHabitLogs: (habitId: number, startDate: string, endDate: string) => ipcRenderer.invoke('habits:logs', habitId, startDate, endDate),
  getHabitYearLogs: (habitId: number, year: number) => ipcRenderer.invoke('habits:yearLogs', habitId, year),
  getHabitStats: (habitId: number) => ipcRenderer.invoke('habits:stats', habitId),
  getWeeklyReview: () => ipcRenderer.invoke('habits:weeklyReview'),
  logPomodoroSession: (durationMinutes: number) => ipcRenderer.invoke('habits:pomodoroLog', durationMinutes),

  // Time Tracking
  startTimer:       (taskId, note)       => ipcRenderer.invoke('time:start', taskId, note),
  stopTimer:        (entryId)            => ipcRenderer.invoke('time:stop', entryId),
  stopRunningTimer: ()                   => ipcRenderer.invoke('time:stopRunning'),
  getRunningTimer:  ()                   => ipcRenderer.invoke('time:running'),
  getTaskTime:      (taskId, range)      => ipcRenderer.invoke('time:taskTime', taskId, range),
  getDailyReport:   (date)               => ipcRenderer.invoke('time:dailyReport', date),
  getWeeklyReport:  (startDate)          => ipcRenderer.invoke('time:weeklyReport', startDate),
  getTimeEntries:   (taskId)             => ipcRenderer.invoke('time:entries', taskId),
  deleteTimeEntry:  (id)                 => ipcRenderer.invoke('time:delete', id),
  updateTimeEntry:  (id, data)           => ipcRenderer.invoke('time:update', id, data),
  getTotalFocusToday: (date)             => ipcRenderer.invoke('time:totalToday', date),

  // Journal
  getJournalEntry:    (date)                    => ipcRenderer.invoke('journal:get', date),
  upsertJournalEntry: (date, data)              => ipcRenderer.invoke('journal:upsert', date, data),
  deleteJournalEntry: (date)                    => ipcRenderer.invoke('journal:delete', date),
  getJournalRange:    (start, end)              => ipcRenderer.invoke('journal:range', start, end),
  getJournalOnThisDay:(month, day, excludeDate) => ipcRenderer.invoke('journal:onThisDay', month, day, excludeDate),
  getJournalDailyStats:(date)                   => ipcRenderer.invoke('journal:dailyStats', date),
  getJournalSummaryReport:(start, end, criteria) => ipcRenderer.invoke('journal:summaryReport', start, end, criteria),

  // Links
  getLinks: (filters?) => ipcRenderer.invoke('links:list', filters),
  getLink: (id: number) => ipcRenderer.invoke('links:get', id),
  createLink: (data: any) => ipcRenderer.invoke('links:create', data),
  updateLink: (id: number, data: any) => ipcRenderer.invoke('links:update', id, data),
  deleteLink: (id: number) => ipcRenderer.invoke('links:delete', id),
  getLinkCategories: () => ipcRenderer.invoke('links:categories:list'),
  createLinkCategory: (name: string) => ipcRenderer.invoke('links:categories:create', name),
  deleteLinkCategory: (id: number) => ipcRenderer.invoke('links:categories:delete', id),

  // Flashcards
  getFlashcardDecks: () => ipcRenderer.invoke('flashcard:decks:list'),
  createFlashcardDeck: (name: string, description?: string) => ipcRenderer.invoke('flashcard:decks:create', name, description),
  updateFlashcardDeck: (id: number, data: any) => ipcRenderer.invoke('flashcard:decks:update', id, data),
  deleteFlashcardDeck: (id: number) => ipcRenderer.invoke('flashcard:decks:delete', id),
  getFlashcards: (deckId: number) => ipcRenderer.invoke('flashcard:list', deckId),
  createFlashcard: (deckId: number, front: string, back: string) => ipcRenderer.invoke('flashcard:create', deckId, front, back),
  updateFlashcard: (id: number, data: any) => ipcRenderer.invoke('flashcard:update', id, data),
  deleteFlashcard: (id: number) => ipcRenderer.invoke('flashcard:delete', id),
  reviewFlashcard: (id: number, quality: number) => ipcRenderer.invoke('flashcard:review', id, quality),
  getDueFlashcards: (deckId?: number) => ipcRenderer.invoke('flashcard:due', deckId),

  // Spreadsheets
  getSpreadsheets: () => ipcRenderer.invoke('spreadsheet:list'),
  getSpreadsheet: (id: number) => ipcRenderer.invoke('spreadsheet:get', id),
  createSpreadsheet: (name?: string) => ipcRenderer.invoke('spreadsheet:create', name),
  updateSpreadsheet: (id: number, data: { name?: string; data?: string }) => ipcRenderer.invoke('spreadsheet:update', id, data),
  deleteSpreadsheet: (id: number) => ipcRenderer.invoke('spreadsheet:delete', id),

  // Utilities
  showSaveDialog: (options: any) => ipcRenderer.invoke('util:showSaveDialog', options),
  writeBinaryFile: (filePath: string, data: number[]) => ipcRenderer.invoke('util:writeBinaryFile', filePath, data),
  closeWindow: () => ipcRenderer.invoke('app:closeWindow'),

  // Draw (BETA)
  getDrawDiagrams:   () => ipcRenderer.invoke('draw:list'),
  getDrawDiagram:    (id: string) => ipcRenderer.invoke('draw:get', id),
  createDrawDiagram: (name: string) => ipcRenderer.invoke('draw:create', name),
  renameDrawDiagram: (id: string, name: string) => ipcRenderer.invoke('draw:rename', id, name),
  deleteDrawDiagram: (id: string) => ipcRenderer.invoke('draw:delete', id),
  saveDrawDiagram:   (id: string, data: string) => ipcRenderer.invoke('draw:save', id, data),
  getDrawioUrl:      () => 'drawio://app/index.html?client=1&proto=json',

  // Ideas
  getIdeas: (filters?) => ipcRenderer.invoke('ideas:list', filters),
  getIdea: (id) => ipcRenderer.invoke('ideas:get', id),
  createIdea: (data) => ipcRenderer.invoke('ideas:create', data),
  updateIdea: (id, data) => ipcRenderer.invoke('ideas:update', id, data),
  deleteIdea: (id) => ipcRenderer.invoke('ideas:delete', id),
  getRecentIdeas: (limit?) => ipcRenderer.invoke('ideas:recent', limit),
  getIdeaDocuments: (ideaId) => ipcRenderer.invoke('ideas:documents:list', ideaId),
  addIdeaDocument: (ideaId, filename, data, mimeType) => ipcRenderer.invoke('ideas:documents:add', ideaId, filename, data, mimeType),
  deleteIdeaDocument: (id) => ipcRenderer.invoke('ideas:documents:delete', id),
  getIdeaUpdates: (ideaId) => ipcRenderer.invoke('ideas:updates:list', ideaId),
  addIdeaUpdate: (ideaId, content, updateType) => ipcRenderer.invoke('ideas:updates:add', ideaId, content, updateType),
  getIdeaTags: (ideaId) => ipcRenderer.invoke('ideas:tags:get', ideaId),
  addTagToIdea: (ideaId, tagId) => ipcRenderer.invoke('ideas:tags:add', ideaId, tagId),
  removeTagFromIdea: (ideaId, tagId) => ipcRenderer.invoke('ideas:tags:remove', ideaId, tagId),

  // Focus Mode
  toggleFocus: () => ipcRenderer.invoke('focus:toggle'),

  // AI Chat
  getConversations: () => ipcRenderer.invoke('ai:chat:conversations:list'),
  createConversation: (provider?: string, model?: string, apiKey?: string) => ipcRenderer.invoke('ai:chat:conversations:create', provider, model, apiKey),
  deleteConversation: (id: number) => ipcRenderer.invoke('ai:chat:conversations:delete', id),
  renameConversation: (id: number, title: string) => ipcRenderer.invoke('ai:chat:conversations:rename', id, title),
  updateConversationConfig: (id: number, provider: string, model: string, apiKey: string) => ipcRenderer.invoke('ai:chat:conversations:updateConfig', id, provider, model, apiKey),
  getMessages: (id: number) => ipcRenderer.invoke('ai:chat:messages:list', id),
  sendChatMessage: (conversationId: number, message: string) => ipcRenderer.send('ai:chat:send', { conversationId, message }),
  retryChatMessage: (conversationId: number) => ipcRenderer.send('ai:chat:retry', { conversationId }),
  cancelChat: (conversationId: number) => ipcRenderer.send('ai:chat:cancel', conversationId),
  onChatChunk: (callback: (data: any) => void) => {
    const handler = (_e: any, data: any) => callback(data)
    ipcRenderer.on('ai:chat:chunk', handler)
    return () => ipcRenderer.removeListener('ai:chat:chunk', handler)
  },
  getAiConfig: () => ipcRenderer.invoke('ai:chat:config:get'),
  setAiConfig: (config: any) => ipcRenderer.invoke('ai:chat:config:set', config),
  getOllamaModels: () => ipcRenderer.invoke('ai:chat:ollama-models'),
})
