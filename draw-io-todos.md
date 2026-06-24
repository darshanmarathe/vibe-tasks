# Draw (BETA) — Remaining TODOs

## Bugs

1. **Save/export buttons don't work**
   - `saveToDbFromEditor` and export handlers need the postMessage flow debugged
   - Check if `proto=json` sends `event:export` properly without `embed=1`

2. **draw.io's own Ctrl+S / save dialog**
   - Might conflict with our custom save button
   - Decide: suppress draw.io's built-in save or let both coexist

3. **Loading existing diagrams**
   - Selecting a diagram from the sidebar should load it in the editor
   - Verify `selectDiagram` → `sendToDrawio` flow

4. **"New" diagram template**
   - Creating a new diagram should load a blank template in the editor
   - Verify `createNew` → `sendToDrawio` with `action:template`

## Notes

- When all items above are resolved, add a comment like:
  `<!-- All draw.io tasks resolved — delete this file? -->`
  and ask the user for confirmation before deleting.
