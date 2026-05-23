import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useState } from 'react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/inbox', label: 'Inbox', icon: '📥' },
  { path: '/notes', label: 'Notes', icon: '📝' },
  { path: '/mindmap', label: 'Mind Map', icon: '🧠' },
  { path: '/tasks', label: 'Tasks', icon: '📋' },
  { path: '/kanban', label: 'Kanban', icon: '📌' },
  { path: '/archived', label: 'Archived', icon: '📦' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
  { path: '/about', label: 'About', icon: 'ℹ️' },
]

export default function Layout() {
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('vibe-sidebar-collapsed') === 'true'
  })

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('vibe-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <aside
        style={{ backgroundColor: 'var(--bg-secondary)', borderRightColor: 'var(--border)', width: collapsed ? '56px' : '240px' }}
        className="flex flex-col border-r transition-all duration-200"
      >
        <div className="h-10 flex items-center justify-between px-3 shrink-0" style={{ color: 'var(--text-primary)', WebkitAppRegion: 'drag' } as any}>
          {!collapsed && <span className="font-bold text-lg">Vibe Tasks</span>}
          <button
            onClick={toggleCollapsed}
            className="rounded-lg transition-colors shrink-0 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', width: '24px', height: '24px', WebkitAppRegion: 'no-drag' } as any}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="text-sm">{collapsed ? '▶' : '◀'}</span>
          </button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
              })}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 pb-4 space-y-1">
          <button
            onClick={() => window.electronAPI.togglePomodoro()}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm w-full transition-colors`}
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            title={collapsed ? 'Pomodoro' : undefined}
          >
            <span>⏱</span>
            {!collapsed && <span>Pomodoro</span>}
          </button>
          <button
            onClick={toggleTheme}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm w-full transition-colors`}
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
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
