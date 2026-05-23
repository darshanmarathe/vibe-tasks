# Mind Map Feature Spec

## Overview
Interactive mind mapping canvas built with @xyflow/react (ReactFlow). Local-first, auto-saving to SQLite. Designed for brainstorming, idea mapping, project planning, and visual organization.

## Architecture
| Layer | Technology |
|---|---|
| Canvas | @xyflow/react (ReactFlow) |
| Persistence | SQLite via sql.js (3 tables: mindmaps, mindmap_nodes, mindmap_edges) |
| IPC | Electron main/preload (6 handlers) |
| State | React useState + useNodesState/useEdgesState |

## Database Schema

| Table | Columns |
|-------|---------|
| mindmaps | id TEXT PK, name TEXT, created_at TEXT, updated_at TEXT |
| mindmap_nodes | id TEXT PK, map_id TEXT FK, title TEXT, color TEXT, emoji TEXT, notes TEXT, x REAL, y REAL, width REAL, height REAL |
| mindmap_edges | id TEXT PK, map_id TEXT FK, from_node TEXT, to_node TEXT, label TEXT, dashed INTEGER |

## Current Features (v1.4.2)

### Canvas
- ✅ Drag, zoom (scroll wheel), pan (middle mouse / space+drag)
- ✅ Fit view button (Controls component)
- ✅ Grid background with configurable gap
- ✅ Animated edge arrows on all connections

### Nodes
- ✅ Custom styled node — rounded, shadow, color-coded
- ✅ Add new node at canvas center via toolbar button
- ✅ Configure color picker and emoji before adding
- ✅ Edit label, color, emoji per-node when selected (toolbar updates in place)
- ✅ Delete selected nodes with Delete key

### Edges
- ✅ Drag from right handle to left handle to connect
- ✅ Animated arrows on all edges

### Emoji Picker
- ✅ 32-emoji visual grid (4×8) for node icons
- ✅ Accessible from toolbar (new node default) and per-node selection
- ✅ "Clear" button to remove emoji
- ✅ Click-outside to close

### Context Menu
- ✅ Right-click any node → popup with ✏️ Edit and 🗑️ Delete
- ✅ Edit clicks the node (selects it in toolbar)
- ✅ Delete removes the node + auto-saves

### Sidebar
- ✅ List of saved mind maps with name and last-updated date
- ✅ Click to load, hover to show delete button
- ✅ Create new map from text input at bottom

### Persistence
- ✅ Auto-save on 1s debounce (position changes, label edits, connections, deletions)
- ✅ 6 IPC handlers: getMindMaps, getMindMap, createMindMap, renameMindMap, deleteMindMap, saveMindMap
- ✅ Cross-session persistence (survives app restart)

## Feature Pipeline (Planned)

### P1 — Quick Wins ✅
| # | Feature | Description |
|---|---------|-------------|
| 1 | ✅ **MiniMap** | Small overview panel in corner showing full map with viewport rectangle |
| 2 | ✅ **Export** | Export as PNG, SVG, or Markdown outline |
| 3 | ✅ **Undo / Redo** | Stack-based undo/redo for node/edge mutations (Ctrl+Z / Ctrl+Shift+Z) |
| 4 | ✅ **Auto Layout** | One-click organize tree/radial layout using dagre |
| 5 | ✅ **Expand / Collapse** | Collapse branches into a single node with child count badge |
| 6 | ✅ **Emoji Visibility** | Emoji displayed at 2x size on nodes |


### P2 — Power Features
| # | Feature | Description |
|---|---------|-------------|
| 6 | **Node Notes** | Per-node rich text (TipTap) for detailed descriptions; expandable panel |
| 7 | **Node Images** | Attach images to nodes (drag-drop or file picker), stored as base64 |
| 8 | **Edge Labels** | Text labels on edges (already in schema — add UI) |
| 9 | **Dashed / Styled Edges** | Toggle edge style (dashed, dotted, thick, colored) via context menu or toolbar |
| 10 | **Search / Filter** | Search bar to highlight/filter nodes by label, notes, or tags |
| 11 | **Markdown Import** | Convert Markdown headings/lists into mind map nodes |
| 12 | **Wheel Zoom Speed** | Configurable zoom sensitivity |

### P3 — Advanced
| # | Feature | Description |
|---|---------|-------------|
| 13 | **Themes** | Canvas background themes (dark gridlines, paper, dot grid, etc.) tied to app theme |
| 14 | **Templates** | Pre-built map structures: Brainstorm, Timeline, Org Chart, SWOT, Project Plan |
| 15 | **Pitch / Presentation** | Auto-traverse nodes as slideshow with focus effect |
| 16 | **ZEN Mode** | Full-screen distraction-free canvas (no toolbar/sidebar, keyboard shortcut toggle) |
| 17 | **Relationships** | Non-connecting relationship lines with labels (dashed, colored) |
| 18 | **Boundaries / Groups** | Colored boundary boxes around selected node groups |
| 19 | **Keyboard Shortcuts** | Quick reference overlay: Tab (new child), Enter (new sibling), Space+click (pan), etc. |
| 20 | **Multiple Selection** | Shift+click or drag-select to batch edit/delete/move |

### P4 — Ecosystem Integration
| # | Feature | Description |
|---|---------|-------------|
| 21 | **Link to Tasks** | Convert a node to a Task (opens task form with title, attaches map ID) |
| 22 | **Link to Notes** | Convert a node to a Note (opens note editor with content from node notes) |
| 23 | **Pin to Dashboard** | Recent mind map widget on Dashboard showing last 5 maps |
| 24 | **Full-Text Search** | Search across all mind map names + node labels from global search |

## Technical Notes
- SVG export: use `react-dom/server` to render flow + `html-to-image` for PNG
- Auto-layout: `dagre` library for tree/radial layout (works with ReactFlow)
- Undo/redo: maintain a `past`/`future` stack of serialized nodes+edges (exclude viewport)
- MiniMap: built-in `<MiniMap>` component from @xyflow/react, just needs styling
- Node notes: reuse TipTap editor component pattern from Notes.tsx
- Search: use ReactFlow's `nodes.forEach` with `data.label.includes(query)` + highlight styling

## Release Roadmap
| Version | Features |
|---------|----------|
| 1.4.2 | ✅ Core canvas, nodes, edges, auto-save, emoji picker, context menu |
| 1.4.3 | ✅ MiniMap, Export (PNG/SVG/MD), Undo/Redo, Auto Layout, Expand/Collapse |
| 1.4.4 | Edge Labels, Node Notes, Search/Filter |
| 1.5.0 | Markdown Import/Export, Templates, Themes, ZEN Mode |
| 1.5.1 | Pitch Mode, Relationships, Boundaries, Multi-select |
| 1.6.0 | Task/Note integration, Dashboard widget, Full-text search |
