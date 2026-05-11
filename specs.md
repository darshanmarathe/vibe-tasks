# Vibe Tasks 

## Vibe tasks is a desktop based Task management Application 

## Tech Stack
1. Electron
2. React
3. SQLite
4. Node.js
5. Syncfusion Controls
6. Good Admin Template 
7. Tailwind CSS

## UI 
1. Dashboard 
2. Task List With Quick Add
3. Kanban Board
4. Settings
  a. Users 
  b. Projects
  c. Status 
  d. Priority
5. Floating Pomodorrow timer visible accross screens 
  6. Should be able to change the profit 
  7. Should play a nice sound 
  8. Should Show Desktop Notification


## Models 
1. User { id: number, name: string, email: string }
2. Project { id: number, name: string, description: string }
3. Task { id: number, name: string, description: string, status: string, priority: string, projectId: number }
4. Status { id: number, name: string }
5. Priority { id: number, name: string }



## Change Requests — ✅ Implemented
  1. ✅ Dark/Light Mode — Theme toggle in sidebar, persists to localStorage, CSS variables for both themes
  2. ✅ Date Detection — Natural language date parser integrated into Quick Add:
     - `tomorrow` → sets dueDate to tomorrow
     - `in next X days` → dueDate X days from now
     - `next week` → dueDate 7 days from now
     - `next 2 weeks` → dueDate 14 days from now
     - `next 1 month` → dueDate 1 month from now
     - `next (n) month` → dueDate n months from now
  3. ✅ dueDate column added to tasks table, displayed in Task List & Kanban
  4. ✅ Add some charts to the dashboard — SVG bar chart (tasks by status) + SVG donut chart (tasks by priority)
  5. ✅ Add a calendar view to the dashboard — month grid with dots for tasks due each day, overdue highlighted
  6. ✅ Edit mode for tasks — click any task row to open a modal editor (name, status, priority, project, due date)
  7. ✅ Status ordering — `ord` column added, ▲/▼ buttons in Settings > Statuses to reorder, Kanban reflects order
  8. ✅ Kanban board reflects the statuses — dynamically loads all statuses in order
  9. ✅ Pomodoro timer shows desktop notification on complete — uses `new Notification()` + Electron Notification API
  10. ✅ Background (minimize) and close (✕) buttons added to pomodoro timer title bar
  11. ✅ Calendar day click — clicking a day shows tasks due that day in a 50/50 split (left=calendar, right=tasks)
   12. ✅ Have placed xylophone.mp3 in the same folder use it to play after pomodorrow is done 
   13. ✅ Show me where is the db located in setting allow to pick it from diffrent locations
   14. ✅ Give priority color — color field added to priorities, color picker in Settings, colored bars on Task List rows and Kanban cards
   15. ✅ Create a Inbox Route — all tasks displayed, next-2-days section at top, filterable by status and priority
   16. ✅ Make the sidebar collapsable — ◀/▶ toggle, persists to localStorage, icons-only mode with tooltips
   17. ✅ Bump up the version (1.1.0), added About screen with credits to Darshan Marathe and OpenCode


   ### Release 1.1.2 ✅
   1. ✅ Tree grid — Task List grouped by project with expandable/collapsible sections
   2. ✅ Notes field — Markdown textarea with preview toggle, stored per task
   3. ✅ Task dependencies — Predecessor/Successor picker modal with search, checkbox selection, and linked display

### Release 1.1.3 ✅
  1. ✅ Kanban card click — opens detail modal showing task name, status, priority, project, due date, Markdown notes preview, and predecessor/successor dependencies

   ## Bugs

   1. ✅ Pomodoro timer now inherits theme — uses IPC to read active theme from config, applies light/dark CSS variables
   2. ✅ Title bar overlay now matches active theme — reads theme from config on launch, updates dynamically when toggling
   3. ✅ App now opens in Maximized mode — `mainWindow.maximize()` called after window creation
