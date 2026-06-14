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
  getRecurringTasks: () => ipcRenderer.invoke('db:tasks:recurring'),
  generateNextOccurrence: (id) => ipcRenderer.invoke('db:tasks:generate-next', id),

  // Data Portability
  exportJson: () => ipcRenderer.invoke('db:export-json'),
  importJson: () => ipcRenderer.invoke('db:import-json'),
  exportTasksCsv: () => ipcRenderer.invoke('db:export-csv'),
  importTasksCsv: () => ipcRenderer.invoke('db:import-csv'),
  exportTaskShare: (taskId) => ipcRenderer.invoke('db:export-task-share', taskId),
  importShareLink: () => ipcRenderer.invoke('db:import-share-link'),

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
  setNotebookColor: (id, color) => ipcRenderer.invoke('notes:notebooks:setColor', id, color),
  getNotes: (notebookId, sortBy) => ipcRenderer.invoke('notes:list', notebookId, sortBy),
  getAllNotes: (sortBy) => ipcRenderer.invoke('notes:listAll', sortBy),
  getNoteById: (id) => ipcRenderer.invoke('notes:get', id),
  createNote: (notebookId, title) => ipcRenderer.invoke('notes:create', notebookId, title),
  saveNote: (id, title, content) => ipcRenderer.invoke('notes:save', id, title, content),
  trashNote: (id) => ipcRenderer.invoke('notes:trash', id),
  restoreNote: (id) => ipcRenderer.invoke('notes:restore', id),
  deleteNotePermanently: (id) => ipcRenderer.invoke('notes:delete', id),
  getTrashedNotes: () => ipcRenderer.invoke('notes:trashed'),
  searchNotes: (query) => ipcRenderer.invoke('notes:search', query),
  togglePin: (id) => ipcRenderer.invoke('notes:togglePin', id),
  getBacklinks: (title, excludeId) => ipcRenderer.invoke('notes:backlinks', title, excludeId),
  getAllTags: () => ipcRenderer.invoke('notes:tags:all'),
  getNoteTags: (noteId) => ipcRenderer.invoke('notes:tags:getForNote', noteId),
  addTagToNote: (noteId, tagId) => ipcRenderer.invoke('notes:tags:add', noteId, tagId),
  removeTagFromNote: (noteId, tagId) => ipcRenderer.invoke('notes:tags:remove', noteId, tagId),
  createTag: (name) => ipcRenderer.invoke('notes:tags:create', name),
  getNotesByTag: (tagId) => ipcRenderer.invoke('notes:tags:notesByTag', tagId),
  deleteTag: (id) => ipcRenderer.invoke('notes:tags:delete', id),
  searchNoteTitles: (query) => ipcRenderer.invoke('notes:searchTitles', query),
  exportNoteAsMarkdown: (id) => ipcRenderer.invoke('notes:exportMarkdown', id),
  openNotesHelp: () => ipcRenderer.invoke('notes:openHelp'),
  getRecentNotes: (limit) => ipcRenderer.invoke('notes:recent', limit),
  getNoteByTitle: (title) => ipcRenderer.invoke('notes:getByTitle', title),
  duplicateNote: (id) => ipcRenderer.invoke('notes:duplicate', id),

  // Mind Maps
  getMindMaps: () => ipcRenderer.invoke('mindmap:list'),
  getMindMap: (id) => ipcRenderer.invoke('mindmap:get', id),
  createMindMap: (name) => ipcRenderer.invoke('mindmap:create', name),
  renameMindMap: (id, name) => ipcRenderer.invoke('mindmap:rename', id, name),
  deleteMindMap: (id) => ipcRenderer.invoke('mindmap:delete', id),
  saveMindMap: (id, nodes, edges) => ipcRenderer.invoke('mindmap:save', id, nodes, edges),

  // Habits
  getHabits: () => ipcRenderer.invoke('habits:list'),
  getHabit: (id) => ipcRenderer.invoke('habits:get', id),
  createHabit: (data) => ipcRenderer.invoke('habits:create', data),
  updateHabit: (id, data) => ipcRenderer.invoke('habits:update', id, data),
  deleteHabit: (id) => ipcRenderer.invoke('habits:delete', id),
  logHabit: (habitId, date, completed) => ipcRenderer.invoke('habits:log', habitId, date, completed),
  getHabitLogs: (habitId, startDate, endDate) => ipcRenderer.invoke('habits:logs', habitId, startDate, endDate),
  getHabitYearLogs: (habitId, year) => ipcRenderer.invoke('habits:yearLogs', habitId, year),
  getHabitStats: (habitId) => ipcRenderer.invoke('habits:stats', habitId),
  getWeeklyReview: () => ipcRenderer.invoke('habits:weeklyReview'),
  logPomodoroSession: (durationMinutes) => ipcRenderer.invoke('habits:pomodoroLog', durationMinutes),

  // Time Tracking
  startTimer:         (taskId, note)  => ipcRenderer.invoke('time:start', taskId, note),
  stopTimer:          (entryId)       => ipcRenderer.invoke('time:stop', entryId),
  stopRunningTimer:   ()              => ipcRenderer.invoke('time:stopRunning'),
  getRunningTimer:    ()              => ipcRenderer.invoke('time:running'),
  getTaskTime:        (taskId, range) => ipcRenderer.invoke('time:taskTime', taskId, range),
  getDailyReport:     (date)          => ipcRenderer.invoke('time:dailyReport', date),
  getWeeklyReport:    (startDate)     => ipcRenderer.invoke('time:weeklyReport', startDate),
  getTimeEntries:     (taskId)        => ipcRenderer.invoke('time:entries', taskId),
  deleteTimeEntry:    (id)            => ipcRenderer.invoke('time:delete', id),
  updateTimeEntry:    (id, data)      => ipcRenderer.invoke('time:update', id, data),
  getTotalFocusToday: (date)          => ipcRenderer.invoke('time:totalToday', date),

  // Journal
  getJournalEntry:     (date)                    => ipcRenderer.invoke('journal:get', date),
  upsertJournalEntry:  (date, data)              => ipcRenderer.invoke('journal:upsert', date, data),
  deleteJournalEntry:  (date)                    => ipcRenderer.invoke('journal:delete', date),
  getJournalRange:     (start, end)              => ipcRenderer.invoke('journal:range', start, end),
  getJournalOnThisDay: (month, day, excludeDate) => ipcRenderer.invoke('journal:onThisDay', month, day, excludeDate),
  getJournalDailyStats:(date)                   => ipcRenderer.invoke('journal:dailyStats', date),
  getJournalSummaryReport:(start, end, criteria) => ipcRenderer.invoke('journal:summaryReport', start, end, criteria),

  // Links
  getLinks: (filters) => ipcRenderer.invoke('links:list', filters),
  getLink: (id) => ipcRenderer.invoke('links:get', id),
  createLink: (data) => ipcRenderer.invoke('links:create', data),
  updateLink: (id, data) => ipcRenderer.invoke('links:update', id, data),
  deleteLink: (id) => ipcRenderer.invoke('links:delete', id),
  getLinkCategories: () => ipcRenderer.invoke('links:categories:list'),
  createLinkCategory: (name) => ipcRenderer.invoke('links:categories:create', name),
  deleteLinkCategory: (id) => ipcRenderer.invoke('links:categories:delete', id),

  // Flashcards
  getFlashcardDecks: () => ipcRenderer.invoke('flashcard:decks:list'),
  createFlashcardDeck: (name, description) => ipcRenderer.invoke('flashcard:decks:create', name, description),
  updateFlashcardDeck: (id, data) => ipcRenderer.invoke('flashcard:decks:update', id, data),
  deleteFlashcardDeck: (id) => ipcRenderer.invoke('flashcard:decks:delete', id),
  getFlashcards: (deckId) => ipcRenderer.invoke('flashcard:list', deckId),
  createFlashcard: (deckId, front, back) => ipcRenderer.invoke('flashcard:create', deckId, front, back),
  updateFlashcard: (id, data) => ipcRenderer.invoke('flashcard:update', id, data),
  deleteFlashcard: (id) => ipcRenderer.invoke('flashcard:delete', id),
  reviewFlashcard: (id, quality) => ipcRenderer.invoke('flashcard:review', id, quality),
  getDueFlashcards: (deckId) => ipcRenderer.invoke('flashcard:due', deckId),

  // Spreadsheets
  getSpreadsheets: () => ipcRenderer.invoke('spreadsheet:list'),
  getSpreadsheet: (id) => ipcRenderer.invoke('spreadsheet:get', id),
  createSpreadsheet: (name) => ipcRenderer.invoke('spreadsheet:create', name),
  updateSpreadsheet: (id, data) => ipcRenderer.invoke('spreadsheet:update', id, data),
  deleteSpreadsheet: (id) => ipcRenderer.invoke('spreadsheet:delete', id),

  // Utilities
  showSaveDialog: (options) => ipcRenderer.invoke('util:showSaveDialog', options),
  writeBinaryFile: (filePath, data) => ipcRenderer.invoke('util:writeBinaryFile', filePath, data),

  // Focus Mode
  toggleFocus: () => ipcRenderer.invoke('focus:toggle'),

  // AI Chat
  getConversations: () => ipcRenderer.invoke('ai:chat:conversations:list'),
  createConversation: (provider, model, apiKey) => ipcRenderer.invoke('ai:chat:conversations:create', provider, model, apiKey),
  deleteConversation: (id) => ipcRenderer.invoke('ai:chat:conversations:delete', id),
  renameConversation: (id, title) => ipcRenderer.invoke('ai:chat:conversations:rename', id, title),
  updateConversationConfig: (id, provider, model, apiKey) => ipcRenderer.invoke('ai:chat:conversations:updateConfig', id, provider, model, apiKey),
  getMessages: (id) => ipcRenderer.invoke('ai:chat:messages:list', id),
  sendChatMessage: (conversationId, message) => ipcRenderer.send('ai:chat:send', { conversationId, message }),
  retryChatMessage: (conversationId) => ipcRenderer.send('ai:chat:retry', { conversationId }),
  cancelChat: (conversationId) => ipcRenderer.send('ai:chat:cancel', conversationId),
  onChatChunk: (callback) => {
    const handler = (_e, data) => callback(data)
    ipcRenderer.on('ai:chat:chunk', handler)
    return () => ipcRenderer.removeListener('ai:chat:chunk', handler)
  },
  getAiConfig: () => ipcRenderer.invoke('ai:chat:config:get'),
  setAiConfig: (config) => ipcRenderer.invoke('ai:chat:config:set', config),
  getOllamaModels: () => ipcRenderer.invoke('ai:chat:ollama-models'),
})
