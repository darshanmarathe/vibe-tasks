# Spreadsheet Capability — Implementation Plan

## Library: `@fortune-sheet/react` v1.0.4

- **MIT license** — free, open source
- Full Excel-like experience: formulas, cell formatting, merge, copy/paste, undo/redo, sorting, filtering, freeze panes, images, comments, data validation, find & replace
- Pure React component — no jQuery or canvas
- 3.6k GitHub stars, actively maintained

---

## Data Storage

JSON blob approach — store the entire fortune-sheet data array in SQLite:

```sql
CREATE TABLE spreadsheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'Untitled Spreadsheet',
  data TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Simple, and for a desktop app with typical spreadsheet sizes, performance is fine. Auto-save debounced on changes via fortune-sheet's `onOp` callback.

---

## Files to Create (3 new)

| File | Purpose |
|---|---|
| `src/pages/Spreadsheets.tsx` | Main page — list-detail layout (like Notes). Left sidebar lists spreadsheets, right panel renders `<Workbook data={...} />` |
| `electron/database/repositories/spreadsheetRepo.ts` | CRUD: getSpreadsheets, getSpreadsheet, createSpreadsheet, updateSpreadsheet, deleteSpreadsheet |
| `src/components/SpreadsheetList.tsx` | Reusable list item component with rename/delete actions |

## Files to Modify (8 existing)

| File | Changes |
|---|---|
| `package.json` | Add `"@fortune-sheet/react": "^1.0.4"` |
| `electron/database/db.ts` | Add `runSpreadsheetMigrations()` function, call it from init sequence |
| `electron/main.ts` | Add 5 IPC handlers: `spreadsheet:list`, `spreadsheet:get`, `spreadsheet:create`, `spreadsheet:update`, `spreadsheet:delete` |
| `electron/preload.ts` | Expose `getSpreadsheets`, `getSpreadsheet`, `createSpreadsheet`, `updateSpreadsheet`, `deleteSpreadsheet` |
| `electron/preload.cjs` | Same as preload.ts |
| `src/types/models.ts` | Add `Spreadsheet` interface |
| `src/App.tsx` | Add `<Route path="/spreadsheets" element={<Spreadsheets />} />` |
| `src/components/Layout.tsx` | Add `{ path: '/spreadsheets', label: 'Spreadsheets', icon: '📗' }` to the "Knowledge" nav group |

---

## Component Design

```
┌──────────────────────────────────────────────┐
│  Spreadsheets  [+ New]                       │
├───────────────────┬──────────────────────────┤
│  Sheet 1          │                          │
│  Sheet 2          │   fortune-sheet          │
│  Sheet 3          │   Workbook component     │
│                   │   (full spreadsheet UI)  │
│  ───────────      │                          │
│  Import Excel     │                          │
│  Export Excel     │                          │
└───────────────────┴──────────────────────────┘
```

- Left panel: scrollable list, rename on double-click, delete button on hover
- Right panel: `<Workbook data={parsedData} />` with full toolbar
- Auto-save changes debounced at 2 seconds
- Import/Export buttons at bottom of left panel (using SheetJS under the hood)

---

## Fortune-Sheet API Usage

```tsx
import { Workbook } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'

<Workbook
  data={[{ name: 'Sheet1' }]}
  onOp={(ops: Op[]) => {
    // Debounced auto-save: serialize current data and write to DB
  }}
/>
```

Fortune-sheet emits operations via `onOp` whenever the user makes changes. On load, we parse the JSON from the DB and pass it as `data`. On changes, we serialize the workbook state back to JSON and save to SQLite.

---

## NPM Install Required

```
npm install @fortune-sheet/react
```
