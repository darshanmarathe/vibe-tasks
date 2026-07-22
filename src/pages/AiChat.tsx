import { useState, useEffect, useRef, useCallback } from 'react'

interface Conversation { id: number; title: string; provider: string; model: string | null; api_key: string; system_prompt: string; temperature: number; max_tokens: number; created_at: string; updated_at: string }
interface ChatMsg { id: number; conversation_id: number; role: string; content: string; pinned: number; created_at: string }
interface AiConfig { provider: string; apiKey: string; model: string; systemPrompt?: string; temperature?: number; maxTokens?: number }

const PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'groq', label: 'Groq (Cloud)' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'opencode', label: 'OpenCode (Zen)' },
  { value: 'opencode-go', label: 'OpenCode Go' },
]

const GEMINI_MODELS = [
  // Latest Generation
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  // Stable Generation (Updates existing 2.5 list)
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro-exp-03-25', label: 'Gemini 2.5 Pro (Experimental)' },
]

const GROQ_MODELS = [
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B IT' },
  { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B' },
]

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'o3', label: 'o3' },
  { value: 'o4-mini', label: 'o4-mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
]

const MISTRAL_MODELS = [
  { value: 'mistral-large-latest', label: 'Mistral Large' },
  { value: 'mistral-small-latest', label: 'Mistral Small' },
  { value: 'codestral-latest', label: 'Codestral' },
  { value: 'ministral-3b-latest', label: 'Ministral 3B' },
]

const KW_JS = 'async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield'
const KW_TS = 'abstract|any|as|asserts|boolean|declare|enum|implements|interface|keyof|module|namespace|never|number|private|protected|public|readonly|record|string|symbol|type|unknown|infer|satisfies|using'
const KW_PY = 'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|self|cls|super|print|len|range|type|int|float|str|bool|dict|list|set|tuple|map|filter|reduce|__init__|__str__|__repr__|__name__|__main__'
const KW_RS = 'Self|as|async|await|box|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|macro_rules|match|mod|move|mut|pub|ref|return|self|static|struct|super|trait|true|type|unsafe|use|where|while|Some|None|Ok|Err|Option|Result|String|Vec|HashMap|bool|i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|char|str|println|format'
const KW_GO = 'append|bool|break|byte|cap|chan|close|complex64|complex128|const|continue|copy|default|defer|delete|else|error|fallthrough|false|float32|float64|for|func|go|goto|if|int|int8|int16|int32|int64|interface|iota|len|make|map|new|nil|panic|print|println|package|range|recover|return|select|string|struct|switch|true|type|uint|uint8|uint16|uint32|uint64|var|rune'
const KW_SQL = 'ALL|ALTER|AND|AS|ASC|AVG|BETWEEN|BIGINT|BOOLEAN|BY|CASCADE|CASE|COUNT|CREATE|CROSS|DATE|DECIMAL|DELETE|DESC|DISTINCT|DOUBLE|DROP|ELSE|END|EXISTS|FLOAT|FOREIGN|FROM|GROUP|HAVING|IN|INDEX|INNER|INSERT|INT|INTEGER|INTO|IS|JOIN|KEY|LEFT|LIKE|LIMIT|MAX|MIN|NOT|NULL|OFFSET|ON|OR|ORDER|OUTER|PRIMARY|REFERENCES|RIGHT|SELECT|SET|SMALLINT|SUM|TABLE|TEXT|THEN|TIMESTAMP|TRUE|UNION|UPDATE|VARCHAR|VALUES|VIEW|WHEN|WHERE'
const KW_CS = 'abstract|as|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|get|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|set|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|value|var|virtual|void|volatile|while|yield|Task|async|await|var|dynamic|string|int|bool|float|double|decimal|char|byte|long|short|object|Console|StringBuilder|IEnumerable|IQueryable|Dictionary|List|Tuple|Action|Func|Exception'
const KW_JSX = 'className|onClick|onChange|onSubmit|onKeyDown|onBlur|onFocus|onMouseEnter|onMouseLeave|useState|useEffect|useRef|useCallback|useMemo|useReducer|useContext|useImperativeHandle|useLayoutEffect|React|useTransition|useDeferredValue|useSyncExternalStore|useOptimistic|useActionState'
const KW_TSX = `${KW_JSX}|JSX|FC|ReactNode|ReactElement|ReactPortal|RefObject|RefCallback|SetStateAction|Dispatch|MouseEvent|KeyboardEvent|ChangeEvent|FormEvent|FocusEvent`

