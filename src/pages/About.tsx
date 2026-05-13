import { useEffect, useState } from 'react'

export default function About() {
  const [version, setVersion] = useState('...')

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion)
  }, [])

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>About</h1>

      <div className="rounded-xl p-6 border space-y-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <img src="assets/icon.svg" alt="Vibe Tasks" width="48" height="48" />
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Vibe Tasks</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Version {version}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Desktop Task Management Application</p>
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Credits</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>DM</div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  <a href="https://github.com/darshanmarathe" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                    Darshan Marathe
                  </a>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Developer & Designer</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>OC</div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                    OpenCode
                  </a>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI-powered coding assistant</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {['Electron', 'React', 'TypeScript', 'SQLite', 'Tailwind CSS', 'Vite', 'Node.js'].map(tech => (
              <span key={tech} className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} Darshan Marathe. Built with open source tools and AI assistance.
          </p>
        </div>
      </div>
    </div>
  )
}