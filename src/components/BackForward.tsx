import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type NavState = { stack: string[]; pointer: number }

const SESSION_KEY = 'vibe-back-forward-stack'

function loadState(): NavState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (Array.isArray(p?.stack) && typeof p?.pointer === 'number') {
        return { stack: p.stack, pointer: p.pointer }
      }
    }
  } catch { /* ignore */ }
  return { stack: [], pointer: -1 }
}

function persist(state: NavState) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

export default function BackForward() {
  const location = useLocation()
  const navigate = useNavigate()
  const stateRef = useRef<NavState>(loadState())
  const [state, setState] = useState<NavState>(stateRef.current)
  const stepRef = useRef<'back' | 'forward' | null>(null)
  const firstRef = useRef(true)

  const commit = (next: NavState) => {
    stateRef.current = next
    persist(next)
    setState(next)
  }

  const goBack = () => {
    if (stateRef.current.pointer <= 0) return
    stepRef.current = 'back'
    navigate(-1)
  }

  const goForward = () => {
    if (stateRef.current.pointer >= stateRef.current.stack.length - 1) return
    stepRef.current = 'forward'
    navigate(1)
  }

  useEffect(() => {
    const path = location.pathname
    const s = stateRef.current

    if (firstRef.current) {
      firstRef.current = false
      const top = s.stack[s.pointer]
      if (!top || top !== path) {
        commit({ stack: [path], pointer: 0 })
      }
      return
    }

    const step = stepRef.current
    stepRef.current = null

    if (step === 'back') {
      commit({ ...s, pointer: Math.max(0, s.pointer - 1) })
      return
    }
    if (step === 'forward') {
      commit({ ...s, pointer: Math.min(s.stack.length - 1, s.pointer + 1) })
      return
    }

    if (s.stack[s.pointer] === path) return

    const earlier = s.stack.lastIndexOf(path, s.pointer)
    if (earlier >= 0) {
      commit({ ...s, pointer: earlier })
      return
    }
    const later = s.stack.indexOf(path, s.pointer + 1)
    if (later >= 0) {
      commit({ ...s, pointer: later })
      return
    }

    const stack = [...s.stack.slice(0, s.pointer + 1), path]
    commit({ stack, pointer: stack.length - 1 })
  }, [location.pathname])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const canBack = state.pointer > 0
  const canForward = state.pointer >= 0 && state.pointer < state.stack.length - 1

  const btnStyle = (enabled: boolean): CSSProperties => ({
    color: enabled ? 'var(--text-secondary)' : 'var(--text-muted)',
    opacity: enabled ? 1 : 0.4,
    cursor: enabled ? 'pointer' : 'default',
  })

  return (
    <div className="flex items-center gap-1 mr-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <button
        onClick={goBack}
        disabled={!canBack}
        title="Back (Alt+←)"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors"
        style={btnStyle(canBack)}
        onMouseEnter={e => { if (canBack) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        ◀
      </button>
      <button
        onClick={goForward}
        disabled={!canForward}
        title="Forward (Alt+→)"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors"
        style={btnStyle(canForward)}
        onMouseEnter={e => { if (canForward) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        ▶
      </button>
    </div>
  )
}