const KW_BY_LANG: Record<string, string> = {
  javascript: KW_JS,
  js: KW_JS,
  jsx: `${KW_JS}|${KW_JSX}`,
  typescript: `${KW_JS}|${KW_TS}`,
  ts: `${KW_JS}|${KW_TS}`,
  tsx: `${KW_JS}|${KW_TS}|${KW_TSX}`,
  python: KW_PY,
  py: KW_PY,
  rust: KW_RS,
  rs: KW_RS,
  go: KW_GO,
  golang: KW_GO,
  sql: KW_SQL,
  csharp: KW_CS,
  cs: KW_CS,
  'c#': KW_CS,
}

function highlightCode(code: string, lang: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const tokens: string[] = []
  const encodeTokenIndex = (index: number) =>
    String(index).split('').map(ch => String.fromCharCode(0xe100 + Number(ch))).join('')
  const decodeTokenIndex = (encoded: string) =>
    Number([...encoded].map(ch => String(ch.charCodeAt(0) - 0xe100)).join(''))
  const ph = (s: string) => {
    const i = tokens.length
    tokens.push(s)
    return `\ue000${encodeTokenIndex(i)}\ue001`
  }

  html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, m => ph(`<span style="color:#5c6370;font-style:italic">${m}</span>`))
  html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, m => ph(`<span style="color:#98c379">${m}</span>`))
  html = html.replace(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm, m => ph(`<span style="color:#5c6370;font-style:italic">${m}</span>`))

  const kw = KW_BY_LANG[lang.toLowerCase()]
  if (kw) {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), m => ph(`<span style="color:#c678dd">${m}</span>`))
  }

  html = html.replace(/\b(\d+\.?\d*)\b/g, m => ph(`<span style="color:#d19a66">${m}</span>`))

  return html.replace(/\ue000([\ue100-\ue109]+)\ue001/g, (_, encoded) => tokens[decodeTokenIndex(encoded)] ?? '')
}

