import { useState, useEffect, useRef, useCallback } from 'react'

interface Conversation { id: number; title: string; provider: string; model: string | null; created_at: string; updated_at: string }
interface ChatMsg { id: number; conversation_id: number; role: string; content: string; created_at: string }
interface AiConfig { provider: string; apiKey: string; model: string }

const PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'gemini', label: 'Gemini (Google)' },
  { value: 'groq', label: 'Groq (Cloud)' },
]

export default function AiChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<AiConfig>({ provider: 'ollama', apiKey: '', model: 'llama3.2' })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.electronAPI.getConversations().then(setConversations)
    window.electronAPI.getAiConfig().then(setConfig)
  }, [])

  useEffect(() => {
    if (activeId === null) return
    window.electronAPI.getMessages(activeId).then(setMessages)
  }, [activeId])

  useEffect(() => {
    const cleanup = window.electronAPI.onChatChunk((data: any) => {
      if (data.conversationId !== activeId) return
      if (data.done) {
        setStreaming(false)
        setStreamingContent('')
        if (activeId) window.electronAPI.getMessages(activeId).then(setMessages)
      } else if (data.error) {
        setStreaming(false)
        setStreamingContent(`Error: ${data.error}`)
      } else {
        setStreamingContent(prev => prev + (data.delta || ''))
      }
    })
    return () => cleanup()
  }, [activeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const switchConversation = (id: number) => {
    if (streaming && activeId) window.electronAPI.cancelChat(activeId)
    setActiveId(id)
    setStreaming(false)
    setStreamingContent('')
  }

  const createNew = async () => {
    const conv = await window.electronAPI.createConversation()
    setConversations(prev => [conv, ...prev])
    setActiveId(conv.id)
  }

  const removeConv = async (id: number) => {
    if (streaming) window.electronAPI.cancelChat(id)
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
    await window.electronAPI.setAiConfig(config)
    setShowConfig(false)
  }

  const sendMessage = useCallback(() => {
    if (!input.trim() || !activeId || streaming) return
    const text = input.trim()
    setInput('')
    setStreaming(true)
    setStreamingContent('')
    window.electronAPI.sendChatMessage(activeId, text)
  }, [input, activeId, streaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const providerLabel = PROVIDERS.find(p => p.value === config.provider)?.label || config.provider

  return (
    <div className="flex h-full gap-0" style={{ color: 'var(--text-primary)' }}>
      {/* Config panel overlay */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl border p-6 w-96 shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-bold mb-4">AI Provider Config</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Provider</label>
                <select value={config.provider} onChange={e => setConfig(c => ({ ...c, provider: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Model</label>
                <input value={config.model} onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              {config.provider !== 'ollama' && (
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>API Key</label>
                  <input type="password" value={config.apiKey} onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowConfig(false)}
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
      <div className="w-64 flex-shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--border)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <button onClick={createNew}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
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

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeId ? (
          <>
            {/* Top bar with provider info */}
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {providerLabel} · {config.model}
              </span>
              <button onClick={() => setShowConfig(true)}
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
                  <div className="max-w-[70%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap"
                    style={{
                      backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-hover)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                    {streamingContent}
                    <span className="inline-block w-2 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: 'var(--text-primary)' }} />
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
                {providerLabel} · {config.model}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
