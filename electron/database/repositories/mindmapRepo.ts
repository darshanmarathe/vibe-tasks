import { getDatabase } from '../db'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function getMindMaps(): any[] {
  return getDatabase().exec('SELECT * FROM mindmaps ORDER BY updated_at DESC')
}

export function getMindMap(id: string): any {
  const db = getDatabase()
  const map = db.getSingle('SELECT * FROM mindmaps WHERE id = ?', [id])
  if (!map) return null
  const nodes = db.exec('SELECT * FROM mindmap_nodes WHERE map_id = ? ORDER BY id', [id])
  const edges = db.exec('SELECT * FROM mindmap_edges WHERE map_id = ? ORDER BY id', [id])
  return { ...map, nodes, edges }
}

export function createMindMap(name: string): any {
  const db = getDatabase()
  const id = uid()
  db.run('INSERT INTO mindmaps (id, name) VALUES (?, ?)', [id, name])
  db.save()
  return db.getSingle('SELECT * FROM mindmaps WHERE id = ?', [id])
}

export function renameMindMap(id: string, name: string): void {
  const db = getDatabase()
  db.run('UPDATE mindmaps SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, id])
  db.save()
}

export function deleteMindMap(id: string): void {
  const db = getDatabase()
  db.run('DELETE FROM mindmaps WHERE id = ?', [id])
  db.save()
}

export function saveMindMapNodes(mapId: string, nodes: any[]): void {
  const d = getDatabase()
  d.run('DELETE FROM mindmap_nodes WHERE map_id = ?', [mapId])
  const insert = d.db.prepare('INSERT INTO mindmap_nodes (id, map_id, title, color, emoji, notes, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  for (const n of nodes) {
    insert.run([n.id, mapId, n.title || 'Node', n.color || '#89b4fa', n.emoji || '', n.notes || '', n.x || 0, n.y || 0, n.width || 200, n.height || 80])
  }
  insert.free()
  d.save()
}

export function saveMindMapEdges(mapId: string, edges: any[]): void {
  const d = getDatabase()
  d.run('DELETE FROM mindmap_edges WHERE map_id = ?', [mapId])
  if (edges.length === 0) { d.save(); return }
  const insert = d.db.prepare('INSERT INTO mindmap_edges (id, map_id, from_node, to_node, label, dashed) VALUES (?, ?, ?, ?, ?, ?)')
  for (const e of edges) {
    insert.run([e.id, mapId, e.from_node, e.to_node, e.label || '', e.dashed ? 1 : 0])
  }
  insert.free()
  d.save()
}

export function saveMindMap(mapId: string, nodes: any[], edges: any[]): void {
  const db = getDatabase()
  db.run('UPDATE mindmaps SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [mapId])
  saveMindMapNodes(mapId, nodes)
  saveMindMapEdges(mapId, edges)
}