function stripLineNumbers(s: string): string {
  return s.split('\n').map(line => {
    if (/^\s*\d+\s*$/.test(line)) return ''
    let r = line
      .replace(/^\s*(?:\d+\.\s+|\d+\s+|\d+(?=\.?[a-zA-Z_!(\[]))+/g, '')
      .replace(/&\d+\s*/g, '&')
      .replace(/<\d+>/g, '<>')
      .replace(/\b\d+(?=\s*::)/g, '')
      .replace(/\b\d+(?=!\()/g, '')
      .replace(/=>\s*\d+\b/g, '=>')
      .replace(/;\s*\d+\s*$/, ';')
      .replace(/\s\d+(?=\s*\[)/g, ' ')
    return r
  }).join('\n')
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  const stripped = stripLineNumbers(code)
  const lines = stripped.split('\n')
  const lineCount = lines.length

  const copyCode = () => {
    navigator.clipboard.writeText(stripped).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
        <span>{lang || 'code'}</span>
        <button onClick={copyCode}
          className="px-2 py-0.5 rounded text-xs transition-colors"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div
          aria-hidden="true"
          className="select-none text-right py-3 leading-relaxed font-mono text-xs shrink-0"
          style={{
            color: 'var(--text-muted)',
            minWidth: `${2 + String(lineCount).length}ch`,
            borderRight: '1px solid var(--border)',
            paddingLeft: '12px',
            paddingRight: '12px',
            userSelect: 'none',
          }}
        >
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <code className="block text-xs leading-relaxed font-mono p-3" style={{ color: 'var(--text-primary)' }}
          dangerouslySetInnerHTML={{ __html: highlightCode(stripped, lang) }} />
      </pre>
    </div>
  )
}

function renderTable(tableHtml: string): string {
  const rows = tableHtml.split('\n').filter((l: string) => l.trim())
  if (rows.length < 2) return tableHtml
  const isTable = rows.every((r: string) => r.trim().startsWith('|') && r.trim().endsWith('|'))
  if (!isTable) return tableHtml
  const header = rows[0]
  const sep = rows[1]
  const body = rows.slice(2)
  const align = (sep || '').split('|').map((s: string) => {
    const t = s.trim()
    if (t.startsWith(':') && t.endsWith(':')) return 'center'
    if (t.endsWith(':')) return 'right'
    return 'left'
  })
  const renderRow = (row: string, tag: 'th' | 'td') => {
    const cells = row.split('|').slice(1, -1)
    return `<tr>${cells.map((c: string, i: number) => {
      const a = align[i + 1] || 'left'
      return `<${tag} style="border:1px solid var(--border);padding:4px 8px;text-align:${a}">${c.trim()}</${tag}>`
    }).join('')}</tr>`
  }
  return `<table style="border-collapse:collapse;margin:8px 0;font-size:13px;width:100%">
    ${renderRow(header, 'th')}
    ${body.map((r: string) => renderRow(r, 'td')).join('')}
  </table>`
}

function renderInlineMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/~~(.+?)~~/g, '<del style="text-decoration:line-through;color:var(--text-muted)">$1</del>')

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1">$1</h1>')

  html = html.replace(/^\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n?)*/gm, (m) => renderTable(m))

  html = html.replace(/^- \[( |x)\] (.+)$/gm, (_, checked, content) =>
    `<li style="list-style:none;margin-left:1rem;display:flex;align-items:center;gap:0.375rem"><input type="checkbox" ${checked === 'x' ? 'checked' : ''} disabled style="accent-color:var(--accent)" /> ${content}</li>`)

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded text-xs font-mono" style="background-color:var(--bg-primary);color:var(--accent)">$1</code>')

  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$1. $2</li>')

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">$1</a>')
  html = html.replace(/(?<!")(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">$1</a>')

  html = html.replace(/^---$/gm, '<hr class="my-2" style="border-color:var(--border)" />')

  html = html.replace(/^((?:>\s?)+) ?(.+)$/gm, (_, prefix, content) => {
    const depth = (prefix.match(/>/g) || []).length
    let result = content
    for (let i = 0; i < depth; i++) {
      result = `<blockquote class="pl-3 py-1 my-1 border-l-2 italic text-sm" style="border-color:var(--accent);color:var(--text-muted)">${result}</blockquote>`
    }
    return result
  })

  html = html.replace(/\n/g, '<br>')
  return html
}

function Markdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const blockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const inline = text.slice(lastIndex, match.index)
      parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(inline) }} />)
    }
    parts.push(<CodeBlock key={key++} code={match[2]} lang={match[1]} />)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex)
    parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(rest) }} />)
  }

  return <>{parts}</>
}

function OllamaModelSelect({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    window.electronAPI.getOllamaModels().then(list => {
      setModels(list)
      setLoading(false)
    })
  }, [])

  return (
    <div className="relative mt-1">
      {loading ? (
        <div className="text-xs px-3 py-2" style={{ color: 'var(--text-muted)' }}>Loading models...</div>
      ) : models.length > 0 ? (
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder="Ollama not running or no models found"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
      )}
    </div>
  )
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  opencode: 'https://opencode.ai/zen/v1',
  'opencode-go': 'https://opencode.ai/zen/go/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

