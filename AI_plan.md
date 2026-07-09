# SQLite AI — Vector Search for Vibe Tasks

## What "SQLite AI" Means

Two projects in this space:

### 1. `sqlite-vec` (Open Source)
- **Repo:** github.com/asg017/sqlite-vec
- **Stars:** 8K, active (v0.1.10-alpha.4 as of May 2026)
- **Author:** Alex Garcia (successor to `sqlite-vss`)
- **Approach:** `vec0` virtual tables for vector storage + KNN search
- **Written in:** Pure C, zero dependencies
- **Platforms:** Linux, macOS, **Windows** (`.dll`), WASM, mobile
- **License:** Apache 2.0
- **Status:** Pre-v1, breaking changes expected. ANN support recently added.

### 2. `@sqliteai/sqlite-vector` (Commercial)
- **Website:** sqlite.ai
- **Author:** SQLite Cloud company (Marco Bambini)
- **Approach:** Vectors as BLOBs in ordinary tables — no virtual tables
- **Features:** SIMD distance kernels, TurboQuant (2/3/4-bit), 30MB memory profile
- **Platforms:** Windows, macOS, Linux, iOS, Android — has npm package with platform binaries
- **License:** Free for OSS, commercial license for proprietary
- **npm:** `@sqliteai/sqlite-vector`

---

## The Problem: `sql.js` Can't Load Native Extensions

Vibe Tasks currently uses **`sql.js`** (SQLite compiled to WebAssembly). WASM cannot load native C extensions (`.dll`/`.so`/`.dylib`). Therefore neither `sqlite-vec` nor `sqlite-vector` can be loaded into the existing database.

**To use either, you must replace `sql.js` with `better-sqlite3`** (native Node.js addon), which supports `db.loadExtension()`. This is a significant migration of the entire `electron/database/db.ts` layer.

---

## What You'd Gain by Migrating

| Capability | Current (`sql.js` + LanceDB) | With `better-sqlite3` + `sqlite-vec` |
|---|---|---|
| Semantic search | Separate LanceDB, cross-DB joins | Built into SQLite, single SQL query |
| Similar ideas search | Manual LIKE / FTS5 | `ORDER BY vec_distance_cosine(embedding, ?)` |
| RAG for AI Chat | Separate vector DB | Same DB — JOIN friendly |
| Cross-content search | Multi-DB complexity | Single SQL across all tables |
| Storage | Two DB files to manage | One unified SQLite file |
| Offline | Works | Works identically |
| Index rebuild on data change | Manual upsert | Auto via SQL triggers |

---

## What You'd Lose / Trade-offs

| Factor | Impact |
|---|---|
| **Migration effort** | Rewrite `db.ts` + all repos + test everything. ~2-3 days |
| **Packaging** | `sql.js` is zero-config. `better-sqlite3` + extension `.dll` needs `asarUnpack` in `electron-builder.yml` |
| **Build complexity** | Native addons need `electron-rebuild` on install. More CI/portable-build surface |
| **`sqlite-vec` readiness** | Pre-v1, breaking changes expected |
| **Portable build** | WASM is simpler to bundle than native `.dll` + Node addon |

---

## Relation to Existing Plan

The existing `plan_ai_implementation.md` already plans **LanceDB** for Phase 2 (RAG vector search). LanceDB works alongside `sql.js` with zero DB-layer changes:

```
Current:  sql.js (SQLite) + LanceDB (vectors)
Alternative: better-sqlite3 (SQLite + vectors, unified)
```

---

## Recommendation

**Don't migrate now.** The LanceDB approach in the existing plan is the pragmatic choice:

1. Zero changes to the current `sql.js`/`db.ts` layer
2. LanceDB is purpose-built for vector search with a clean API
3. Can be implemented incrementally without risk to existing features
4. The Ideas feature in `idea_plan.md` already supports adding embeddings later — just add an `embedding BLOB` column to the `ideas` table when ready

**Future consideration:** If the complexity of managing two databases (SQLite + LanceDB) becomes a burden, evaluate switching to `better-sqlite3` + `sqlite-vec` as a unified storage layer. At that point, `sqlite-vec` will likely be post-v1 and stable.

---

# Next Phase: AI Chat UX Improvements

## Message Actions
- Copy button on every assistant message (not just code blocks)
- Edit button on user messages (edit in-place and resend)
- Regenerate response per assistant message
- Delete individual messages

## Input Quality
- `<textarea>` with auto-grow instead of single-line `<input>` (Shift+Enter for newlines)
- Temperature / system prompt / max-tokens controls in config modal

## Conversation UX
- Search/filter in sidebar
- Timestamps on conversations and messages
- AI-suggested titles (auto-generate from first message)

## Markdown Rendering
- Table rendering
- URL auto-linkify
- Better syntax highlighting (swap keyword regex for a proper highlighter)

## Other
- Token counter / cost display
- Conversation export (JSON / Markdown)
