export function parseDateFromText(text: string): { cleaned: string; dueDate: string | null } {
  const lower = text.toLowerCase().trim()

  // Match patterns like "do this thing tomorrow" or "do this thing in next 10 days"
  const patterns: { regex: RegExp; compute: () => string }[] = [
    {
      regex: /^(.*?)\s+tomorrow\s*$/i,
      compute: () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().slice(0, 10)
      },
    },
    {
      regex: /^(.*?)\s+in\s+next\s+(\d+)\s+days?\s*$/i,
      compute: (match: RegExpMatchArray) => {
        const n = parseInt(match[2])
        const d = new Date()
        d.setDate(d.getDate() + n)
        return d.toISOString().slice(0, 10)
      },
    },
    {
      regex: /^(.*?)\s+next\s+(\d+)\s+days?\s*$/i,
      compute: (match: RegExpMatchArray) => {
        const n = parseInt(match[2])
        const d = new Date()
        d.setDate(d.getDate() + n)
        return d.toISOString().slice(0, 10)
      },
    },
    {
      regex: /^(.*?)\s+next\s+week\s*$/i,
      compute: () => {
        const d = new Date()
        d.setDate(d.getDate() + 7)
        return d.toISOString().slice(0, 10)
      },
    },
    {
      regex: /^(.*?)\s+next\s+(\d+)\s+weeks?\s*$/i,
      compute: (match: RegExpMatchArray) => {
        const n = parseInt(match[2])
        const d = new Date()
        d.setDate(d.getDate() + n * 7)
        return d.toISOString().slice(0, 10)
      },
    },
    {
      regex: /^(.*?)\s+next\s+1\s+month\s*$/i,
      compute: () => {
        const d = new Date()
        d.setMonth(d.getMonth() + 1)
        return d.toISOString().slice(0, 10)
      },
    },
    {
      regex: /^(.*?)\s+next\s+(\d+)\s+months?\s*$/i,
      compute: (match: RegExpMatchArray) => {
        const n = parseInt(match[2])
        const d = new Date()
        d.setMonth(d.getMonth() + n)
        return d.toISOString().slice(0, 10)
      },
    },
    {
      regex: /^(.*?)\s+in\s+next\s+(\d+)\s+months?\s*$/i,
      compute: (match: RegExpMatchArray) => {
        const n = parseInt(match[2])
        const d = new Date()
        d.setMonth(d.getMonth() + n)
        return d.toISOString().slice(0, 10)
      },
    },
  ]

  for (const pattern of patterns) {
    const match = lower.match(pattern.regex)
    if (match) {
      const dueDate = pattern.compute(match)
      return { cleaned: match[1].trim(), dueDate }
    }
  }

  return { cleaned: text, dueDate: null }
}
