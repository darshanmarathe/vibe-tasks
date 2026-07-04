import { useState, useEffect, useRef, useCallback } from 'react'

interface Conversation { id: number; title: string; provider: string; model: string | null; api_key: string; created_at: string; updated_at: string }
interface ChatMsg { id: number; conversation_id: number; role: string; content: string; created_at: string }
interface AiConfig { provider: string; apiKey: string; model: string }

const PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'groq', label: 'Groq (Cloud)' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'openrouter', label: 'OpenRouter' },
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

function highlightCode(code: string, lang: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const keywords = /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|def|import|from|print|int|float|str|bool|None|True|False|and|or|not|is|def|return|if|else|elif|for|while|in|range|len|type|dict|list|set|tuple|lambda|map|filter|reduce|self|__init__|__str__|__repr__)\b/g
  html = html.replace(keywords, '<span style="color:#c678dd">$1</span>')

  const strings = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g
  html = html.replace(strings, '<span style="color:#98c379">$1</span>')

  const comments = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm
  html = html.replace(comments, '<span style="color:#5c6370;font-style:italic">$1</span>')

  const numbers = /\b(\d+\.?\d*)\b/g
  html = html.replace(numbers, '<span style="color:#d19a66">$1</span>')

  html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#5c6370;font-style:italic">$1</span>')

  return html
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
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
      <pre className="m-0 p-3 overflow-x-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <code className="text-xs leading-relaxed font-mono" style={{ color: 'var(--text-primary)' }}
          dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
      </pre>
    </div>
  )
}

function renderInlineMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1">$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded text-xs font-mono" style="background-color:var(--bg-primary);color:var(--accent)">$1</code>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$1. $2</li>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline">$1</a>')
  html = html.replace(/^---$/gm, '<hr class="my-2" style="border-color:var(--border)" />')
  html = html.replace(/> (.+)$/gm, '<blockquote class="pl-3 py-1 my-1 border-l-2 italic text-sm" style="border-color:var(--accent);color:var(--text-muted)">$1</blockquote>')
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
  const [lastSentText, setLastSentText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const streaming = activeId ? !!streamingConvos[activeId] : false
  const streamingContent = activeId ? (streamContents[activeId] || '') : ''

  const activeConv = conversations.find(c => c.id === activeId)
  const convConfig: AiConfig = activeConv
    ? { provider: activeConv.provider, model: activeConv.model || '', apiKey: activeConv.api_key }
    : { provider: 'ollama', model: 'llama3.2', apiKey: '' }

  useEffect(() => {
    window.electronAPI.getConversations().then(setConversations)
  }, [])

  useEffect(() => {
    if (activeId === null) return
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
        if (convId === activeIdRef.current) {
          window.electronAPI.getMessages(convId).then(setMessages)
        }
      } else if (data.error) {
        console.error('[AiChat] stream error for conv', convId, ':', data.error)
        setStreamingConvos(prev => ({ ...prev, [convId]: false }))
        setStreamContents(prev => ({ ...prev, [convId]: `Error: ${data.error}` }))
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
    await window.electronAPI.updateConversationConfig(activeId, localConfig.provider, localConfig.model, localConfig.apiKey)
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, provider: localConfig.provider, model: localConfig.model, api_key: localConfig.apiKey } : c))
    setShowConfig(false)
    setLocalConfig(null)
  }

  const sendMessage = useCallback(() => {
    if (!input.trim() || !activeId || streaming) return
    const text = input.trim()
    console.log('[AiChat] sendMessage', { activeId, text, provider: convConfig.provider, model: convConfig.model })
    setLastSentText(text)
    setInput('')
    const temp: ChatMsg = {
      id: -Date.now(),
      conversation_id: activeId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, temp])
    setStreamingConvos(prev => ({ ...prev, [activeId]: true }))
    setStreamContents(prev => ({ ...prev, [activeId]: '' }))
    window.electronAPI.sendChatMessage(activeId, text)
  }, [input, activeId, streaming, convConfig])

  const retryMessage = () => {
    if (!activeId) return
    console.log('[AiChat] retryMessage', { activeId, lastSentText })
    setStreamingConvos(prev => ({ ...prev, [activeId]: true }))
    setStreamContents(prev => ({ ...prev, [activeId]: '' }))
    window.electronAPI.retryChatMessage(activeId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const providerLabel = PROVIDERS.find(p => p.value === convConfig.provider)?.label || convConfig.provider
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('aichat-sidebar') !== '0')

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
                  const defaults: Record<string, string> = { ollama: 'llama3.2', openai: 'gpt-4o', gemini: 'gemini-2.5-flash', groq: 'llama-3.3-70b-versatile', mistral: 'mistral-large-latest', openrouter: 'openai/gpt-4o' }
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
                ) : (
                  <input value={localConfig.model} onChange={e => setLocalConfig(c => ({ ...c, model: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                )}
              </div>
              {localConfig.provider !== 'ollama' && (
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>API Key</label>
                  <div className="relative mt-1">
                    <input type={showApiKey ? 'text' : 'password'} value={localConfig.apiKey} onChange={e => setLocalConfig(c => ({ ...c, apiKey: e.target.value }))}
                      placeholder="sk-..."
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
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.filter(Boolean).map(conv => (
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
                <span className="flex-1 truncate">{conv.title}</span>
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
              <button onClick={() => { setLocalConfig({ ...convConfig }); setShowConfig(true) }}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                ⚙️ Config
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed"
                    style={{
                      backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-hover)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    }}>
                    {msg.role === 'user' ? msg.content : <Markdown text={msg.content} />}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                    {streamingContent.startsWith('Error:') ? (
                      <div className="flex items-center gap-2">
                        <span>{streamingContent}</span>
                        <button onClick={retryMessage}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                          Retry
                        </button>
                      </div>
                    ) : streamingContent ? (
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
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={streaming ? 'Waiting for response...' : 'Type a message...'}
                  disabled={streaming}
                  className="flex-1 rounded-lg px-4 py-2 text-sm outline-none border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
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
