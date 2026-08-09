import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { TimerProvider } from './contexts/TimerContext'
import Layout from './components/Layout'
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const TaskList = lazy(() => import('./pages/TaskList'))
const Archived = lazy(() => import('./pages/Archived'))
const Completed = lazy(() => import('./pages/Completed'))
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'))
const Inbox = lazy(() => import('./pages/Inbox'))
const About = lazy(() => import('./pages/About'))
const Calendar = lazy(() => import('./pages/Calendar'))
const ExportImport = lazy(() => import('./pages/ExportImport'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Notes = lazy(() => import('./pages/Notes'))
const MindMap = lazy(() => import('./pages/MindMap'))
const Draw = lazy(() => import('./pages/Draw'))
const Links = lazy(() => import('./pages/Links'))
const Spreadsheets = lazy(() => import('./pages/Spreadsheets'))
const Habits = lazy(() => import('./pages/Habits'))
const Ideas = lazy(() => import('./pages/Ideas'))
const WeeklyReview = lazy(() => import('./pages/WeeklyReview'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const TimeReports = lazy(() => import('./pages/TimeReports'))
const DailyJournal = lazy(() => import('./pages/DailyJournal'))
const AiChat = lazy(() => import('./pages/AiChat'))
const GanttChart = lazy(() => import('./pages/GanttChart'))

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
      <div className="flex items-center gap-2 text-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current"></div>
        <span>Loading…</span>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <TimerProvider>
        <HashRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tasks" element={<TaskList />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/mindmap" element={<MindMap />} />
                <Route path="/draw" element={<Draw />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/weekly-review" element={<WeeklyReview />} />
                <Route path="/kanban" element={<KanbanBoard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/gantt" element={<GanttChart />} />
                <Route path="/completed" element={<Completed />} />
                <Route path="/data" element={<ExportImport />} />
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/archived" element={<Archived />} />
                <Route path="/time-reports" element={<TimeReports />} />
                <Route path="/journal" element={<DailyJournal />} />
                <Route path="/links" element={<Links />} />
                <Route path="/spreadsheets" element={<Spreadsheets />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/ai-chat" element={<AiChat />} />
                <Route path="/ideas" element={<Ideas />} />
                <Route path="/about" element={<About />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </TimerProvider>
    </ThemeProvider>
  )
}

export default App
