import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TaskList from './pages/TaskList'
import Archived from './pages/Archived'
import KanbanBoard from './pages/KanbanBoard'
import Inbox from './pages/Inbox'
import About from './pages/About'
import Notes from './pages/Notes'
import MindMap from './pages/MindMap'
import Habits from './pages/Habits'
import WeeklyReview from './pages/WeeklyReview'
import Settings from './pages/Settings/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/mindmap" element={<MindMap />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/weekly-review" element={<WeeklyReview />} />
            <Route path="/kanban" element={<KanbanBoard />} />
            <Route path="/archived" element={<Archived />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
