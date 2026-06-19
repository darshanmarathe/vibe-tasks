import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState, Controls, Background, MiniMap,
  MarkerType, type Connection, type Edge, type Node, type NodeProps, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import type { Diagram } from '../types/models'

const SHAPE_LABELS: Record<string, string> = {
  rectangle: 'Rectangle',
  diamond: 'Diamond',
  parallelogram: 'Para.',
  cylinder: 'Cylinder',
  circle: 'Circle',
  hexagon: 'Hexagon',
  server: 'Server',
  cloud: 'Cloud',
  mobile: 'Mobile',
  tablet: 'Tablet',
  database: 'Database',
  boundary: 'Boundary',
}

interface StencilItem {
  type: string
  label: string
  color: string
  icon: string
}

const STENCIL_CATEGORIES: { name: string; items: StencilItem[] }[] = [
  {
    name: 'Basic',
    items: [
      { type: 'rectangle', label: 'Rectangle', color: '#89b4fa', icon: '▬' },
      { type: 'diamond', label: 'Diamond', color: '#a6e3a1', icon: '◇' },
      { type: 'parallelogram', label: 'Parallelogram', color: '#fab387', icon: '▱' },
      { type: 'circle', label: 'Circle', color: '#f9e2af', icon: '○' },
      { type: 'hexagon', label: 'Hexagon', color: '#94e2d5', icon: '⬡' },
    ],
  },
  {
    name: 'Compute',
    items: [
      { type: 'server', label: 'Server', color: '#6c7086', icon: '🖥' },
      { type: 'rectangle', label: 'AWS Lambda', color: '#ff9900', icon: 'λ' },
      { type: 'rectangle', label: 'EC2', color: '#ff9900', icon: 'EC2' },
      { type: 'rectangle', label: 'Azure Functions', color: '#0078d4', icon: 'fx' },
      { type: 'rectangle', label: 'ECS', color: '#ff9900', icon: 'ECS' },
    ],
  },
  {
    name: 'Storage',
    items: [
      { type: 'cylinder', label: 'Database', color: '#89b4fa', icon: '🗄' },
      { type: 'cylinder', label: 'S3 Bucket', color: '#ff9900', icon: 'S3' },
      { type: 'cylinder', label: 'Azure SQL', color: '#0078d4', icon: 'SQL' },
      { type: 'cylinder', label: 'DynamoDB', color: '#ff9900', icon: 'DDB' },
      { type: 'cylinder', label: 'Cosmos DB', color: '#0078d4', icon: 'CDB' },
      { type: 'rectangle', label: 'RDS', color: '#ff9900', icon: 'RDS' },
    ],
  },
  {
    name: 'Integration',
    items: [
      { type: 'rectangle', label: 'API Gateway', color: '#ff9900', icon: 'API' },
      { type: 'rectangle', label: 'SQS', color: '#ff9900', icon: 'SQS' },
      { type: 'rectangle', label: 'SNS', color: '#ff9900', icon: 'SNS' },
      { type: 'rectangle', label: 'Load Balancer', color: '#6c7086', icon: '⚖' },
    ],
  },
  {
    name: 'Containers',
    items: [
      { type: 'hexagon', label: 'Kubernetes', color: '#326ce5', icon: 'K8s' },
      { type: 'hexagon', label: 'Docker', color: '#2496ed', icon: '🐋' },
      { type: 'boundary', label: 'Namespace', color: 'transparent', icon: '□' },
    ],
  },
  {
    name: 'Cloud',
    items: [
      { type: 'cloud', label: 'AWS Cloud', color: '#ff9900', icon: 'AWS' },
      { type: 'cloud', label: 'Azure Cloud', color: '#0078d4', icon: 'AZ' },
      { type: 'cloud', label: 'VPC', color: '#89b4fa', icon: 'VPC' },
    ],
  },
  {
    name: 'Devices',
    items: [
      { type: 'mobile', label: 'Phone', color: '#6c7086', icon: '📱' },
      { type: 'tablet', label: 'Tablet', color: '#6c7086', icon: '📟' },
      { type: 'rectangle', label: 'Desktop', color: '#6c7086', icon: '🖥' },
      { type: 'rectangle', label: 'Laptop', color: '#6c7086', icon: '💻' },
    ],
  },
]

// ─── Shape Node Components ───

