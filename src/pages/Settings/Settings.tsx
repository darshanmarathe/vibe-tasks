import { useState } from 'react'
import UsersTab from './UsersTab'
import ProjectsTab from './ProjectsTab'
import StatusTab from './StatusTab'
import PriorityTab from './PriorityTab'
import DatabaseTab from './DatabaseTab'
import LinkCategoriesTab from './LinkCategoriesTab'

const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'projects', label: 'Projects' },
  { id: 'statuses', label: 'Statuses' },
  { id: 'priorities', label: 'Priorities' },
  { id: 'linkCategories', label: 'Link Categories' },
  { id: 'database', label: 'Database' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      <div className="flex gap-1 rounded-xl p-1 border w-fit" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'statuses' && <StatusTab />}
        {activeTab === 'priorities' && <PriorityTab />}
        {activeTab === 'linkCategories' && <LinkCategoriesTab />}
        {activeTab === 'database' && <DatabaseTab />}
      </div>
    </div>
  )
}
