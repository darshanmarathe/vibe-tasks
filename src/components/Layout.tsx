import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/tasks', label: 'Tasks', icon: '📋' },
  { path: '/kanban', label: 'Kanban', icon: '📌' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <aside style={{ backgroundColor: 'var(--bg-secondary)', borderRightColor: 'var(--border)' }} className="w-60 flex flex-col border-r">
        <div className="h-10 flex items-center px-4 font-bold text-lg" style={{ color: 'var(--text-primary)', WebkitAppRegion: 'drag' } as any}>
          Vibe Tasks
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
              })}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-2 pb-4 space-y-1">
          <button
            onClick={() => window.electronAPI.togglePomodoro()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>⏱</span>
            <span>Pomodoro</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-10 flex items-center px-4" style={{ backgroundColor: 'var(--bg-secondary)', borderBottomColor: 'var(--border)', borderBottomWidth: '1px', WebkitAppRegion: 'drag' } as any} />
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
