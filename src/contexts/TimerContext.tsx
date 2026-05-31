import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { TimeEntry } from '../types/models'

interface TimerContextType {
  runningEntry: TimeEntry | null
  elapsed: number
  startTimer: (taskId: number) => Promise<void>
  stopTimer: () => Promise<void>
}

const TimerContext = createContext<TimerContextType>({
  runningEntry: null,
  elapsed: 0,
  startTimer: async () => {},
  stopTimer: async () => {},
})

export function TimerProvider({ children }: { children: ReactNode }) {
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rehydrate on mount — recover state after app restart
  useEffect(() => {
    window.electronAPI.getRunningTimer().then(entry => {
      if (entry) {
        setRunningEntry(entry)
        const secondsElapsed = Math.floor(
          (Date.now() - new Date(entry.start_time).getTime()) / 1000
        )
        setElapsed(secondsElapsed)
      }
    }).catch(() => {})
  }, [])

  // Tick every second while a timer is running
  useEffect(() => {
    if (runningEntry) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setElapsed(0)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [runningEntry?.id])

  const startTimer = useCallback(async (taskId: number) => {
    const entry = await window.electronAPI.startTimer(taskId)
    setRunningEntry(entry)
    setElapsed(0)
  }, [])

  const stopTimer = useCallback(async () => {
    await window.electronAPI.stopRunningTimer()
    setRunningEntry(null)
    setElapsed(0)
  }, [])

  return (
    <TimerContext.Provider value={{ runningEntry, elapsed, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  return useContext(TimerContext)
}