function ProviderModelSelect({ provider, apiKey, value, onChange }: { provider: string; apiKey: string; value: string; onChange: (m: string) => void }) {
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const baseUrl = PROVIDER_BASE_URLS[provider]
    if (!baseUrl) return
    setLoading(true)
    window.electronAPI.getProviderModels(baseUrl, apiKey || undefined).then(list => {
      const sorted = [...list].sort((a, b) => {
        const aFree = a.endsWith('-free')
        const bFree = b.endsWith('-free')
        if (aFree && !bFree) return -1
        if (!aFree && bFree) return 1
        return a.localeCompare(b)
      })
      setModels(sorted)
      setLoading(false)
    })
  }, [provider, apiKey])

  const placeholder = loading ? 'Loading models...' : `Type a model name`
  const isFree = (m: string) => m.endsWith('-free')
  return (
    <div className="relative mt-1">
      {loading ? (
        <div className="text-xs px-3 py-2" style={{ color: 'var(--text-muted)' }}>Loading models...</div>
      ) : models.length > 0 ? (
        <select value={models.includes(value) ? value : ''} onChange={e => onChange(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          {!models.includes(value) && <option value="" disabled>{value || 'Select a model'}</option>}
          {models.map(m => <option key={m} value={m}>{m}{isFree(m) ? ' (FREE)' : ''}</option>)}
        </select>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
      )}
    </div>
  )
}

function estimateTokens(text: string): number {
  return Math.round(text.length / 4)
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString()
}

export default function AiChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streamingConvos, setStreamingConvos] = useState<Record<number, boolean>>({})
  const [streamContents, setStreamContents] = useState<Record<number, string>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [localConfig, setLocalConfig] = useState<AiConfig | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastSentText, setLastSentText] = useState('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null)
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null)
  const [showPinned, setShowPinned] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<ChatMsg[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const historyDraftRef = useRef('')
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations
  const streamErrorRef = useRef<Record<number, boolean>>({})

  const filteredConversations = searchQuery
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations

  const streaming = activeId ? !!streamingConvos[activeId] : false
  const streamingContent = activeId ? (streamContents[activeId] || '') : ''

  const activeConv = conversations.find(c => c.id === activeId)
  const convConfig: AiConfig = activeConv
    ? { provider: activeConv.provider, model: activeConv.model || '', apiKey: activeConv.api_key, systemPrompt: activeConv.system_prompt, temperature: activeConv.temperature, maxTokens: activeConv.max_tokens }
    : { provider: 'ollama', model: 'llama3.2', apiKey: '' }

  useEffect(() => {
    window.electronAPI.getConversations().then(setConversations)
  }, [])

  useEffect(() => {
    if (activeId === null) return
    setHistoryIndex(null)
    historyDraftRef.current = ''
    setLoadingMsgs(true)
    window.electronAPI.getMessages(activeId).then(msgs => {
      setMessages(msgs)
      setLoadingMsgs(false)
    })
  }, [activeId])

  useEffect(() => {
    const cleanup = window.electronAPI.onChatChunk((data: any) => {
      const convId = data.conversationId
      if (data.done) {
        console.log('[AiChat] stream done for conv', convId)
        setStreamingConvos(prev => ({ ...prev, [convId]: false }))
        setStreamContents(prev => ({ ...prev, [convId]: '' }))
        if (convId === activeIdRef.current && !streamErrorRef.current[convId]) {
          window.electronAPI.getMessages(convId).then(msgs => {
            setMessages(msgs)
            const firstUser = msgs.find(m => m.role === 'user')
            const conv = conversationsRef.current.find(c => c.id === convId)
            if (firstUser && conv && conv.title === 'New Chat') {
              const title = firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? '...' : '')
              window.electronAPI.renameConversation(convId, title)
              setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c))
            }
          })
        }
        delete streamErrorRef.current[convId]
      } else if (data.error) {
        console.error('[AiChat] stream error for conv', convId, ':', data.error)
        streamErrorRef.current[convId] = true
        setStreamingConvos(prev => ({ ...prev, [convId]: false }))
        setStreamContents(prev => ({ ...prev, [convId]: '' }))
        setMessages(prev => [...prev, {
          id: -Date.now(),
          conversation_id: convId,
          role: 'assistant',
          content: `Error: ${data.error}`,
          pinned: 0,
          created_at: new Date().toISOString()
        }])
      } else {
        setStreamContents(prev => ({
          ...prev,
          [convId]: (prev[convId] || '') + (data.delta || '')
        }))
      }
    })
    return () => cleanup()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const switchConversation = (id: number) => {
    setActiveId(id)
  }

  const createNew = async () => {
    await window.electronAPI.createConversation(convConfig.provider, convConfig.model, convConfig.apiKey)
    const list = await window.electronAPI.getConversations()
    setConversations(list)
    if (list.length > 0) setActiveId(list[0].id)
  }

  const removeConv = async (id: number) => {
    if (streamingConvos[id]) window.electronAPI.cancelChat(id)
    await window.electronAPI.deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeId === id) { setActiveId(null); setMessages([]) }
  }

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  const commitRename = async () => {
    if (editingId && editTitle.trim()) {
      await window.electronAPI.renameConversation(editingId, editTitle.trim())
      setConversations(prev => prev.map(c => c.id === editingId ? { ...c, title: editTitle.trim() } : c))
    }
    setEditingId(null)
    setEditTitle('')
  }

  const saveConfig = async () => {
    if (!activeId || !localConfig) return
    await window.electronAPI.updateConversationConfig(activeId, localConfig.provider, localConfig.model, localConfig.apiKey, localConfig.systemPrompt, localConfig.temperature, localConfig.maxTokens)
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, provider: localConfig.provider, model: localConfig.model, api_key: localConfig.apiKey, system_prompt: localConfig.systemPrompt || '', temperature: localConfig.temperature || 0.7, max_tokens: localConfig.maxTokens || 4096 } : c))
    setShowConfig(false)
    setLocalConfig(null)
  }

  const autoGrow = () => {
    const t = textareaRef.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = Math.min(t.scrollHeight, 200) + 'px'
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeId || streaming) return
    const text = input.trim()

    if (editingMsgId) {
      await window.electronAPI.deleteMessage(editingMsgId)
      setMessages(prev => prev.filter(m => m.id !== editingMsgId))
      setEditingMsgId(null)
    }

    console.log('[AiChat] sendMessage', { activeId, text, provider: convConfig.provider, model: convConfig.model })
    setLastSentText(text)
    setHistoryIndex(null)
    historyDraftRef.current = ''
    setInput('')
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      }
    }, 0)
    const temp: ChatMsg = {
      id: -Date.now(),
      conversation_id: activeId,
      role: 'user',
      content: text,
      pinned: 0,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, temp])
    setStreamingConvos(prev => ({ ...prev, [activeId]: true }))
    setStreamContents(prev => ({ ...prev, [activeId]: '' }))
    window.electronAPI.sendChatMessage(activeId, text)
  }, [input, activeId, streaming, convConfig, editingMsgId])

  const updateInput = (value: string) => {
    setInput(value)
    setHistoryIndex(null)
    historyDraftRef.current = ''
  }

  const navigateHistory = (direction: 'older' | 'newer') => {
    const userHistory = messages.filter(msg => msg.role === 'user').map(msg => msg.content)
    if (userHistory.length === 0) return false

    if (direction === 'older') {
      const nextIndex = historyIndex === null ? userHistory.length - 1 : Math.max(0, historyIndex - 1)
      if (historyIndex === null) historyDraftRef.current = input
      setHistoryIndex(nextIndex)
      setInput(userHistory[nextIndex])
      return true
    }

    if (historyIndex === null) return false
    const nextIndex = historyIndex + 1
    if (nextIndex >= userHistory.length) {
      setHistoryIndex(null)
      setInput(historyDraftRef.current)
      historyDraftRef.current = ''
      return true
    }

    setHistoryIndex(nextIndex)
    setInput(userHistory[nextIndex])
    return true
  }

  const retryMessage = () => {
    if (!activeId) return
    console.log('[AiChat] retryMessage', { activeId, lastSentText })
    setStreamingConvos(prev => ({ ...prev, [activeId]: true }))
    setStreamContents(prev => ({ ...prev, [activeId]: '' }))
    window.electronAPI.retryChatMessage(activeId)
  }

  const copyMessage = (msg: ChatMsg) => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopiedMsgId(msg.id)
      setTimeout(() => setCopiedMsgId(null), 2000)
    })
  }

  const editMessage = (msg: ChatMsg) => {
    setEditingMsgId(msg.id)
    setInput(msg.content)
  }

  const deleteSingleMessage = async (msg: ChatMsg) => {
    const idx = messages.findIndex(m => m.id === msg.id)
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    await window.electronAPI.deleteMessage(msg.id)
    if (editingMsgId === msg.id) setEditingMsgId(null)
  }

  const pinMessage = async (msg: ChatMsg) => {
    const updated = await window.electronAPI.pinMessage(msg.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pinned: updated.pinned } : m))
    if (showPinned) {
      const pinned = await window.electronAPI.getPinnedMessages(activeId!)
      setPinnedMessages(pinned)
    }
  }

  const loadPinned = async () => {
    if (!activeId) return
    const pinned = await window.electronAPI.getPinnedMessages(activeId)
    setPinnedMessages(pinned)
    setShowPinned(true)
  }

  const scrollToMessage = (msgId: number) => {
    const el = document.getElementById(`msg-${msgId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.transition = 'box-shadow 0.3s'
    el.style.boxShadow = '0 0 0 2px var(--accent)'
    setTimeout(() => { el.style.boxShadow = '' }, 1500)
  }

  const regenerateMessage = async (msg: ChatMsg) => {
    if (!activeId || streaming) return
    const msgs = messages
    const msgIndex = msgs.findIndex(m => m.id === msg.id)
    if (msgIndex < 0) return
    let userIdx = msgIndex - 1
    while (userIdx >= 0 && msgs[userIdx].role !== 'user') userIdx--
    if (userIdx < 0) return
    const userMsg = msgs[userIdx]
    const keepMsgs = msgs.slice(0, userIdx + 1)
    setMessages(keepMsgs)
    await window.electronAPI.deleteMessagesAfter(activeId, userMsg.id)
    setStreamingConvos(prev => ({ ...prev, [activeId]: true }))
    setStreamContents(prev => ({ ...prev, [activeId]: '' }))
    window.electronAPI.retryChatMessage(activeId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      if (navigateHistory('older')) e.preventDefault()
      return
    }

    if (e.key === 'ArrowDown') {
      if (navigateHistory('newer')) e.preventDefault()
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const providerLabel = PROVIDERS.find(p => p.value === convConfig.provider)?.label || convConfig.provider
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('aichat-sidebar') !== '0')

  const tokenCount = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)

  const exportConversation = async () => {
    if (!activeId || messages.length === 0) return
    const md = messages.map(m => {
      const role = m.role === 'user' ? 'You' : 'Assistant'
      return `**${role}:**\n\n${m.content}\n\n---\n`
    }).join('')
    const header = `# AI Chat — ${activeConv?.title || 'Conversation'}\n\n**Provider:** ${providerLabel} · **Model:** ${convConfig.model}\n\n---\n\n`
    const full = header + md
    const path = await window.electronAPI.showSaveDialog({
      defaultPath: `vibetasks-chat-${activeId}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Text', extensions: ['txt'] }]
    })
    if (path) {
      await window.electronAPI.writeBinaryFile(path, [...new TextEncoder().encode(full)])
    }
  }

  return (
    <div className="flex h-full gap-0" style={{ color: 'var(--text-primary)', position: 'relative' }}>
      {/* Config panel overlay */}
      {showConfig && localConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl border p-6 w-96 shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-bold mb-4">AI Provider Config</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Provider</label>
                <select value={localConfig.provider} onChange={e => {
                  const p = e.target.value
                  const defaults: Record<string, string> = { ollama: 'llama3.2', openai: 'gpt-4o', gemini: 'gemini-2.5-flash', groq: 'llama-3.3-70b-versatile', mistral: 'mistral-large-latest', openrouter: 'openai/gpt-4o', opencode: 'big-pickle', 'opencode-go': 'deepseek-v4-pro' }
                  setLocalConfig(c => ({ ...c, provider: p, model: defaults[p] || c.model }))
                }}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Model</label>
                {localConfig.provider === 'ollama' ? (
                  <OllamaModelSelect value={localConfig.model} onChange={m => setLocalConfig(c => ({ ...c, model: m }))} />
                ) : localConfig.provider === 'openai' ? (
                  <select value={localConfig.model} onChange={e => setLocalConfig(c => ({ ...c, model: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {OPENAI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                ) : localConfig.provider === 'gemini' ? (
                  <select value={localConfig.model} onChange={e => setLocalConfig(c => ({ ...c, model: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {GEMINI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                ) : localConfig.provider === 'groq' ? (
                  <select value={localConfig.model} onChange={e => setLocalConfig(c => ({ ...c, model: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {GROQ_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                ) : localConfig.provider === 'mistral' ? (
                  <select value={localConfig.model} onChange={e => setLocalConfig(c => ({ ...c, model: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {MISTRAL_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                ) : localConfig.provider === 'opencode' || localConfig.provider === 'opencode-go' ? (
                  <ProviderModelSelect provider={localConfig.provider} apiKey={localConfig.apiKey} value={localConfig.model} onChange={m => setLocalConfig(c => ({ ...c, model: m }))} />
                ) : (
                  <input value={localConfig.model} onChange={e => setLocalConfig(c => ({ ...c, model: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                )}
              </div>
              {localConfig.provider !== 'ollama' && (
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    API Key <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{localConfig.provider === 'opencode' ? '(optional)' : ''}</span>
                  </label>
                  <div className="relative mt-1">
                    <input type={showApiKey ? 'text' : 'password'} value={localConfig.apiKey} onChange={e => setLocalConfig(c => ({ ...c, apiKey: e.target.value }))}
                      placeholder={localConfig.provider === 'opencode' ? 'optional' : 'sk-...'}
                      className="w-full border rounded-lg px-3 py-2 pr-8 text-sm"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: 'var(--text-muted)' }}>
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System Prompt</label>
                <textarea value={localConfig.systemPrompt || ''} onChange={e => setLocalConfig(c => ({ ...c, systemPrompt: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder="You are a helpful assistant..." />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Temperature</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="range" min="0" max="2" step="0.1"
                      value={localConfig.temperature ?? 0.7}
                      onChange={e => setLocalConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
                      className="flex-1" />
                    <span className="text-xs w-8 text-right" style={{ color: 'var(--text-muted)' }}>{localConfig.temperature ?? 0.7}</span>
                  </div>
                </div>
                <div className="w-28">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Max Tokens</label>
                  <input type="number" min="1" max="131072"
                    value={localConfig.maxTokens ?? 4096}
                    onChange={e => setLocalConfig(c => ({ ...c, maxTokens: parseInt(e.target.value) || 4096 }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowConfig(false); setLocalConfig(null) }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={saveConfig}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent)' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation sidebar */}
      <div className={'flex-shrink-0 border-r flex flex-col transition-all duration-200 overflow-hidden'} style={{ borderColor: 'var(--border)', width: sidebarOpen ? 256 : 0 }}>
        <div className="p-3 border-b shrink-0 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => { setSidebarOpen(false); localStorage.setItem('aichat-sidebar', '0') }}
            className="text-xs px-1 rounded shrink-0" style={{ color: 'var(--text-muted)' }}
            title="Collapse sidebar">◀</button>
          {sidebarOpen && (
            <button onClick={createNew}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
              + New Chat
            </button>
          )}
        </div>
        {sidebarOpen && (
          <div className="px-2 pt-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg px-3 py-1.5 text-xs outline-none border"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map(conv => (
            <div key={conv.id}
              className="group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors"
              style={{
                backgroundColor: activeId === conv.id ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
              }}
              onClick={() => switchConversation(conv.id)}>
              {editingId === conv.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 bg-transparent border-b text-sm outline-none"
                  style={{ borderColor: 'var(--accent)' }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <div className="flex-1 truncate">
                  <span>{conv.title}</span>
                  <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{relativeTime(conv.updated_at)}</span>
                </div>
              )}
              {streamingConvos[conv.id] && (
                <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
              )}
              <div className="hidden group-hover:flex gap-0.5">
                <button onClick={e => { e.stopPropagation(); startRename(conv) }}
                  className="px-1 text-xs rounded" style={{ color: 'var(--text-secondary)' }}
                  title="Rename">✎</button>
                <button onClick={e => { e.stopPropagation(); removeConv(conv.id) }}
                  className="px-1 text-xs rounded" style={{ color: 'var(--danger)' }}
                  title="Delete">✕</button>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs px-2 py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              No conversations yet
            </p>
          )}
        </div>
      </div>

      {!sidebarOpen && (
        <button onClick={() => { setSidebarOpen(true); localStorage.setItem('aichat-sidebar', '1') }}
          className="absolute left-0 top-2 z-10 text-xs px-1 py-2 rounded-r transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Expand sidebar">▶</button>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeId ? (
          <>
            {/* Top bar with provider info */}
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {providerLabel} · {convConfig.model}
              </span>
              <div className="flex items-center gap-3">
                {messages.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>~{tokenCount} tokens</span>
                )}
                {messages.length > 0 && (
                  <button onClick={exportConversation}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    📥 Export
                  </button>
                )}
                {messages.some(m => m.pinned === 1) && (
                  <button onClick={loadPinned}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{ color: showPinned ? '#f59e0b' : 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    📌 Pinned ({messages.filter(m => m.pinned === 1).length})
                  </button>
                )}
                <button onClick={() => { setLocalConfig({ ...convConfig }); setShowConfig(true) }}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  ⚙️ Config
                </button>
              </div>
            </div>

            {showPinned && (
              <div className="border-b shrink-0" style={{ borderColor: 'var(--border)', maxHeight: 240, overflowY: 'auto' }}>
                <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>📌 Pinned Messages</span>
                  <button onClick={() => setShowPinned(false)} className="text-xs px-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
                {pinnedMessages.length === 0 ? (
                  <p className="text-xs px-4 py-3" style={{ color: 'var(--text-muted)' }}>No pinned messages</p>
                ) : (
                  <div className="px-4 py-2 space-y-2">
                    {pinnedMessages.map(pm => (
                      <div key={pm.id} onClick={() => scrollToMessage(pm.id)}
                        className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 cursor-pointer transition-colors"
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                        <span className="shrink-0 mt-0.5" style={{ color: pm.role === 'user' ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {pm.role === 'user' ? '👤' : '🤖'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {pm.content.length > 200 ? pm.content.slice(0, 200) + '...' : pm.content}
                          </p>
                          <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>{relativeTime(pm.created_at)}</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); pinMessage(pm) }}
                          className="shrink-0 text-xs px-1 rounded"
                          style={{ color: 'var(--danger)' }}
                          title="Unpin">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                  <div className="max-w-[70%]">
                    <div className="rounded-xl px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed relative"
                      style={{
                        backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-hover)',
                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      }}>
                      {msg.pinned === 1 && (
                        <span className="absolute -top-2 -right-2 text-xs" title="Pinned">📌</span>
                      )}
                      {msg.role === 'user' ? msg.content : <Markdown text={msg.content} />}
                      <div className={`mt-2 hidden group-hover:flex gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <>
                            <button onClick={() => copyMessage(msg)}
                              className="px-1.5 py-0.5 text-xs rounded transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title="Copy">{copiedMsgId === msg.id ? '✓' : '📋'}</button>
                            <button onClick={() => pinMessage(msg)}
                              className="px-1.5 py-0.5 text-xs rounded transition-colors"
                              style={{ color: msg.pinned ? '#f59e0b' : 'var(--text-secondary)' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title={msg.pinned ? 'Unpin' : 'Pin'}>{msg.pinned ? '📌' : '📍'}</button>
                            <button onClick={() => regenerateMessage(msg)}
                              className="px-1.5 py-0.5 text-xs rounded transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title="Regenerate">🔄</button>
                            <button onClick={() => deleteSingleMessage(msg)}
                              className="px-1.5 py-0.5 text-xs rounded transition-colors"
                              style={{ color: 'var(--danger)' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title="Delete">✕</button>
                          </>
                        )}
                        {msg.role === 'user' && (
                          <>
                            <button onClick={() => pinMessage(msg)}
                              className="px-1.5 py-0.5 text-xs rounded transition-colors"
                              style={{ color: msg.pinned ? '#f59e0b' : 'rgba(255,255,255,0.85)' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title={msg.pinned ? 'Unpin' : 'Pin'}>{msg.pinned ? '📌' : '📍'}</button>
                            <button onClick={() => editMessage(msg)}
                              className="px-1.5 py-0.5 text-xs rounded transition-colors"
                              style={{ color: 'rgba(255,255,255,0.85)' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title="Edit">✎</button>
                            <button onClick={() => deleteSingleMessage(msg)}
                              className="px-1.5 py-0.5 text-xs rounded transition-colors"
                              style={{ color: 'rgba(255,255,255,0.85)' }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              title="Delete">✕</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs mt-0.5 ${msg.role === 'user' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>
                      {relativeTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                    {streamingContent ? (
                      <>
                        <Markdown text={streamingContent} />
                        <span className="inline-block w-2 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: 'var(--text-primary)' }} />
                      </>
                    ) : (
                      <span className="inline-flex gap-1.5 items-center" style={{ height: 20 }}>
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-muted)', animationDelay: '0s' }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-muted)', animationDelay: '0.15s' }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--text-muted)', animationDelay: '0.3s' }} />
                      </span>
                    )}
                  </div>
                </div>
              )}
              {loadingMsgs && !streaming && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
                    Loading messages...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { updateInput(e.target.value); autoGrow() }}
                  onKeyDown={handleKeyDown}
                  placeholder={streaming ? 'Waiting for response...' : 'Type a message...'}
                  disabled={streaming}
                  rows={1}
                  className="flex-1 rounded-lg px-4 py-2 text-sm outline-none border resize-none leading-relaxed"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                    minHeight: 38,
                  }}
                />
                {streaming ? (
                  <button onClick={() => window.electronAPI.cancelChat(activeId)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--danger)', color: '#fff' }}>
                    Stop
                  </button>
                ) : (
                  <button onClick={sendMessage}
                    disabled={!input.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: input.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                      color: input.trim() ? '#fff' : 'var(--text-secondary)',
                    }}>
                    Send
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>AI Chat</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Select a conversation or create a new one</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {providerLabel} · {convConfig.model}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
