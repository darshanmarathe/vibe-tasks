import { useEffect, useState } from 'react'

export default function DatabaseTab() {
  const [dbPath, setDbPath] = useState('')

  useEffect(() => {
    window.electronAPI.getDbPath().then(setDbPath)
  }, [])

  const handlePick = async () => {
    const newPath = await window.electronAPI.pickDbPath()
    if (newPath) {
      setDbPath(newPath)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Current Database Location
        </p>
        <div
          className="w-full rounded-lg px-3 py-2 text-sm border font-mono"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            wordBreak: 'break-all',
          }}
        >
          {dbPath || 'Loading...'}
        </div>
      </div>

      <button
        onClick={handlePick}
        className="px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        Change Database Location
      </button>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Note: Changing the database location will save the current data to the new location.
        The app may reload after selecting a new file.
      </p>
    </div>
  )
}
