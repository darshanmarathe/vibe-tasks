import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState, Controls, Background, MiniMap,
  MarkerType, type Connection, type Edge, type Node, type NodeProps, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import dagre from 'dagre'
import type { MindMap } from '../types/models'
import LinkInput from '../components/LinkInput'

const EMOJIS = [
  '😀', '😎', '🚀', '💡', '⭐', '🎯', '❤️', '🔥',
  '✅', '📌', '🎨', '💻', '📊', '📈', '🎉', '🏆',
  '🔍', '⚡', '💪', '🧠', '📝', '🗂️', '🔗', '🔄',
  '🌟', '💎', '🎵', '📚', '✏️', '📦', '🛠️', '🎮',
]

const SHAPE_LABELS: Record<string, string> = {
  rounded: 'Rounded',
  diamond: 'Diamond',
  parallelogram: 'Para.',
  cylinder: 'Cylinder',
  circle: 'Circle',
  hexagon: 'Hexagon',
}

function RoundedNode({ data, selected }: NodeProps) {
  const childCount = data.childCount || 0
  const highlighted = data._highlight
  return (
    <div className="rounded-xl border-2 px-4 py-3 shadow-lg min-w-[140px] transition-shadow"
      style={{
        backgroundColor: data.color || '#89b4fa', borderColor: selected ? '#fff' : 'transparent',
        color: '#1e1e2e', opacity: highlighted === false ? 0.3 : 1,
        boxShadow: highlighted === true ? '0 0 0 3px var(--accent)' : undefined,
      }}>
      <div className="text-center">
        {data.emoji && <span className="text-2xl mr-1">{data.emoji}</span>}
        <span className="font-semibold text-sm">{data.label}</span>
        {data.collapsed && childCount > 0 && <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>+{childCount}</span>}
      </div>
      {data.image && <img src={data.image} alt="" className="mt-2 mx-auto max-w-[120px] max-h-[80px] rounded-lg object-cover" />}
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function DiamondNode({ data, selected }: NodeProps) {
  const s = data._highlight
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" className="absolute inset-0">
        <polygon points="60,5 115,60 60,115 5,60"
          fill={data.color || '#89b4fa'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2}
          opacity={s === false ? 0.3 : 1} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e', opacity: s === false ? 0.3 : 1 }}>
        {data.emoji && <div className="text-lg">{data.emoji}</div>}
        <div className="text-xs font-semibold leading-tight">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Top} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function ParallelogramNode({ data, selected }: NodeProps) {
  const s = data._highlight
  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 70 }}>
      <svg width="160" height="70" className="absolute inset-0">
        <polygon points="25,5 155,5 135,65 5,65"
          fill={data.color || '#89b4fa'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2}
          opacity={s === false ? 0.3 : 1} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e', opacity: s === false ? 0.3 : 1 }}>
        {data.emoji && <span className="text-lg mr-1">{data.emoji}</span>}
        <span className="text-xs font-semibold">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function CylinderNode({ data, selected }: NodeProps) {
  const s = data._highlight
  const w = 140, h = 90
  return (
    <div className="relative flex items-center justify-center" style={{ width: w, height: h }}>
      <svg width={w} height={h} className="absolute inset-0">
        <ellipse cx={w / 2} cy={12} rx={w / 2 - 5} ry={12} fill={data.color || '#89b4fa'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} opacity={s === false ? 0.3 : 1} />
        <rect x={5} y={12} width={w - 10} height={h - 24} fill={data.color || '#89b4fa'}
          opacity={s === false ? 0.3 : 1} />
        <ellipse cx={w / 2} cy={h - 12} rx={w / 2 - 5} ry={12} fill={data.color || '#89b4fa'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} opacity={s === false ? 0.3 : 1} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e', opacity: s === false ? 0.3 : 1 }}>
        {data.emoji && <div className="text-lg">{data.emoji}</div>}
        <div className="text-xs font-semibold leading-tight">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Top} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function CircleNode({ data, selected }: NodeProps) {
  const s = data._highlight
  return (
    <div className="relative flex items-center justify-center rounded-full" style={{
      width: 100, height: 100,
      backgroundColor: data.color || '#89b4fa',
      border: selected ? '2px solid #fff' : '2px solid transparent',
      opacity: s === false ? 0.3 : 1,
    }}>
      <div className="text-center" style={{ color: '#1e1e2e' }}>
        {data.emoji && <div className="text-xl">{data.emoji}</div>}
        <div className="text-xs font-semibold leading-tight px-1">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function HexagonNode({ data, selected }: NodeProps) {
  const s = data._highlight
  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 110 }}>
      <svg width="130" height="110" className="absolute inset-0">
        <polygon points="65,5 125,30 125,80 65,105 5,80 5,30"
          fill={data.color || '#89b4fa'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2}
          opacity={s === false ? 0.3 : 1} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e', opacity: s === false ? 0.3 : 1 }}>
        {data.emoji && <div className="text-lg">{data.emoji}</div>}
        <div className="text-xs font-semibold leading-tight">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

const nodeTypes = {
  rounded: RoundedNode,
  diamond: DiamondNode,
  parallelogram: ParallelogramNode,
  cylinder: CylinderNode,
  circle: CircleNode,
  hexagon: HexagonNode,
}

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
  const [nodeShape, setNodeShape] = useState('rounded')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<'new' | string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  const [edgeContextMenu, setEdgeContextMenu] = useState<{ x: number; y: number; edgeId: string } | null>(null)
  const [edgeLabelInput, setEdgeLabelInput] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([])
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [notesText, setNotesText] = useState('')
  const [showMarkdownImport, setShowMarkdownImport] = useState(false)
  const [markdownText, setMarkdownText] = useState('')
  const [zoomSpeed, setZoomSpeed] = useState(1)
  const [imageTargetNodeId, setImageTargetNodeId] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const notesTimer = useRef<number | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const autoSaveTimer = useRef<number | null>(null)
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null)

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
    setSearchQuery('')
    setShowNotesPanel(false)
    setNodes(map.nodes.map((n: any) => {
      const shape = n.shape || 'rounded'
      return {
        id: n.id,
        type: shape,
        position: { x: n.x, y: n.y },
        data: { label: n.title, color: n.color, emoji: n.emoji, notes: n.notes, image: n.image || '', shape, collapsed: false },
      }
    }))
    setEdges(map.edges.map((e: any) => ({
      id: e.id,
      source: e.from_node,
      target: e.to_node,
      label: e.label || undefined,
      type: e.edge_type === 'default' ? undefined : (e.edge_type || undefined),
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
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        const selected = nodes.filter(n => n.selected)
        if (selected.length > 0) {
          const relatedEdges = edges.filter(e => selected.some(n => n.id === e.source || n.id === e.target))
          clipboardRef.current = { nodes: structuredClone(selected), edges: structuredClone(relatedEdges) }
        }
        return
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'v' && clipboardRef.current) {
        e.preventDefault()
        pushUndo()
        const idMap = new Map<string, string>()
        const pastedNodes: Node[] = clipboardRef.current.nodes.map(n => {
          const newId = `paste_${Date.now()}_${n.id}`
          idMap.set(n.id, newId)
          return { ...n, id: newId, position: { x: n.position.x + 50, y: n.position.y + 50 }, selected: false }
        })
        const pastedEdges: Edge[] = clipboardRef.current.edges.map(e => ({
          ...e,
          id: `paste_${Date.now()}_${e.id}`,
          source: idMap.get(e.source) || e.source,
          target: idMap.get(e.target) || e.target,
        }))
        setNodes(nds => {
          const next = [...nds, ...pastedNodes]
          triggerAutoSave(next, edges)
          return next
        })
        setEdges(eds => {
          const next = [...eds, ...pastedEdges]
          triggerAutoSave(nodes, next)
          return next
        })
        return
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [undo, redo, nodes, edges])

  const triggerAutoSave = (ns?: Node[], es?: Edge[]) => {
    if (!selectedMapId) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(async () => {
      const visibleNodes = (ns || nodes).filter(n => !n.data._hidden)
      const nodeData = visibleNodes.map(n => ({
        id: n.id, map_id: selectedMapId,
        title: n.data.label, color: n.data.color, emoji: n.data.emoji || '', notes: n.data.notes || '',
        image: n.data.image || '', shape: n.data.shape || 'rounded',
        x: n.position.x, y: n.position.y, width: n.width || 200, height: n.height || 80,
      }))
      const edgeData = (es || edges).map(e => ({
        id: e.id, map_id: selectedMapId, from_node: e.source, to_node: e.target,
        label: e.label || '', dashed: e.style?.strokeDasharray ? 1 : 0,
        edge_type: e.type || 'default',
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
    const shape = nodeShape
    const newNode: Node = {
      id,
      type: shape,
      position: center,
      data: { label: 'New Node', color: nodeColor, emoji: nodeEmoji, shape, collapsed: false, notes: '', image: '' },
    }
    setNodes(nds => {
      const next = [...nds, newNode]
      triggerAutoSave(next, edges)
      return next
    })
  }

  const updateNodeData = (nodeId: string, data: Partial<{ label: string; color: string; emoji: string; notes: string; image: string }>) => {
    pushUndo()
    setNodes(nds => {
      const next = nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)
      triggerAutoSave(next, edges)
      return next
    })
  }

  const changeNodeShape = (nodeId: string, shape: string) => {
    pushUndo()
    setNodes(nds => {
      const next = nds.map(n => n.id === nodeId ? { ...n, type: shape, data: { ...n.data, shape } } : n)
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

  const closeContextMenu = () => { setContextMenu(null); setEdgeContextMenu(null) }

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

  // --- Edge Label & Style ---
  const openEdgeContext = (e: React.MouseEvent, edge: Edge) => {
    e.preventDefault()
    closeContextMenu()
    setEdgeLabelInput(edge.label || '')
    setEdgeContextMenu({ x: e.clientX, y: e.clientY, edgeId: edge.id })
  }

  const updateEdgeLabel = (label: string) => {
    setEdges(eds => {
      const next = eds.map(e => e.id === edgeContextMenu?.edgeId ? { ...e, label: label || undefined } : e)
      triggerAutoSave(nodes, next)
      return next
    })
  }

  const toggleEdgeDashed = () => {
    setEdges(eds => {
      const next = eds.map(e => {
        if (e.id !== edgeContextMenu?.edgeId) return e
        const isDashed = e.style?.strokeDasharray ? true : false
        return { ...e, style: isDashed ? undefined : { strokeDasharray: '5 5' } }
      })
      triggerAutoSave(nodes, next)
      return next
    })
    setEdgeContextMenu(null)
  }

  // --- Search / Filter ---
  const searchFilteredNodes = searchQuery
    ? visibleNodes.map(n => {
        const match = (n.data.label as string).toLowerCase().includes(searchQuery.toLowerCase())
          || ((n.data.notes as string) || '').toLowerCase().includes(searchQuery.toLowerCase())
        return { ...n, data: { ...n.data, _highlight: match ? true : false } }
      })
    : visibleNodes.map(n => ({ ...n, data: { ...n.data, _highlight: undefined } }))

  // --- Node Notes ---
  const handleOpenNotes = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === nodeId })))
    setNotesText((node.data.notes as string) || '')
    setShowNotesPanel(true)
    setContextMenu(null)
  }

  const handleNotesChange = (val: string) => {
    setNotesText(val)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = window.setTimeout(() => {
      if (selectedNode) updateNodeData(selectedNode.id, { notes: val })
    }, 500)
  }

  // Keep notesText in sync when switching selected node
  useEffect(() => {
    if (showNotesPanel && selectedNode) {
      setNotesText((selectedNode.data.notes as string) || '')
    }
  }, [selectedNode?.id])

  // --- Node Images ---
  const handleImageClick = () => {
    if (!contextMenu) return
    setImageTargetNodeId(contextMenu.nodeId)
    setContextMenu(null)
    setTimeout(() => imageInputRef.current?.click(), 50)
  }

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !imageTargetNodeId) return
    const reader = new FileReader()
    reader.onload = () => {
      updateNodeData(imageTargetNodeId, { image: reader.result as string })
      setImageTargetNodeId(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // --- Markdown Import ---
  const importMarkdown = () => {
    pushUndo()
    const lines = markdownText.split('\n').filter(l => l.trim())
    const nodeMap = new Map<number, string>()
    const newEdges: { from: string; to: string }[] = []
    const newNodeList: Node[] = []
    let stack: { id: string; level: number }[] = []
    let idx = 0

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (!match) continue
      const level = match[1].length
      const text = match[2].trim()
      const id = `import_${idx++}`
      const newNode: Node = {
        id,
        type: 'rounded',
        position: { x: 200 + (level - 1) * 250, y: idx * 100 },
        data: { label: text, color: '#89b4fa', emoji: '', shape: 'rounded', collapsed: false, notes: '', image: '' },
      }
      newNodeList.push(newNode)

      while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop()
      if (stack.length > 0) newEdges.push({ from: stack[stack.length - 1].id, to: id })
      stack.push({ id, level })
    }

    setNodes(nds => {
      const next = [...nds, ...newNodeList]
      triggerAutoSave(next, edges)
      return next
    })
    setEdges(eds => {
      const newEdgeObjs = newEdges.map(e => ({
        id: `e_${e.from}_${e.to}`,
        source: e.from,
        target: e.to,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
      }))
      const next = [...eds, ...newEdgeObjs] as Edge[]
      triggerAutoSave(nodes, next)
      return next
    })
    setShowMarkdownImport(false)
    setMarkdownText('')
  }

  // --- Zoom Speed ---
  const handleZoomSpeedChange = (speed: number) => {
    setZoomSpeed(speed)
  }

  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('mindmap-sidebar') !== '0')

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 -m-6" style={{ position: 'relative' }}>
      {/* Sidebar — map list */}
      <div className="shrink-0 border-r flex flex-col transition-all duration-200 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', width: sidebarOpen ? 208 : 0 }}>
        <div className="flex items-center justify-between p-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          {sidebarOpen && <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>MAPS</span>}
          <button onClick={() => { setSidebarOpen(false); localStorage.setItem('mindmap-sidebar', '0') }}
            className="text-xs px-1" style={{ color: 'var(--text-muted)' }}
            title="Collapse sidebar">◀</button>
        </div>
        {sidebarOpen && (<>
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
        </>)}
      </div>

      {!sidebarOpen && (
        <button onClick={() => { setSidebarOpen(true); localStorage.setItem('mindmap-sidebar', '1') }}
          className="absolute left-0 top-2 z-10 text-xs px-1 py-2 rounded-r transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Expand sidebar">▶</button>
      )}

      {/* Canvas */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {selectedMapId ? (
          <>
            {/* Toolbar */}
            <div className="px-4 py-2 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <input value={mapName} onChange={e => setMapName(e.target.value)} onBlur={renameMap}
                className="text-sm font-semibold bg-transparent border-none outline-none" style={{ color: 'var(--text-primary)', width: 160 }} />
              {/* Search */}
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 Search..."
                className="border rounded px-2 py-1 text-xs w-28" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
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

                {/* Zoom Speed */}
                <select value={zoomSpeed} onChange={e => handleZoomSpeedChange(Number(e.target.value))}
                  className="border rounded px-1 py-1 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} title="Zoom Speed">
                  <option value={0.5}>🐢 0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>🐇 2x</option>
                  <option value={3}>3x</option>
                </select>

                {/* Markdown Import */}
                <button onClick={() => setShowMarkdownImport(true)} title="Import from Markdown"
                  className="px-2 py-1 rounded text-xs" style={{ color: 'var(--text-primary)' }}>📥 MD</button>

                <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />

                {!selectedNode && (
                  <>
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
                    <div className="flex items-center gap-0.5">
                      {Object.keys(SHAPE_LABELS).map(s => (
                        <button key={s} onClick={() => setNodeShape(s)}
                          className="w-6 h-6 text-[10px] rounded border flex items-center justify-center"
                          style={{
                            backgroundColor: nodeShape === s ? 'var(--accent)' : 'var(--bg-primary)',
                            borderColor: nodeShape === s ? 'var(--accent)' : 'var(--border)',
                            color: nodeShape === s ? '#fff' : 'var(--text-primary)',
                          }}
                          title={SHAPE_LABELS[s]}>{SHAPE_LABELS[s].slice(0, 3)}</button>
                      ))}
                    </div>
                    <button onClick={addNode} className="px-2.5 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+ Node</button>
                  </>
                )}

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
                      className="border rounded px-2 py-0.5 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', width: 100 }} />
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
                    <div className="flex items-center gap-0.5">
                      {Object.keys(SHAPE_LABELS).map(s => (
                        <button key={s} onClick={() => changeNodeShape(selectedNode.id, s)}
                          className="w-6 h-6 text-[10px] rounded border flex items-center justify-center"
                          style={{
                            backgroundColor: selectedNode.type === s ? 'var(--accent)' : 'var(--bg-primary)',
                            borderColor: selectedNode.type === s ? 'var(--accent)' : 'var(--border)',
                            color: selectedNode.type === s ? '#fff' : 'var(--text-primary)',
                          }}
                          title={SHAPE_LABELS[s]}>{SHAPE_LABELS[s].slice(0, 3)}</button>
                      ))}
                    </div>
                    <button onClick={() => { setNotesText((selectedNode.data.notes as string) || ''); setShowNotesPanel(true) }}
                      className="px-2 py-1 rounded text-xs" style={{ color: (selectedNode.data.notes as string) ? 'var(--accent)' : 'var(--text-muted)' }} title="Node Notes">
                      📝 Notes
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Flow canvas */}
            <div className="flex-1 relative" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={searchFilteredNodes}
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
                onEdgeContextMenu={openEdgeContext}
                nodeTypes={nodeTypes}
                fitView
                deleteKeyCode="Delete"
                onNodesDelete={deleteSelected}
                zoomOnScroll={true}
                minZoom={0.1}
                maxZoom={4}
                snapToGrid
                snapGrid={[20, 20]}
                selectionOnDrag
                panOnDrag={[1, 2]}
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

              {/* Hidden file input for images */}
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />

              {/* Node Context Menu */}
              {contextMenu && (
                <div
                  className="fixed z-50 py-1 rounded-lg shadow-xl border min-w-[150px]"
                  style={{ left: contextMenu.x, top: contextMenu.y, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  onClick={closeContextMenu}
                >
                  <button onClick={() => { setNodes(nds => nds.map(n => ({ ...n, selected: n.id === contextMenu.nodeId }))); closeContextMenu() }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => { handleOpenNotes(contextMenu.nodeId); closeContextMenu() }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}>
                    📝 Notes
                  </button>
                  <button onClick={handleImageClick}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}>
                    🖼 Add Image
                  </button>
                  <button onClick={() => toggleCollapse(contextMenu.nodeId)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}>
                    {nodes.find(n => n.id === contextMenu.nodeId)?.data.collapsed ? '🔓 Expand' : '🔒 Collapse'}
                  </button>
                  <button onClick={() => deleteNodeById(contextMenu.nodeId)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--danger)' }}>
                    🗑️ Delete
                  </button>
                </div>
              )}

              {/* Edge Context Menu */}
              {edgeContextMenu && (
                <div
                  className="fixed z-50 py-1 rounded-lg shadow-xl border min-w-[180px]"
                  style={{ left: edgeContextMenu.x, top: edgeContextMenu.y, backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5">
                    <input value={edgeLabelInput} onChange={e => setEdgeLabelInput(e.target.value)} placeholder="Edge label..."
                      className="w-full border rounded px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { updateEdgeLabel(edgeLabelInput); setEdgeContextMenu(null) }
                      }} />
                  </div>
                  <button onClick={() => { updateEdgeLabel(edgeLabelInput); setEdgeContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}>
                    ✅ Set Label
                  </button>
                  <button onClick={toggleEdgeDashed}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}>
                    {(() => {
                      const edge = edges.find(e => e.id === edgeContextMenu.edgeId)
                      return edge?.style?.strokeDasharray ? '➖ Solid Style' : '➖ Dashed Style'
                    })()}
                  </button>
                  <button onClick={() => {
                    const edge = edges.find(e => e.id === edgeContextMenu.edgeId)
                    const nextType = edge?.type === 'smoothstep' ? undefined : 'smoothstep'
                    setEdges(eds => {
                      const next = eds.map(e => e.id === edgeContextMenu.edgeId ? { ...e, type: nextType } : e)
                      triggerAutoSave(nodes, next)
                      return next
                    })
                    setEdgeContextMenu(null)
                  }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--text-primary)' }}>
                    {(() => {
                      const edge = edges.find(e => e.id === edgeContextMenu.edgeId)
                      return edge?.type === 'smoothstep' ? '📐 Bezier Route' : '📐 Smoothstep Route'
                    })()}
                  </button>
                  <button onClick={() => { setEdges(eds => { const next = eds.filter(e => e.id !== edgeContextMenu.edgeId); triggerAutoSave(nodes, next); return next }); setEdgeContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70 flex items-center gap-2"
                    style={{ color: 'var(--danger)' }}>
                    🗑️ Delete Edge
                  </button>
                </div>
              )}
            </div>

            {/* Notes Panel */}
            {showNotesPanel && selectedNode && (
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', maxHeight: 280 }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    📝 Notes — {selectedNode.data.label as string}
                  </span>
                  <button onClick={() => setShowNotesPanel(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
                <textarea value={notesText} onChange={e => handleNotesChange(e.target.value)} rows={2}
                  className="w-full border rounded px-2 py-1 text-xs resize-none"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Add notes for this node..." />
                <div className="mt-2">
                  <LinkInput linkedType="mindmap" linkedId={selectedNode.id} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a mind map or create a new one</p>
          </div>
        )}
      </div>

      {/* Markdown Import Dialog */}
      {showMarkdownImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-2xl border p-4 w-[500px] max-w-[90vw]" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📥 Import from Markdown</span>
              <button onClick={() => setShowMarkdownImport(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Paste Markdown with headings (# ## ###). Each heading becomes a node, hierarchy creates connections.
            </p>
            <textarea value={markdownText} onChange={e => setMarkdownText(e.target.value)} rows={10}
              className="w-full border rounded px-2 py-1 text-xs font-mono resize-none"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder={`# Main Idea\n## Subtopic 1\n### Detail A\n### Detail B\n## Subtopic 2`} />
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setShowMarkdownImport(false)}
                className="px-3 py-1.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={importMarkdown} disabled={!markdownText.trim()}
                className="px-3 py-1.5 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: markdownText.trim() ? 1 : 0.5 }}>Import</button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
