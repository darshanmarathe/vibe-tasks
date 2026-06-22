import { getDatabase } from '../db'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function getDiagrams(): any[] {
  return getDatabase().exec('SELECT * FROM diagrams ORDER BY updated_at DESC')
}

export function getDiagram(id: string): any {
  const db = getDatabase()
  const diagram = db.getSingle('SELECT * FROM diagrams WHERE id = ?', [id])
  if (!diagram) return null
  const nodes = db.exec('SELECT * FROM diagram_nodes WHERE diagram_id = ? ORDER BY id', [id])
  const edges = db.exec('SELECT * FROM diagram_edges WHERE diagram_id = ? ORDER BY id', [id])
  return { ...diagram, nodes, edges }
}

export function createDiagram(name: string): any {
  const db = getDatabase()
  const id = uid()
  db.run('INSERT INTO diagrams (id, name) VALUES (?, ?)', [id, name])
  db.save()
  return db.getSingle('SELECT * FROM diagrams WHERE id = ?', [id])
}

export function renameDiagram(id: string, name: string): void {
  const db = getDatabase()
  db.run('UPDATE diagrams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, id])
  db.save()
}

export function deleteDiagram(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM diagrams WHERE id = ?', [id])
  db.save()
}

export function saveDiagram(id: string, nodes: any[], edges: any[]): void {
  const db = getDatabase()
  db.run('UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id])
  db.run('DELETE FROM diagram_nodes WHERE diagram_id = ?', [id])
  db.run('DELETE FROM diagram_edges WHERE diagram_id = ?', [id])
  if (nodes.length > 0) {
    const ni = db.db.prepare('INSERT INTO diagram_nodes (id, diagram_id, type, label, color, x, y, width, height, props_json, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const n of nodes) {
      ni.run([n.id, id, n.type || 'rectangle', n.label || 'Node', n.color || '#89b4fa', n.x || 0, n.y || 0, n.width || 160, n.height || 80, n.props_json || '{}', n.parent_id || null])
    }
    ni.free()
  }
  if (edges.length > 0) {
    const ei = db.db.prepare('INSERT INTO diagram_edges (id, diagram_id, source, target, label, edge_type, dashed) VALUES (?, ?, ?, ?, ?, ?, ?)')
    for (const e of edges) {
      ei.run([e.id, id, e.source, e.target, e.label || '', e.edge_type || 'default', e.dashed ? 1 : 0])
    }
    ei.free()
  }
  db.save()
}
