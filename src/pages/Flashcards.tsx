import { useState, useEffect, useCallback } from 'react'
import type { FlashcardDeck, Flashcard } from '../types/models'

const QUALITY_LABELS = ['Blackout', 'Wrong', 'Hard', 'OK', 'Easy', 'Perfect']

export default function Flashcards() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [cards, setCards] = useState<Flashcard[]>([])
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null)
  const [mode, setMode] = useState<'study' | 'cards'>('study')
  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [studyingDue, setStudyingDue] = useState(true)
  const [newDeckName, setNewDeckName] = useState('')
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [msg, setMsg] = useState('')

  const loadDecks = useCallback(async () => {
    const d = await window.electronAPI.getFlashcardDecks()
    setDecks(d)
  }, [])

  const loadDue = useCallback(async () => {
    const dc = await window.electronAPI.getDueFlashcards(selectedDeckId ?? undefined)
    setDueCards(dc)
  }, [selectedDeckId])

  useEffect(() => { loadDecks() }, [loadDecks])
  useEffect(() => { loadDue() }, [loadDue])

  useEffect(() => {
    if (selectedDeckId !== null) {
      window.electronAPI.getFlashcards(selectedDeckId).then(setCards)
    } else {
      setCards([])
    }
    setCurrentCardIdx(0)
    setShowBack(false)
  }, [selectedDeckId])

  const selectedDeck = decks.find(d => d.id === selectedDeckId)
  const studyCards = studyingDue ? dueCards : cards
  const currentCard = studyCards[currentCardIdx] || null

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    await window.electronAPI.createFlashcardDeck(newDeckName.trim())
    setNewDeckName('')
    setShowNewDeck(false)
    loadDecks()
  }

  const handleDeleteDeck = async (id: number) => {
    await window.electronAPI.deleteFlashcardDeck(id)
    if (selectedDeckId === id) setSelectedDeckId(null)
    loadDecks()
  }

  const handleAddCard = async () => {
    if (!selectedDeckId || !editFront.trim() || !editBack.trim()) return
    if (editingCard) {
      await window.electronAPI.updateFlashcard(editingCard.id, { front: editFront.trim(), back: editBack.trim() } as any)
    } else {
      await window.electronAPI.createFlashcard(selectedDeckId, editFront.trim(), editBack.trim())
    }
    setEditingCard(null)
    setEditFront('')
    setEditBack('')
    const c = await window.electronAPI.getFlashcards(selectedDeckId)
    setCards(c)
    loadDue()
  }

  const handleDeleteCard = async (id: number) => {
    await window.electronAPI.deleteFlashcard(id)
    setCards(prev => prev.filter(c => c.id !== id))
    loadDue()
  }

  const handleReview = async (quality: number) => {
    if (!currentCard) return
    await window.electronAPI.reviewFlashcard(currentCard.id, quality)
    loadDue()
    if (currentCardIdx < studyCards.length - 1) {
      setCurrentCardIdx(i => i + 1)
    } else {
      setCurrentCardIdx(0)
      flash('All done for now!')
    }
    setShowBack(false)
  }

  const s = (c: string) => ({ style: { color: `var(--${c})` } })
  const b = (c: string) => ({ style: { backgroundColor: `var(--${c})` } })
  const btn = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('flashcards-sidebar') !== '0')

  return (
    <div className="flex gap-4 h-full" style={{ position: 'relative' }}>
      {/* Deck sidebar */}
      <div className="shrink-0 space-y-2 transition-all duration-200 overflow-hidden" style={{ color: 'var(--text-primary)', width: sidebarOpen ? 224 : 0 }}>
        <div className="flex items-center justify-between">
          {sidebarOpen && <h2 className="font-bold text-lg">Decks</h2>}
          <div className="flex items-center gap-1">
            {sidebarOpen && <button onClick={() => setShowNewDeck(true)} className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+</button>}
            <button onClick={() => { setSidebarOpen(false); localStorage.setItem('flashcards-sidebar', '0') }}
              className="text-xs px-1" style={{ color: 'var(--text-muted)' }}
              title="Collapse sidebar">◀</button>
          </div>
        </div>

        {sidebarOpen && showNewDeck && (
          <div className="flex gap-1">
            <input value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateDeck()}
              className="flex-1 px-2 py-1 rounded text-sm border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="Deck name" autoFocus
            />
            <button onClick={handleCreateDeck} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>OK</button>
          </div>
        )}

        {sidebarOpen && (
        <div className="space-y-1">
          {decks.map(deck => {
            const due = dueCards.filter(c => c.deck_id === deck.id).length
            return (
              <div key={deck.id}
                onClick={() => setSelectedDeckId(deck.id)}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors"
                style={{
                  backgroundColor: selectedDeckId === deck.id ? 'var(--bg-hover)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="truncate flex-1">{deck.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {due > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>{due}</span>}
                  <button onClick={e => { e.stopPropagation(); handleDeleteDeck(deck.id) }} className="text-xs" style={{ color: 'var(--text-muted)' }}>×</button>
                </div>
              </div>
            )
          })}
          {decks.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No decks yet. Create one!</p>}
        </div>
        )}
      </div>

      {!sidebarOpen && (
        <button onClick={() => { setSidebarOpen(true); localStorage.setItem('flashcards-sidebar', '1') }}
          className="absolute left-0 top-2 z-10 text-xs px-1 py-2 rounded-r transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Expand sidebar">▶</button>
      )}

      {/* Main area */}
      <div className="flex-1 space-y-4">
        {msg && (
          <div className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: 'var(--accent)' }}>{msg}</div>
        )}

        {!selectedDeck ? (
          <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
            Select or create a deck to start studying
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl border w-fit" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <button onClick={() => { setMode('study'); setCurrentCardIdx(0); setShowBack(false) }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'study' ? '' : ''}`}
                style={{ backgroundColor: mode === 'study' ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              >
                Study ({dueCards.length} due)
              </button>
              <button onClick={() => { setMode('cards'); setEditingCard(null); setEditFront(''); setEditBack('') }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'cards' ? '' : ''}`}
                style={{ backgroundColor: mode === 'cards' ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              >
                Cards ({cards.length})
              </button>
            </div>

            {/* Study mode */}
            {mode === 'study' && (
              <div className="space-y-4">
                {currentCard ? (
                  <>
                    <div className="rounded-xl border p-8 min-h-[250px] flex flex-col items-center justify-center cursor-pointer transition-colors"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                      onClick={() => setShowBack(true)}
                    >
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        Card {currentCardIdx + 1} of {studyCards.length} • {showBack ? 'Back' : 'Front'}
                      </p>
                      <p className="text-lg font-medium text-center max-w-lg whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                        {showBack ? currentCard.back : currentCard.front}
                      </p>
                      {!showBack && (
                        <button className="mt-4 px-6 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent)' }}>
                          Tap or click to reveal
                        </button>
                      )}
                    </div>

                    {showBack && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {QUALITY_LABELS.map((label, i) => (
                          <button key={i} onClick={() => handleReview(i)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                            style={{
                              backgroundColor: i >= 4 ? 'var(--accent)' : i >= 2 ? 'var(--bg-hover)' : 'var(--danger)',
                              color: i >= 4 ? '#fff' : 'var(--text-primary)',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center min-h-[250px] rounded-xl border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                    No cards due for review. Add more cards or come back later!
                  </div>
                )}

                <div className="flex justify-center gap-2">
                  <button onClick={() => { setStudyingDue(true); setCurrentCardIdx(0); setShowBack(false); loadDue() }}
                    className={btn} style={{ backgroundColor: studyingDue ? 'var(--accent)' : 'var(--bg-hover)', color: studyingDue ? '#fff' : 'var(--text-primary)' }}>
                    Due Cards
                  </button>
                  <button onClick={() => { setStudyingDue(false); setCurrentCardIdx(0); setShowBack(false) }}
                    className={btn} style={{ backgroundColor: !studyingDue ? 'var(--accent)' : 'var(--bg-hover)', color: !studyingDue ? '#fff' : 'var(--text-primary)' }}>
                    All Cards
                  </button>
                </div>
              </div>
            )}

            {/* Cards mode */}
            {mode === 'cards' && (
              <div className="space-y-4">
                <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <h3 className="text-sm font-semibold" {...s('text-primary')}>{editingCard ? 'Edit Card' : 'New Card'}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" {...s('text-secondary')}>Front</label>
                      <textarea value={editFront} onChange={e => setEditFront(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm border resize-none" rows={3}
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        placeholder="Question or prompt"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" {...s('text-secondary')}>Back</label>
                      <textarea value={editBack} onChange={e => setEditBack(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm border resize-none" rows={3}
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        placeholder="Answer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddCard}
                      className={btn} style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                      {editingCard ? 'Update' : 'Add'}
                    </button>
                    {editingCard && (
                      <button onClick={() => { setEditingCard(null); setEditFront(''); setEditBack('') }}
                        className={btn} style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {cards.map(card => (
                    <div key={card.id}
                      className="flex items-start justify-between rounded-xl border p-3"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate" {...s('text-primary')}>{card.front}</p>
                        <p className="text-xs truncate" {...s('text-secondary')}>{card.back}</p>
                        <p className="text-[10px]" {...s('text-muted')}>EF: {card.ease_factor.toFixed(2)} • Interval: {card.interval}d • Reps: {card.repetitions}{card.next_review_date ? ` • Next: ${card.next_review_date}` : ''}</p>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-3">
                        <button onClick={() => { setEditingCard(card); setEditFront(card.front); setEditBack(card.back) }}
                          className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteCard(card.id)}
                          className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--danger)' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No cards in this deck.</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
