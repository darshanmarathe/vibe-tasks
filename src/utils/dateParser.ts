export function parseDateFromText(text: string): { cleaned: string; dueDate: string | null } {
  const lower = text.toLowerCase().trim()

  function todayStr(): string {
    return new Date().toISOString().slice(0, 10)
  }
  function daysFromNow(n: number): string {
    const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
  }
  function weeksFromNow(n: number): string {
    const d = new Date(); d.setDate(d.getDate() + n * 7); return d.toISOString().slice(0, 10)
  }
  function monthsFromNow(n: number): string {
    const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10)
  }

  const patterns: { regex: RegExp; compute: (match: RegExpMatchArray) => string }[] = [
    { regex: /^(.*?)\s+tomorrow\s*$/i, compute: (m) => { return daysFromNow(1) } },
    { regex: /^(.*?)\s+today\s*$/i, compute: (m) => { return todayStr() } },
    { regex: /^(.*?)\s+in\s+next\s+(\d+)\s+days?\s*$/i, compute: (m) => daysFromNow(parseInt(m[2])) },
    { regex: /^(.*?)\s+next\s+(\d+)\s+days?\s*$/i, compute: (m) => daysFromNow(parseInt(m[2])) },
    { regex: /^(.*?)\s+next\s+week\s*$/i, compute: (m) => daysFromNow(7) },
    { regex: /^(.*?)\s+next\s+(\d+)\s+weeks?\s*$/i, compute: (m) => weeksFromNow(parseInt(m[2])) },
    { regex: /^(.*?)\s+next\s+1\s+month\s*$/i, compute: (m) => monthsFromNow(1) },
    { regex: /^(.*?)\s+next\s+(\d+)\s+months?\s*$/i, compute: (m) => monthsFromNow(parseInt(m[2])) },
    { regex: /^(.*?)\s+in\s+next\s+(\d+)\s+months?\s*$/i, compute: (m) => monthsFromNow(parseInt(m[2])) },
  ]

  for (const pattern of patterns) {
    const match = lower.match(pattern.regex)
    if (match) {
      const dueDate = pattern.compute(match as RegExpMatchArray)
      return { cleaned: match[1].trim(), dueDate }
    }
  }

  return { cleaned: text, dueDate: todayStr() }
}
