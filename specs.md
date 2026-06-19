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


  ### Release 1.2.0 ✅
  1. ✅ Edit tasks in the inbox mode — click-to-edit modal with all fields
  2. ✅ Line chart on dashboard — Tasks Due Per Day (next 30 days)
  3. ✅ Theme from OS detection via prefers-color-scheme, persisted per user, Settings seed function
  4. ✅ Dashboard > Recent Tasks > Edit option — click row to open edit modal
  5. ✅ Theme changes pushed to Pomodoro window via IPC theme:changed channel
  6. ✅ today keyword recognised, default dueDate set to today when no keyword matched
  7. ✅ Inbox All Tasks table sortable — click-to-toggle-sort with ▲/▼ indicators
  8. ✅ Task Description field added to all edit modals (Dashboard, TaskList, Inbox, Kanban detail)
  9. ✅ Email icon (📧) on each card/row — mailto: with subject=task name, body=description
  10. ✅ Archive capability — archive/unarchive, Archived page with Restore button
  11. ✅ Pomodoro alarm loops every 3s with Stop Alarm button to dismiss
  12. ✅ Single instance lock — second instance focuses existing window and quits


  ### Release 1.2.1 ✅
  1. ✅ Line chart removed from Dashboard, Tasks by Priority is now a full pie chart (no donut hole)
  2. ✅ Quick Add form added to Dashboard where the line chart was
  3. ✅ assignedTo column added to tasks — users selectable from Settings > Users, displayed on all task grids
  4. ✅ Email icon (📧) on Kanban cards, Dashboard Recent Tasks, Inbox, TaskList grid — mailto: assigned user's email with subject=name, body=description
  5. ✅ Archive/Unarchive — Archived page with Restore button; archive ✕ 📦 buttons on Dashboard, TaskList, Inbox, Kanban detail
  6. ✅ Dashboard :: Tasks by Priority :: Pie chart now uses dynamic priority colors from database matching theme
  7. Add a completion percentage feild to task from 0% to 100% on kanban board add a small progress bar to task cards and on the Task detail page On Task grids add a completion percentage column with progress bar

  ### Release 1.3.0 ✅
  1. ✅ Kanban Board >> Dont Show the Progress bar when its on 0%
  2. ✅ Add option to delete in Archive Page Select and delete 
  3. ✅ Remove Delete button replace it with Archive button everywhere except on archive Page 
  4. ✅ @Build.bat Make sure vibetasks.exe is not running if running kill it 
  5. ✅ About Page :: Icon is not visible — replaced with inline SVG
  6. ✅ Can we open browser from the author and opencode Links instead of new electron window — via shell.openExternal IPC
  7. ✅ Add link to GitHub Link of Darshan Marathe
  8. ✅ Add A link to GitHub Repository of VibeTasks 
  9. ✅ Kanban board > Add Task Button > Which opens full form like edit form with save / cancel 
  10. ✅ Archive button should have confirm option — window.confirm added to all archive buttons
  11. ✅ add a search functionality in task menu  
  13. ✅ Bug :: Task grid :: Rows are not occupying 100% — fixed colSpan from 8→9
  14. ✅ Bug :: Inbox :: All Tasks :: Completion Percent not visible — added missing column
  15. ✅ Notes section with notebooks, dual-mode Markdown editor, auto-save, and search

  ### Release 1.4.0 ✅
  1. ✅ Added Ctrl + and Ctrl - for zooming in/out
  2. ✅Added Notes Managerment section


    ### Release 1.4.1 ✅
  1. ✅ Notes WUSWUG Editor
  2. ✅ Few notes bugs fixed

  ### Release 1.4.2 ✅
  1. ✅ Mind Map — Interactive canvas with ReactFlow
  2. ✅ Create, drag, connect nodes with colors and emoji
  3. ✅ Auto-save nodes and edges to SQLite
  4. ✅ Sidebar listing saved mind maps
  5. ✅ Toolbar for adding nodes, editing labels/colors/emoji
  6. ✅ CTRL+Click or drag to connect, Delete key to remove
  7. ✅ Emoji picker — visual grid of 32 emojis for node icons
  8. ✅ Context menu — right-click any node for Edit / Delete
  
   ### Release 1.4.3 ✅
   1. ✅ MiniMap — corner overview panel with viewport highlight
   2. ✅ Export — PNG, SVG, and Markdown outline
   3. ✅ Undo / Redo — Ctrl+Z / Ctrl+Shift+Z with 50-step stack
   4. ✅ Auto Layout — one-click dagre tree/radial layout
   5. ✅ Expand / Collapse — collapse node branches with +N badge
   6. ✅ Emoji visibility — 2x emoji size on nodes
  
  ### Release 1.4.4 ✅
  1. ✅ Node Notes — per-node textarea panel with auto-save
  2. ✅ Node Images — file picker → base64 storage → inline display
  3. ✅ Edge Labels — right-click edge → label input → renders on edge
  4. ✅ Dashed / Styled Edges — right-click toggle solid/dashed
  5. ✅ Search / Filter — toolbar input dims/highlights nodes
  6. ✅ Markdown Import — parse heading hierarchy into nodes+edges
  7. ✅ Wheel Zoom Speed — dropdown selector (0.5x–3x)
  8. ✅ Bug fix — duplicate color/emoji pickers hidden when node selected to avoid confusion
  9. ✅ Bug fix — context menu Notes now selects the node first before opening the panel
  
   ## Bugs

   1. ✅ Pomodoro timer now inherits theme — uses IPC to read active theme from config, applies light/dark CSS variables
   2. ✅ Title bar overlay now matches active theme — reads theme from config on launch, updates dynamically when toggling
   3. ✅ App now opens in Maximized mode — `mainWindow.maximize()` called after window creation
    4. ✅ Tasks by Priority :: Pie chart now uses Syncfusion AccumulationChart with dynamic priority colors

  ### Release 1.6.0 ✅
  1. ✅ Time Tracking — Start/stop timer per task with live MM:SS counter on task rows
  2. ✅ TimerContext — Global React context with restart recovery (rehydrates from DB on app launch)
  3. ✅ TimerBadge component — Reusable HH:MM:SS / MM:SS display, used across all views
  4. ✅ Global timer bar in sidebar — shows running task name, elapsed time, ⏹ stop and 🎯 focus buttons
  5. ✅ 🔥 Logged time badge on Tasks page — shows total time logged per task (e.g. 🔥 1h 23m)
  6. ✅ 🔥 Logged time badge on Inbox — upcoming cards + All Tasks table column
  7. ✅ 🔥 Logged time badge on Dashboard — Recent Tasks table column
  8. ✅ 🔥 Logged time badge on Kanban — shown on each card below completion bar
  9. ✅ Focus Mode overlay — always-on-top frameless window with task name, elapsed time, progress bar toward 2h daily goal
  10. ✅ Time Reports page — daily/weekly views, edit/delete entries, CSV export
  11. ✅ Dashboard — Today's Focus Time card with per-task breakdown bars
  12. ✅ Pomodoro integration — session complete auto-stops running timer and logs duration
  13. ✅ time_entries table with indexes — migration added to DB init chain

   ### Release 1.6.2 ✅
   1. ✅ Daily Journal — mood picker, went well / to improve, wins & losses, quick notes
   2. ✅ On This Day — past entries for same calendar date in previous years
   3. ✅ Journal Summary Report — date range, inclusion criteria, Markdown export
   4. ✅ Dashboard journal card and Weekly Review journal-days stat
   5. ✅ Native splash screen (3s branding on cold start)
   6. ✅ journal_entries table with wins/losses columns — migration in DB init chain

   ### Release 1.11.1 ✅
   1. ✅ Quick add fields (Status, Priority, Project, Assigned To) retain their selected values between adds — no need to re-select for consecutive entries
   2. ✅ Focus returns to Task Name input after quick add for rapid consecutive entry (no more clicking back into the field)
   3. ✅ Kanban board add task modal uses active project filter as default project
   4. ✅ Dashboard calendar — clicking a date pre-fills the due date and focuses the quick add input
   5. ✅ Calendar page — clicking a day number opens an add task modal with the date pre-filled as the due date
   6. ✅ QR codes — generic 📱 icon in links table and dashboard quick links; clicking opens a modal with a large scannable QR code (via qrcode library)
   7. ✅ QR scanning — "Scan" button next to URL input in add form; opens camera modal to scan a QR code and auto-fills the URL
