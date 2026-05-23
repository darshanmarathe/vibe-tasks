import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState, Controls, Background, MiniMap,
  MarkerType, type Connection, type Edge, type Node, type NodeProps, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import dagre from 'dagre'
import type { MindMap } from '../types/models'

const EMOJIS = [
  '😀', '😎', '🚀', '💡', '⭐', '🎯', '❤️', '🔥',
  '✅', '📌', '🎨', '💻', '📊', '📈', '🎉', '🏆',
  '🔍', '⚡', '💪', '🧠', '📝', '🗂️', '🔗', '🔄',
  '🌟', '💎', '🎵', '📚', '✏️', '📦', '🛠️', '🎮',
]

function MindMapNode({ data, selected }: NodeProps) {
  const childCount = data.childCount || 0
  return (
    <div
      className="rounded-xl border-2 px-4 py-3 shadow-lg min-w-[160px] transition-shadow"
      style={{
        backgroundColor: data.color || '#89b4fa',
        borderColor: selected ? '#fff' : 'transparent',
        color: '#1e1e2e',
      }}
    >
      <div className="text-center">
        {data.emoji && <span className="text-2xl mr-1">{data.emoji}</span>}
        <span className="font-semibold text-sm">{data.label}</span>
        {data.collapsed && childCount > 0 && (
          <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
            +{childCount}
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

const nodeTypes = { mindMapNode: MindMapNode }

function EmojiPicker({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} className="absolute z-50 top-full mt-1 p-2 rounded-xl shadow-xl border grid grid-cols-8 gap-1"
      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', width: 260 }}>
      <button onClick={() => { onChange(''); onClose() }}
        className="col-span-8 text-xs text-center rounded hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
        Clear
      </button>
      {EMOJIS.map(e => (
        <button key={e} onClick={() => { onChange(e); onClose() }}
          className="w-7 h-7 flex items-center justify-center rounded hover:scale-125 transition-transform text-base"
          style={{ backgroundColor: value === e ? 'var(--bg-hover)' : 'transparent' }}>
          {e}
        </button>
      ))}
    </div>
  )
}

interface HistoryEntry {
  nodes: Node[]
  edges: Edge[]
}

function getDescendants(nodeId: string, edges: Edge[]): Set<string> {
  const result = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const current = queue.pop()!
    edges.forEach(e => {
      if (e.source === current && !result.has(e.target)) {
        result.add(e.target)
        queue.push(e.target)
      }
    })
  }
  return result
}

export default function MindMapPage() {
  const [maps, setMaps] = useState<MindMap[]>([])
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [mapName, setMapName] = useState('')
  const [newMapName, setNewMapName] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [nodeColor, setNodeColor] = useState('#89b4fa')
  const [nodeEmoji, setNodeEmoji] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<'new' | string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([])
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([])
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const autoSaveTimer = useRef<number | null>(null)

  const loadMaps = useCallback(async () => {
    const m = await window.electronAPI.getMindMaps()
    setMaps(m)
    if (m.length > 0 && !selectedMapId) setSelectedMapId(m[0].id)
  }, [])

  useEffect(() => { loadMaps() }, [loadMaps])

  const loadMap = useCallback(async (id: string) => {
    const map = await window.electronAPI.getMindMap(id)
    if (!map) return
    setMapName(map.name)
    setUndoStack([])
    setRedoStack([])
    setNodes(map.nodes.map((n: any) => ({
      id: n.id,
      type: 'mindMapNode',
      position: { x: n.x, y: n.y },
      data: { label: n.title, color: n.color, emoji: n.emoji, notes: n.notes, collapsed: false },
    })))
    setEdges(map.edges.map((e: any) => ({
      id: e.id,
      source: e.from_node,
      target: e.to_node,
      label: e.label || undefined,
      style: e.dashed ? { strokeDasharray: '5 5' } : undefined,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
    })))
  }, [])

  useEffect(() => {
    if (selectedMapId) loadMap(selectedMapId)
  }, [selectedMapId, loadMap])

  const snapshot = (): HistoryEntry => ({ nodes: structuredClone(nodes), edges: structuredClone(edges) })

  const pushUndo = () => {
    setUndoStack(prev => {
      const next = [...prev, snapshot()]
      if (next.length > 50) next.shift()
      return next
    })
    setRedoStack([])
  }

  const undo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack(prevRedo => [...prevRedo, snapshot()])
    setUndoStack(prev => prev.slice(0, -1))
    setNodes(prev.nodes)
    setEdges(prev.edges)
  }

  const redo = () => {
    if (redoStack.length === 0) return
    const prev = redoStack[redoStack.length - 1]
    setUndoStack(prevUndo => [...prevUndo, snapshot()])
    setRedoStack(prev => prev.slice(0, -1))
    setNodes(prev.nodes)
    setEdges(prev.edges)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redo(); return }
      if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [undo, redo])

  const triggerAutoSave = (ns?: Node[], es?: Edge[]) => {
    if (!selectedMapId) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(async () => {
      const visibleNodes = (ns || nodes).filter(n => !n.data._hidden)
      const nodeData = visibleNodes.map(n => ({
        id: n.id, map_id: selectedMapId,
        title: n.data.label, color: n.data.color, emoji: n.data.emoji || '', notes: n.data.notes || '',
        x: n.position.x, y: n.position.y, width: n.width || 200, height: n.height || 80,
      }))
      const edgeData = (es || edges).map(e => ({
        id: e.id, map_id: selectedMapId, from_node: e.source, to_node: e.target,
        label: e.label || '', dashed: e.style?.strokeDasharray ? 1 : 0,
      }))
      await window.electronAPI.saveMindMap(selectedMapId, nodeData, edgeData)
      loadMaps()
    }, 1000)
  }

  const onConnectHandler = useCallback((conn: Connection) => {
    pushUndo()
    setEdges(eds => {
      const newEdges = addEdge({
        ...conn,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
      }, eds)
      triggerAutoSave(nodes, newEdges)
      return newEdges
    })
  }, [nodes])

  const onNodesChangeHandler = useCallback((changes: any) => {
    onNodesChange(changes)
    const hasPosChange = changes.some((c: any) => c.type === 'position' && c.dragging === false)
    if (hasPosChange) triggerAutoSave()
  }, [])

  const onEdgesChangeHandler = useCallback((changes: any) => {
    onEdgesChange(changes)
    triggerAutoSave()
  }, [])

  const addNode = () => {
    if (!reactFlowInstance) return
    pushUndo()
    const center = reactFlowInstance.screenToFlowPosition({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 40 })
    const id = `node_${Date.now()}`
    const newNode: Node = {
      id,
      type: 'mindMapNode',
      position: center,
      data: { label: 'New Node', color: nodeColor, emoji: nodeEmoji, collapsed: false },
    }
    setNodes(nds => {
      const next = [...nds, newNode]
      triggerAutoSave(next, edges)
      return next
    })
  }

  const updateNodeData = (nodeId: string, data: Partial<{ label: string; color: string; emoji: string; notes: string }>) => {
    pushUndo()
    setNodes(nds => {
      const next = nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)
      triggerAutoSave(next, edges)
      return next
    })
  }

  const deleteSelected = () => {
    pushUndo()
    setNodes(nds => { triggerAutoSave(nds, edges); return nds })
    setEdges(eds => { triggerAutoSave(nodes, eds); return eds })
  }

  const handleCreateMap = async () => {
    if (!newMapName.trim()) return
    const map = await window.electronAPI.createMindMap(newMapName.trim())
    setNewMapName('')
    loadMaps()
    setSelectedMapId(map.id)
  }

  const handleDeleteMap = async (id: string) => {
    if (!window.confirm('Delete this mind map?')) return
    await window.electronAPI.deleteMindMap(id)
    if (selectedMapId === id) { setSelectedMapId(null); setNodes([]); setEdges([]) }
    loadMaps()
  }

  const renameMap = async () => {
    if (!selectedMapId || !mapName.trim()) return
    await window.electronAPI.renameMindMap(selectedMapId, mapName.trim())
    loadMaps()
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const selectedNode = nodes.find(n => n.selected)

  const deleteNodeById = (nodeId: string) => {
    pushUndo()
    setNodes(nds => {
      const next = nds.filter(n => n.id !== nodeId)
      triggerAutoSave(next, edges)
      return next
    })
    setContextMenu(null)
  }

  const closeContextMenu = () => setContextMenu(null)

  // --- Auto Layout ---
  const autoLayout = () => {
    pushUndo()
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 150 })

    nodes.forEach(n => dagreGraph.setNode(n.id, { width: 200, height: 80 }))
    edges.forEach(e => dagreGraph.setEdge(e.source, e.target))

    dagre.layout(dagreGraph)

    setNodes(nds => {
      const next = nds.map(n => {
        const pos = dagreGraph.node(n.id)
        if (!pos) return n
        return { ...n, position: { x: pos.x - 100, y: pos.y - 40 } }
      })
      triggerAutoSave(next, edges)
      return next
    })
  }

  // --- Export ---
  const exportPng = async () => {
    if (!reactFlowWrapper.current) return
    const dataUrl = await toPng(reactFlowWrapper.current, { backgroundColor: '#1e1e2e' })
    const link = document.createElement('a')
    link.download = `${mapName.replace(/\s+/g, '_')}.png`
    link.href = dataUrl
    link.click()
    setExportOpen(false)
  }

  const exportSvg = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '2000')
    svg.setAttribute('height', '2000')
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const minX = Math.min(...nodes.map(n => n.position.x)) - 50
    const minY = Math.min(...nodes.map(n => n.position.y)) - 50

    edges.forEach(e => {
      const s = nodes.find(n => n.id === e.source)
      const t = nodes.find(n => n.id === e.target)
      if (!s || !t) return
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(s.position.x + 200))
      line.setAttribute('y1', String(s.position.y + 40))
      line.setAttribute('x2', String(t.position.x))
      line.setAttribute('y2', String(t.position.y + 40))
      line.setAttribute('stroke', '#89b4fa')
      line.setAttribute('stroke-width', '2')
      line.setAttribute('marker-end', 'url(#arrow)')
      svg.appendChild(line)
    })

    nodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', String(n.position.x))
      rect.setAttribute('y', String(n.position.y))
      rect.setAttribute('width', '200')
      rect.setAttribute('height', '80')
      rect.setAttribute('rx', '12')
      rect.setAttribute('fill', (n.data.color as string) || '#89b4fa')
      g.appendChild(rect)

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', String(n.position.x + 100))
      text.setAttribute('y', String(n.position.y + 48))
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('fill', '#1e1e2e')
      text.setAttribute('font-size', '14')
      text.setAttribute('font-weight', 'bold')
      text.textContent = `${n.data.emoji || ''} ${n.data.label}`.trim()
      g.appendChild(text)
      svg.appendChild(g)
    })

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
    marker.setAttribute('id', 'arrow')
    marker.setAttribute('viewBox', '0 0 10 10')
    marker.setAttribute('refX', '10')
    marker.setAttribute('refY', '5')
    marker.setAttribute('markerWidth', '6')
    marker.setAttribute('markerHeight', '6')
    marker.setAttribute('orient', 'auto')
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    arrowPath.setAttribute('d', 'M0 0L10 5L0 10Z')
    arrowPath.setAttribute('fill', '#89b4fa')
    marker.appendChild(arrowPath)
    defs.appendChild(marker)
    svg.prepend(defs)

    const fullSvg = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([fullSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${mapName.replace(/\s+/g, '_')}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  const exportMarkdown = () => {
    const roots = nodes.filter(n => !edges.some(e => e.target === n.id))
    const visited = new Set<string>()
    const lines: string[] = [`# ${mapName}\n`]
    const walk = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return
      const prefix = '#'.repeat(Math.min(depth + 2, 6))
      lines.push(`${prefix} ${node.data.emoji || ''} ${node.data.label}`.trim())
      edges.filter(e => e.source === nodeId).forEach(e => walk(e.target, depth + 1))
    }
    roots.forEach(r => walk(r.id, 0))

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${mapName.replace(/\s+/g, '_')}.md`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
  }

  // --- Expand / Collapse ---
  const visibleNodes = nodes.filter(n => !n.data._hidden)
  const visibleEdges = edges.filter(e => {
    const s = nodes.find(n => n.id === e.source)
    const t = nodes.find(n => n.id === e.target)
    return s && t && !s.data._hidden && !t.data._hidden
  })

  const toggleCollapse = (nodeId: string) => {
    pushUndo()
    setNodes(nds => {
      const node = nds.find(n => n.id === nodeId)
      if (!node) return nds
      const wasCollapsed = node.data.collapsed
      const descendants = getDescendants(nodeId, edges)
      const childCount = descendants.size

      const next = nds.map(n => {
        if (n.id === nodeId) return { ...n, data: { ...n.data, collapsed: !wasCollapsed, childCount } }
        if (descendants.has(n.id)) return { ...n, data: { ...n.data, _hidden: !wasCollapsed } }
        return n
      })
      triggerAutoSave(next, edges)
      return next
    })
    setContextMenu(null)
  }

  // --- Edges ---
  const [edgeLabelInput, setEdgeLabelInput] = useState('')

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 -m-6">
      {/* Sidebar — map list */}
      <div className="w-52 shrink-0 border-r flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {maps.map(m => (
            <div key={m.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm group transition-colors"
              style={{ backgroundColor: selectedMapId === m.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              onClick={() => setSelectedMapId(m.id)}
            >
              <span>🧠</span>
              <span className="truncate flex-1">{m.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(m.updated_at)}</span>
              <button onClick={e => { e.stopPropagation(); handleDeleteMap(m.id) }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>✕</button>
            </div>
          ))}
        </div>
        <div className="p-2 border-t flex gap-1" style={{ borderColor: 'var(--border)' }}>
          <input value={newMapName} onChange={e => setNewMapName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateMap()}
            placeholder="New map..."
            className="flex-1 border rounded px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          <button onClick={handleCreateMap} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+</button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {selectedMapId ? (
          <>
            {/* Toolbar */}
            <div className="px-4 py-2 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <input value={mapName} onChange={e => setMapName(e.target.value)} onBlur={renameMap}
                className="text-sm font-semibold bg-transparent border-none outline-none" style={{ color: 'var(--text-primary)', width: 200 }} />
              <div className="flex items-center gap-1 ml-auto">
                {/* Undo/Redo */}
                <button onClick={undo} title="Undo (Ctrl+Z)"
                  className="px-2 py-1 rounded text-xs" style={{ color: 'var(--text-primary)' }}
                  disabled={undoStack.length === 0}>↩</button>
                <button onClick={redo} title="Redo (Ctrl+Shift+Z)"
                  className="px-2 py-1 rounded text-xs" style={{ color: 'var(--text-primary)' }}
                  disabled={redoStack.length === 0}>↪</button>

                <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />

                {/* Auto Layout */}
                <button onClick={autoLayout} title="Auto Layout"
                  className="px-2 py-1 rounded text-xs" style={{ color: 'var(--text-primary)' }}>⟐ Layout</button>

                {/* MiniMap toggle */}
                <button onClick={() => setShowMinimap(p => !p)} title="Toggle Minimap"
                  className="px-2 py-1 rounded text-xs" style={{ color: showMinimap ? 'var(--accent)' : 'var(--text-primary)' }}>🗺</button>

                <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />

                <input type="color" value={nodeColor} onChange={e => setNodeColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0" title="Node color" />
                <div className="relative">
                  <button onClick={() => setEmojiPickerOpen(emojiPickerOpen === 'new' ? null : 'new')}
                    className="w-8 h-7 flex items-center justify-center border rounded text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                    {nodeEmoji || '😀'}
                  </button>
                  {emojiPickerOpen === 'new' && (
                    <EmojiPicker value={nodeEmoji} onChange={setNodeEmoji} onClose={() => setEmojiPickerOpen(null)} />
                  )}
                </div>
                <button onClick={addNode} className="px-2.5 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+ Node</button>

                {/* Export */}
                <div className="relative">
                  <button onClick={() => setExportOpen(p => !p)}
                    className="px-2 py-1 rounded text-xs" style={{ color: 'var(--text-primary)' }}>⬇ Export</button>
                  {exportOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-xl border min-w-[130px]"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                      <button onClick={exportPng} className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70" style={{ color: 'var(--text-primary)' }}>🖼 PNG</button>
                      <button onClick={exportSvg} className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70" style={{ color: 'var(--text-primary)' }}>🖼 SVG</button>
                      <button onClick={exportMarkdown} className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70" style={{ color: 'var(--text-primary)' }}>📝 Markdown</button>
                    </div>
                  )}
                </div>

                {selectedNode && (
                  <>
                    <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />
                    <input value={selectedNode.data.label} onChange={e => updateNodeData(selectedNode.id, { label: e.target.value })}
                      className="border rounded px-2 py-0.5 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', width: 120 }} />
                    <input type="color" value={selectedNode.data.color} onChange={e => updateNodeData(selectedNode.id, { color: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0" />
                    <div className="relative">
                      <button onClick={() => setEmojiPickerOpen(emojiPickerOpen === selectedNode.id ? null : selectedNode.id)}
                        className="w-7 h-6 flex items-center justify-center border rounded text-sm" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                        {selectedNode.data.emoji || '😀'}
                      </button>
                      {emojiPickerOpen === selectedNode.id && (
                        <EmojiPicker value={selectedNode.data.emoji || ''} onChange={v => updateNodeData(selectedNode.id, { emoji: v })} onClose={() => setEmojiPickerOpen(null)} />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* Flow canvas */}
            <div className="flex-1 relative" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={visibleNodes}
                edges={visibleEdges}
                onNodesChange={onNodesChangeHandler}
                onEdgesChange={onEdgesChangeHandler}
                onConnect={onConnectHandler}
                onInit={setReactFlowInstance}
                onNodeContextMenu={(e, node) => {
                  e.preventDefault()
                  closeContextMenu()
                  setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
                }}
                onDoubleClickCapture={e => {
                  if (contextMenu && (e.target as HTMLElement).closest('.react-flow__node')) return
                  closeContextMenu()
                }}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode="Delete"
                onNodesDelete={deleteSelected}
              >
                {showMinimap && <MiniMap
                  nodeStrokeColor="var(--accent)"
                  nodeColor="var(--bg-secondary)"
                  nodeBorderRadius={8}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                />}
                <Controls />
                <Background color="var(--border)" gap={20} />
              </ReactFlow>
              {contextMenu && (
                <div
                  className="fixed z-50 py-1 rounded-lg shadow-xl border min-w-[150px]"
                  style={{ left: contextMenu.x, top: contextMenu.y, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  onClick={closeContextMenu}
                >
                  <button
                    onClick={() => {
                      setNodes(nds => nds.map(n => ({ ...n, selected: n.id === contextMenu.nodeId })))
                      closeContextMenu()
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => toggleCollapse(contextMenu.nodeId)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {nodes.find(n => n.id === contextMenu.nodeId)?.data.collapsed ? '🔓 Expand' : '🔒 Collapse'}
                  </button>
                  <button
                    onClick={() => deleteNodeById(contextMenu.nodeId)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--danger)' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a mind map or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