function RectangleNode({ data, selected }: NodeProps) {
  return (
    <div className="rounded-xl border-2 px-4 py-3 shadow-lg min-w-[130px] max-w-[200px] transition-shadow"
      style={{
        backgroundColor: data.color || '#89b4fa',
        borderColor: selected ? '#fff' : 'transparent',
        color: '#1e1e2e',
        boxShadow: selected ? '0 0 0 2px var(--accent)' : undefined,
      }}>
      <div className="text-center">
        {data.icon && <span className="text-lg mr-1">{data.icon}</span>}
        <span className="font-semibold text-xs">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function DiamondNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" className="absolute inset-0">
        <polygon points="55,5 105,55 55,105 5,55"
          fill={data.color || '#a6e3a1'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e' }}>
        {data.icon && <div className="text-base">{data.icon}</div>}
        <div className="text-[10px] font-semibold leading-tight">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Top} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function ParallelogramNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 150, height: 65 }}>
      <svg width="150" height="65" className="absolute inset-0">
        <polygon points="20,5 145,5 130,60 5,60"
          fill={data.color || '#fab387'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e' }}>
        {data.icon && <span className="text-sm mr-1">{data.icon}</span>}
        <span className="text-[10px] font-semibold">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function CylinderNode({ data, selected }: NodeProps) {
  const w = 130, h = 85
  return (
    <div className="relative flex items-center justify-center" style={{ width: w, height: h }}>
      <svg width={w} height={h} className="absolute inset-0">
        <ellipse cx={w / 2} cy={12} rx={w / 2 - 5} ry={12} fill={data.color || '#89b4fa'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} />
        <rect x={5} y={12} width={w - 10} height={h - 24} fill={data.color || '#89b4fa'} />
        <ellipse cx={w / 2} cy={h - 12} rx={w / 2 - 5} ry={12} fill={data.color || '#89b4fa'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e' }}>
        {data.icon && <div className="text-sm font-bold">{data.icon}</div>}
        <div className="text-[10px] font-semibold leading-tight">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Top} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function CircleNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center rounded-full" style={{
      width: 90, height: 90,
      backgroundColor: data.color || '#f9e2af',
      border: selected ? '2px solid #fff' : '2px solid transparent',
    }}>
      <div className="text-center" style={{ color: '#1e1e2e' }}>
        {data.icon && <div className="text-lg">{data.icon}</div>}
        <div className="text-[10px] font-semibold leading-tight px-1">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function HexagonNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 100 }}>
      <svg width="120" height="100" className="absolute inset-0">
        <polygon points="60,5 115,25 115,75 60,95 5,75 5,25"
          fill={data.color || '#94e2d5'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#1e1e2e' }}>
        {data.icon && <div className="text-sm">{data.icon}</div>}
        <div className="text-[10px] font-semibold leading-tight">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function ServerNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex flex-col" style={{ width: 140, minHeight: 50 }}>
      <svg width="140" height="50" className="absolute inset-0">
        <rect x="10" y="2" width="120" height="46" rx="4" fill={data.color || '#6c7086'}
          stroke={selected ? '#fff' : '#555'} strokeWidth={selected ? 2 : 1} />
        <rect x="0" y="8" width="140" height="34" rx="2" fill="none" stroke={data.color || '#6c7086'} strokeWidth={selected ? 2 : 1} />
        <circle cx="50" cy="25" r="3" fill="#a6e3a1" />
        <circle cx="62" cy="25" r="3" fill="#f9e2af" />
        <circle cx="74" cy="25" r="3" fill="#f38ba8" />
        <rect x="88" y="18" width="30" height="14" rx="2" fill="rgba(0,0,0,0.2)" />
      </svg>
      <div className="relative z-10 flex items-center justify-center px-2" style={{ minHeight: 50, color: '#fff' }}>
        {data.icon && <span className="text-sm mr-1">{data.icon}</span>}
        <span className="text-[10px] font-semibold">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function CloudNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 150, height: 90 }}>
      <svg width="150" height="90" className="absolute inset-0">
        <ellipse cx="75" cy="50" rx="70" ry="30" fill={data.color || '#ff9900'} opacity={0.15} />
        <path d="M40,65 Q20,65 20,50 Q20,38 32,35 Q30,25 40,20 Q50,12 65,15 Q75,5 90,10 Q105,5 115,15 Q130,15 130,30 Q135,30 135,40 Q135,55 120,60 Q120,65 110,65 Z"
          fill={data.color || '#ff9900'}
          stroke={selected ? '#fff' : 'transparent'} strokeWidth={2} />
      </svg>
      <div className="relative z-10 text-center px-2" style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
        {data.icon && <div className="text-xs font-bold">{data.icon}</div>}
        <div className="text-[10px] font-semibold">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function MobileNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 55, height: 100 }}>
      <svg width="55" height="100" className="absolute inset-0">
        <rect x="5" y="2" width="45" height="96" rx="6" fill={data.color || '#6c7086'}
          stroke={selected ? '#fff' : '#555'} strokeWidth={selected ? 2 : 1} />
        <rect x="12" y="12" width="31" height="68" rx="2" fill="rgba(0,0,0,0.3)" />
        <circle cx="27.5" cy="90" r="3" fill="#555" />
      </svg>
      <div className="relative z-10 text-center" style={{ marginTop: 30, color: '#fff' }}>
        <div className="text-[8px] font-semibold leading-tight px-1">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Top} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function TabletNode({ data, selected }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 70 }}>
      <svg width="100" height="70" className="absolute inset-0">
        <rect x="3" y="2" width="94" height="66" rx="6" fill={data.color || '#6c7086'}
          stroke={selected ? '#fff' : '#555'} strokeWidth={selected ? 2 : 1} />
        <rect x="12" y="10" width="76" height="46" rx="2" fill="rgba(0,0,0,0.3)" />
        <circle cx="50" cy="62" r="2" fill="#555" />
      </svg>
      <div className="relative z-10 text-center" style={{ color: '#fff' }}>
        <div className="text-[8px] font-semibold leading-tight">{data.label}</div>
      </div>
      <Handle type="target" position={Position.Top} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

