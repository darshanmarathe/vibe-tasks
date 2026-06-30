import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { TimerProvider } from './contexts/TimerContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TaskList from './pages/TaskList'
import Archived from './pages/Archived'
import Completed from './pages/Completed'
import KanbanBoard from './pages/KanbanBoard'
import Inbox from './pages/Inbox'
import About from './pages/About'
import Calendar from './pages/Calendar'
import ExportImport from './pages/ExportImport'
import Flashcards from './pages/Flashcards'
import Notes from './pages/Notes'
import MindMap from './pages/MindMap'
import Diagrams from './pages/Diagrams'
import Draw from './pages/Draw'
import Links from './pages/Links'
import Spreadsheets from './pages/Spreadsheets'
import Habits from './pages/Habits'
import WeeklyReview from './pages/WeeklyReview'
import Settings from './pages/Settings/Settings'
import TimeReports from './pages/TimeReports'
import DailyJournal from './pages/DailyJournal'
import AiChat from './pages/AiChat'

export default function App() {
  return (
    <ThemeProvider>
      <TimerProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/mindmap" element={<MindMap />} />
              <Route path="/diagrams" element={<Diagrams />} />
              <Route path="/draw" element={<Draw />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/weekly-review" element={<WeeklyReview />} />
              <Route path="/kanban" element={<KanbanBoard />} />
              <Route path="/calendar" element={<Calendar />} />
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
              <Route path="/about" element={<About />} />
            </Route>
          </Routes>
        </HashRouter>
      </TimerProvider>
    </ThemeProvider>
  )
}
