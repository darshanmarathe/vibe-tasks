export const MOOD_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Awful' },
  { value: 2, emoji: '😕', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
] as const

export function moodEmoji(mood: number | null | undefined): string {
  if (!mood) return ''
  return MOOD_OPTIONS.find(m => m.value === mood)?.emoji ?? ''
}

interface MoodPickerProps {
  value: number | null
  onChange: (mood: number) => void
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div>
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>How was your day?</p>
      <div className="flex gap-2">
        {MOOD_OPTIONS.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => onChange(opt.value)}
              className="w-11 h-11 rounded-xl text-2xl transition-all border"
              style={{
                backgroundColor: selected ? 'var(--accent)' : 'var(--bg-hover)',
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                opacity: selected ? 1 : 0.7,
                transform: selected ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {opt.emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}