function BoundaryNode({ data, selected }: NodeProps) {
  return (
    <div className="rounded-xl px-6 py-4 border-2 border-dashed min-w-[200px] min-h-[100px] transition-shadow"
      style={{
        borderColor: selected ? '#fff' : data.color || '#6c7086',
        backgroundColor: data.color ? `${data.color}15` : 'transparent',
        color: '#cdd6f4',
      }}>
      <div className="text-center">
        <span className="font-semibold text-xs tracking-wider uppercase opacity-60">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  )
}

const nodeTypes = {
  rectangle: RectangleNode,
  diamond: DiamondNode,
  parallelogram: ParallelogramNode,
  cylinder: CylinderNode,
  circle: CircleNode,
  hexagon: HexagonNode,
  server: ServerNode,
  cloud: CloudNode,
  mobile: MobileNode,
  tablet: TabletNode,
  database: CylinderNode,
  boundary: BoundaryNode,
}

export default function DiagramsPage() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([])
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null)
  const [diagramName, setDiagramName] = useState('')
  const [newDiagramName, setNewDiagramName] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showStencil, setShowStencil] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(STENCIL_CATEGORIES.map(c => c.name)))
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<number | null>(null)

  const loadDiagrams = useCallback(async () => {
    const d = await window.electronAPI.getDiagrams()
    setDiagrams(d)
    if (d.length > 0 && !selectedDiagramId) setSelectedDiagramId(d[0].id)
  }, [])

  useEffect(() => { loadDiagrams() }, [loadDiagrams])

  const loadDiagram = useCallback(async (id: string) => {
    const diagram = await window.electronAPI.getDiagram(id)
    if (!diagram) return
    setDiagramName(diagram.name)
    setNodes(diagram.nodes.map((n: any) => {
      let extra = {}
      try { extra = JSON.parse(n.props_json || '{}') } catch {}
      return {
        id: n.id,
        type: n.type === 'cylinder' && (extra as any).icon ? 'database' : n.type,
        position: { x: n.x, y: n.y },
        data: { label: n.label, color: n.color, icon: (extra as any).icon || '', ...extra },
      }
    }))
    setEdges(diagram.edges.map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || undefined,
      type: e.edge_type === 'default' ? undefined : (e.edge_type || undefined),
      style: e.dashed ? { strokeDasharray: '5 5' } : undefined,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
    })))
  }, [])

  useEffect(() => {
    if (selectedDiagramId) loadDiagram(selectedDiagramId)
  }, [selectedDiagramId, loadDiagram])

  const triggerAutoSave = (ns?: Node[], es?: Edge[]) => {
    if (!selectedDiagramId) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(async () => {
      const nodeData = (ns || nodes).map(n => ({
        id: n.id, diagram_id: selectedDiagramId,
        type: n.type || 'rectangle',
        label: n.data.label || 'Node', color: n.data.color || '#89b4fa',
        x: n.position.x, y: n.position.y,
        width: n.width || 160, height: n.height || 80,
        props_json: JSON.stringify({ icon: n.data.icon || '' }),
      }))
      const edgeData = (es || edges).map(e => ({
        id: e.id, diagram_id: selectedDiagramId, source: e.source, target: e.target,
        label: e.label || '', edge_type: e.type || 'default', dashed: e.style?.strokeDasharray ? 1 : 0,
      }))
      await window.electronAPI.saveDiagram(selectedDiagramId, nodeData, edgeData)
      loadDiagrams()
    }, 1000)
  }

  const onNodesChangeHandler = useCallback((changes: any) => {
    onNodesChange(changes)
    const hasPosChange = changes.some((c: any) => c.type === 'position' && c.dragging === false)
    if (hasPosChange) triggerAutoSave()
  }, [])

  const onEdgesChangeHandler = useCallback((changes: any) => {
    onEdgesChange(changes)
    triggerAutoSave()
  }, [])

  const onConnectHandler = useCallback((conn: Connection) => {
    setEdges(eds => addEdge({
      ...conn,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
    }, eds))
  }, [])

  const onSelectionChange = useCallback(({ nodes: selNodes }: { nodes: Node[] }) => {
    setSelectedNode(selNodes.length === 1 ? selNodes[0] : null)
  }, [])

  const addNodeFromStencil = (item: StencilItem) => {
    if (!reactFlowInstance) return
    const center = reactFlowInstance.screenToFlowPosition({ x: window.innerWidth / 2 - 80, y: window.innerHeight / 2 - 40 })
    const id = `node_${Date.now()}`
    const newNode: Node = {
      id, type: item.type,
      position: center,
      data: { label: item.label, color: item.color, icon: item.icon },
    }
    setNodes(nds => {
      const next = [...nds, newNode]
      triggerAutoSave(next, edges)
      return next
    })
  }

  const updateNodeData = (nodeId: string, data: Partial<{ label: string; color: string; icon: string }>) => {
    setNodes(nds => {
      const next = nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)
      triggerAutoSave(next, edges)
      return next
    })
  }

  const deleteSelected = () => {
    const selectedIds = new Set(nodes.filter(n => n.selected).map(n => n.id))
    setNodes(nds => {
      const next = nds.filter(n => !selectedIds.has(n.id))
      triggerAutoSave(next, edges)
      return next
    })
    setEdges(eds => {
      const next = eds.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target))
      triggerAutoSave(nodes, next)
      return next
    })
  }

  const handleCreateDiagram = async () => {
    if (!newDiagramName.trim()) return
    const diagram = await window.electronAPI.createDiagram(newDiagramName.trim())
    setNewDiagramName('')
    loadDiagrams()
    setSelectedDiagramId(diagram.id)
  }

  const handleDeleteDiagram = async (id: string) => {
    if (!window.confirm('Delete this diagram?')) return
    await window.electronAPI.deleteDiagram(id)
    if (selectedDiagramId === id) { setSelectedDiagramId(null); setNodes([]); setEdges([]) }
    loadDiagrams()
  }

  const renameDiagram = async () => {
    if (!selectedDiagramId || !diagramName.trim()) return
    await window.electronAPI.renameDiagram(selectedDiagramId, diagramName.trim())
    loadDiagrams()
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const exportPng = async () => {
    if (!reactFlowWrapper.current) return
    const dataUrl = await toPng(reactFlowWrapper.current, { backgroundColor: '#1e1e2e' })
    const link = document.createElement('a')
    link.download = `${diagramName.replace(/\s+/g, '_')}.png`
    link.href = dataUrl
    link.click()
    setExportOpen(false)
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 -m-6">
      {/* Left: Diagram List */}
      <div className="w-48 shrink-0 border-r flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {diagrams.map(d => (
            <div key={d.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm group transition-colors"
              style={{ backgroundColor: selectedDiagramId === d.id ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)' }}
              onClick={() => setSelectedDiagramId(d.id)}
            >
              <span>📐</span>
              <span className="truncate flex-1">{d.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(d.updated_at)}</span>
              <button onClick={e => { e.stopPropagation(); handleDeleteDiagram(d.id) }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>✕</button>
            </div>
          ))}
        </div>
        <div className="p-2 border-t flex gap-1" style={{ borderColor: 'var(--border)' }}>
          <input value={newDiagramName} onChange={e => setNewDiagramName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateDiagram()}
            placeholder="New diagram..."
            className="flex-1 border rounded px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          <button onClick={handleCreateDiagram} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>+</button>
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {selectedDiagramId ? (
          <>
            {/* Toolbar */}
            <div className="px-4 py-2 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <input value={diagramName} onChange={e => setDiagramName(e.target.value)} onBlur={renameDiagram}
                className="text-sm font-semibold bg-transparent border-none outline-none" style={{ color: 'var(--text-primary)', width: 160 }} />
              <button onClick={() => setShowStencil(p => !p)} title="Toggle Shape Palette"
                className="px-2 py-1 rounded text-xs" style={{ color: showStencil ? 'var(--accent)' : 'var(--text-primary)' }}>📐 Shapes</button>
              <button onClick={() => setShowMinimap(p => !p)} title="Toggle Minimap"
                className="px-2 py-1 rounded text-xs" style={{ color: showMinimap ? 'var(--accent)' : 'var(--text-primary)' }}>🗺</button>
              <div className="ml-auto flex items-center gap-2">
                {selectedNode && (
                  <>
                    <input value={selectedNode.data.label} onChange={e => updateNodeData(selectedNode.id, { label: e.target.value })}
                      className="border rounded px-2 py-0.5 text-xs w-24" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <input type="color" value={selectedNode.data.color} onChange={e => updateNodeData(selectedNode.id, { color: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0" />
                    <input value={selectedNode.data.icon || ''} onChange={e => updateNodeData(selectedNode.id, { icon: e.target.value })}
                      className="border rounded px-2 py-0.5 text-xs w-16" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Icon" />
                  </>
                )}
                <div className="relative">
                  <button onClick={() => setExportOpen(p => !p)} className="px-2 py-1 rounded text-xs" style={{ color: 'var(--text-primary)' }}>⬇ Export</button>
                  {exportOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-xl border min-w-[100px]"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                      <button onClick={exportPng} className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70" style={{ color: 'var(--text-primary)' }}>🖼 PNG</button>
                    </div>
                  )}
                </div>
                <button onClick={deleteSelected} className="px-2 py-1 rounded text-xs" style={{ color: 'var(--danger)' }}>🗑 Delete</button>
              </div>
            </div>
            {/* Canvas */}
            <div className="flex-1 relative" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChangeHandler}
                onEdgesChange={onEdgesChangeHandler}
                onConnect={onConnectHandler}
                onInit={setReactFlowInstance}
                onSelectionChange={onSelectionChange}
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
                {showMinimap && <MiniMap nodeStrokeColor="var(--accent)" nodeColor="var(--bg-secondary)" nodeBorderRadius={8}
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }} />}
                <Controls />
                <Background color="var(--border)" gap={20} />
              </ReactFlow>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a diagram or create a new one</p>
          </div>
        )}
      </div>

      {/* Right: Stencil Palette */}
      {showStencil && selectedDiagramId && (
        <div className="w-52 shrink-0 border-l overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="p-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Shapes</div>
          {STENCIL_CATEGORIES.map(cat => (
            <div key={cat.name} className="border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setExpandedCategories(prev => {
                  const next = new Set(prev)
                  next.has(cat.name) ? next.delete(cat.name) : next.add(cat.name)
                  return next
                })}
                className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold hover:opacity-70"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>{expandedCategories.has(cat.name) ? '▾' : '▸'}</span>
                {cat.name}
              </button>
              {expandedCategories.has(cat.name) && (
                <div className="px-2 pb-2 grid grid-cols-2 gap-1">
                  {cat.items.map(item => (
                    <button key={item.label}
                      onClick={() => addNodeFromStencil(item)}
                      className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg border text-[10px] transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      title={item.label}
                    >
                      <span className="text-sm font-bold" style={{ color: item.color === 'transparent' ? 'var(--text-muted)' : item.color }}>
                        {item.icon || '□'}
                      </span>
                      <span className="leading-tight text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
