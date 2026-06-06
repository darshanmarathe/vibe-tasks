import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useTimer } from '../contexts/TimerContext'
import { TimerBadge } from './TimerBadge'
import { useState } from 'react'

type NavItem  = { path: string; label: string; icon: string }
type NavGroup = { label?: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    items: [
      { path: '/dashboard',     label: 'Dashboard',    icon: '📊' },
      { path: '/inbox',         label: 'Inbox',        icon: '📥' },
      { path: '/tasks',         label: 'Tasks',        icon: '📋' },
      { path: '/kanban',        label: 'Kanban',       icon: '📌' },
      { path: '/calendar',     label: 'Calendar',    icon: '📅' },
      { path: '/archived',      label: 'Archived',     icon: '📦' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { path: '/flashcards',   label: 'Flashcards',  icon: '🃏' },
      { path: '/notes',         label: 'Notes',        icon: '📝' },
      { path: '/journal',       label: 'Journal',      icon: '📔' },
      { path: '/links',         label: 'Links',        icon: '🔗' },
      { path: '/habits',        label: 'Habits',       icon: '✅' },
      { path: '/mindmap',       label: 'Mind Map',     icon: '🧠' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { path: '/weekly-review', label: 'Review',       icon: '📊' },
      { path: '/time-reports',  label: 'Time Reports', icon: '⏱' },
    ],
  },
  {
    items: [
      { path: '/settings',      label: 'Settings',     icon: '⚙️' },
      { path: '/data',         label: 'Data',        icon: '💾' },
      { path: '/about',         label: 'About',        icon: 'ℹ️' },
    ],
  },
]

export default function Layout() {
  const { theme, toggleTheme } = useTheme()
  const { runningEntry, elapsed, stopTimer } = useTimer()
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('vibe-sidebar-collapsed') === 'true'
  )

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('vibe-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* ── Sidebar ── */}
      <aside
        style={{ backgroundColor: 'var(--bg-secondary)', borderRightColor: 'var(--border)', width: collapsed ? '56px' : '240px' }}
        className="flex flex-col border-r transition-all duration-200"
      >
        {/* Title bar */}
        <div
          className="h-10 flex items-center justify-between px-3 shrink-0"
          style={{ color: 'var(--text-primary)', WebkitAppRegion: 'drag' } as any}
        >
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

        {/* Nav groups */}
        <nav className="flex-1 px-2 py-3 overflow-x-hidden overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
              {/* Divider between groups */}
              {gi > 0 && (
                <div className="pt-2 pb-1">
                  <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                  {!collapsed && group.label && (
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-2 pb-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {group.label}
                    </p>
                  )}
                </div>
              )}

              {/* Nav items */}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
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
              </div>
            </div>
          ))}
        </nav>

        {/* Global timer bar — only shown when a timer is running */}
        {runningEntry && (
          <div
            className="mx-2 mb-2 px-3 py-2 rounded-lg border text-xs"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
          >
            {collapsed ? (
              <div className="flex flex-col items-center gap-1">
                <span style={{ color: 'var(--accent)' }}>▶</span>
                <TimerBadge elapsed={elapsed} />
                <button
                  onClick={stopTimer}
                  title="Stop timer"
                  className="text-xs rounded px-1"
                  style={{ color: 'var(--danger)' }}
                >
                  ⏹
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--accent)' }}>▶</span>
                  <span
                    className="truncate flex-1 font-medium"
                    style={{ color: 'var(--text-primary)' }}
                    title={runningEntry.task_name ?? ''}
                  >
                    {runningEntry.task_name ?? `Task #${runningEntry.task_id}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <TimerBadge elapsed={elapsed} />
                  <div className="flex gap-1">
                    <button
                      onClick={() => window.electronAPI.toggleFocus()}
                      title="Open Focus Mode"
                      className="px-1.5 py-0.5 rounded text-xs transition-colors"
                      style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      🎯
                    </button>
                    <button
                      onClick={stopTimer}
                      title="Stop timer"
                      className="px-1.5 py-0.5 rounded text-xs transition-colors"
                      style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      ⏹
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom actions */}
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

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header
          className="h-10 flex items-center px-4"
          style={{ backgroundColor: 'var(--bg-secondary)', borderBottomColor: 'var(--border)', borderBottomWidth: '1px', WebkitAppRegion: 'drag' } as any}
        />
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
