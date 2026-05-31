interface TimerBadgeProps {
  elapsed: number  // seconds
  className?: string
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatElapsedShort(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

export function TimerBadge({ elapsed, className = '' }: TimerBadgeProps) {
  return (
    <span
      className={`font-mono text-xs tabular-nums ${className}`}
      style={{ color: 'var(--accent)' }}
    >
      {formatElapsed(elapsed)}
    </span>
  )
}
