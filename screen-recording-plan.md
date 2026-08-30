# Screen Recording — Implementation Plan

**App:** Vibe Tasks (Electron + React + TypeScript, SQLite via `sql.js`)
**Goal:** Add a full-featured in-app screen recording tool (capture display/window, record video + optional audio, save/playback/manage recordings).

This plan follows the existing architectural patterns in this codebase (React pages wired via `HashRouter`, IPC through `electron/main.ts` ↔ `electron/preload.ts` ↔ renderer).

---

## 1. Overview & Scope

Provide "Record screens", "screen share", and "video capture" inside the app:

- **Capture source:** full screen(s), specific window, or a region.
- **Output:** on-disk video files (WebM/MP4).
- **Recording controls:** start / pause / resume / stop, timer display.
- **Audio:** optional microphone + system audio (platform-dependent).
- **Library:** list of recordings with playback, rename, delete, open folder.
- **Live preview:** show a preview of the selected source before/while recording.

### Architecture Fit
Electron exposes `desktopCapturer` in the **main process** only. An app window can stream a captured source into an HTML `<video>` via `getUserMedia` (media stream sourced from `desktopCapturer.getSources()`). For real file output we use **MediaRecorder** in a renderer window.

We piggyback on the existing pattern of **separate small windows with their own preload** (like `pomodoro.html` / `focus.html`) for the capture/record UI, because a recording window should be able to run a `webm` encoder without being blocked by the rest of the app.

---

## 2. New Dependencies

Add runtime/dev dependencies:

| Package | Purpose | Notes |
|---|---|---|
| `ffmpeg-static` | Bundle a static FFmpeg binary | Used in main process to post-process WebM → MP4 & merge audio |
| `@ffmpeg-installer/ffmpeg` *or* `ffmpeg-static` | Executable path resolution | Pick one; `ffmpeg-static` is simpler |
| `fluent-ffmpeg` | High-level FFmpeg wrapper (node) | Convenience for metadata/transcode |
| `electron-store` ***(optional)*** | Persist recording settings/preferences | Or reuse existing `CONFIG_PATH` JSON pattern |

MediaRecorder + `desktopCapturer` are built-in to Electron/Chromium — **no extra npm package** for capture itself.

> **Note on WebM vs MP4:** MediaRecorder natively produces WebM (VP8/VP9 + Opus). For MP4 we post-process with FFmpeg in the main process after `stop()`. WebM is fine for internal playback; MP4 export is for external sharing.

---

## 3. File / Module Changes

### 3.1 Main process — `electron/main.ts`

Add imports for `desktopCapturer`, `screen`, and the FFmpeg helper.

**3.1.1 New capture/record windows**
- `let recordWindow: BrowserWindow | null` + `createRecordWindow()` — a normal (framed) capture window loading `record.html` with `recordPreload.cjs`.
- `let recordFloatingWindow: BrowserWindow | null` — an **always-on-top, frameless, small** control bar window (start/pause/stop/timer) shown during an active recording, mirroring `createPomodoroWindow()` / `createFocusWindow()`. This lets the user control recording even while the main window is in use.

**3.1.2 New IPC handlers (registered inside `registerIpcHandlers()`)** — namespaced `record:*`:

| Channel | Type | Purpose |
|---|---|---|
| `record:getSources` | `handle` | `desktopCapturer.getSources({ types: ['screen','window'], thumbnailSize, fetchWindowIcons })`, return sanitized list (id, name, thumbnail dataURL) |
| `record:start` | `handle` | Request media permission; return source stream constraints; spawn recording window or signal floating control |
| `record:saveFile` | `handle` | Take recorded blob from renderer, save to disk via `dialog.showSaveDialog` (or default recordings dir) |
| `record:transcode` | `handle` | FFmpeg WebM→MP4 / merge audio on the written file |
| `record:list` | `handle` | List recordings from the recordings directory (scan with metadata) |
| `record:rename` | `handle` | Rename a recording file |
| `record:delete` | `handle` | Delete a recording file |
| `record:openFolder` | `handle` | `shell.showItemInFolder` / `shell.openPath` |
| `record:getPath` | `handle` | Return the recordings directory |
| `record:window:control` | `handle`/`send` | Commands to the floating control window (pause/resume/stop/update timer) |

**3.1.3 Recordings directory**
- Define `RECORDINGS_DIR = path.join(app.getPath('videos'), 'VibeTasks')` (create on app start).
- Settings entry later; default to the user Videos folder.

### 3.2 Preload — `electron/preload.ts`
Expose a `window.electronAPI.recorder.*` namespace:
```ts
recorder: {
  getSources: () => ipcRenderer.invoke('record:getSources'),
  start: (opts) => ipcRenderer.invoke('record:start', opts),
  stop: () => ipcRenderer.invoke('record:stop'),
  save: (blobData) => ipcRenderer.invoke('record:saveFile', blobData),
  transcode: (file) => ipcRenderer.invoke('record:transcode', file),
  list: () => ipcRenderer.invoke('record:list'),
  rename: (id, name) => ipcRenderer.invoke('record:rename', id, name),
  delete: (id) => ipcRenderer.invoke('record:delete', id),
  openFolder: () => ipcRenderer.invoke('record:openFolder'),
  getPath: () => ipcRenderer.invoke('record:getPath'),
}
```
Also register `record:status` events so the floating window can broadcast timer ticks / state changes to the renderer (`ipcRenderer.on`).

### 3.3 Types — `src/types/models.ts`
Add:
```ts
export interface RecordingSource { id: string; name: string; thumbnail: string; type: 'screen' | 'window' }
export interface RecordingEntry   { id: string; name: string; path: string; size: number; durationSec: number; createdAt: string; mimeType: string }
export interface RecorderStatus  { state: 'idle'|'recording'|'paused'; elapsedSec: number; sourceName: string; hasAudio: boolean }
```
Extend the `ElectronAPI` namespace to include the `recorder` group.

### 3.4 Renderer — React page `src/pages/ScreenRecorder.tsx` (new)
A normal app page reachable at `/recorder` (lazy-loaded like all other pages), containing:
- **Source picker:** grid of thumbnails (from `getSources`) for screens/windows.
- **Settings:** microphone on/off, system audio on/off, target FPS, resolution/scale, format (WebM vs MP4-export).
- **Preview:** muted `<video>` streaming the chosen source via `navigator.mediaDevices.getUserMedia({video: {mandatory:{chromeMediaSource:'desktop', chromeMediaSourceId}}})`.
- **Record button:** starts MediaRecorder in the page OR hands off to a dedicated capture window.
- **Cancel / stop & save.**

### 3.5 Recording window — `electron/record.html` + `electron/recordPreload.ts`
- Self-contained HTML that:
  1. Calls `recorder.getSources()` to enumerate capture sources.
  2. On source selection, streams it into `<video>` and starts a `MediaRecorder`.
  3. Buffers `onDataAvailable` chunks; on stop sends the blob to `record:saveFile`.
- Uses a minimal preload exposing only `window.recorder` (context-isolated).

### 3.6 Floating control window — `electron/recordFloating.html` + `recordFloatingPreload.ts`
- Always-on-top, frameless (like Pomodoro/Focus).
- Shows a live `elapsed` timer plus **Pause / Resume / Stop / Cancel** buttons.
- Commands via IPC; renders fully in the main window stream.

### 3.7 App wiring — `src/App.tsx` + `src/components/Layout.tsx`
- Add lazy route `/recorder` → `<ScreenRecorder/>`.
- Add a nav item (e.g. under a "Capture" group): `{ path: '/recorder', label: 'Screen Recorder', icon: '🎥' }`.

### 3.8 Build config — `vite.config.ts` + `scripts/build.mjs`
- Register `record.html` and `recordFloating.html` as additional Electron entry points (like `pomodoro`/`focus` are handled — see how `focus.html`/`pomodoro.html` are emitted).
- Ensure `recordPreload` is compiled to `.cjs` (ESM/CJS handling) and copied into packaged `resourcesPath/electron`.
- Add `ffmpeg-static` / `fluent-ffmpeg` to the exclusions that get bundled into the packaged main process, or copy the FFmpeg binary via the build script.

---

## 4. Recording Flow (end-to-end)

1. User opens **Screen Recorder** page (`/recorder`) → calls `recorder.getSources()`.
2. User picks a screen/window → preview stream begins via `getUserMedia` (desktop-capture constraints).
3. User clicks **Record** → MediaRecorder starts (video from source; optional `audio` from mic via a second MediaTrack). Create/show the floating control window.
4. Floating control: **Pause/Resume/Stop** + live timer; status events stream back.
5. On **Stop** → MediaRecorder stops → assembled Blob sent to `record:saveFile` (saved to `RECORDINGS_DIR`).
6. If **MP4** requested → `record:transcode` converts WebM→MP4 with FFmpeg; otherwise keep WebM.
7. Recording added to the **Library** view with playback (native `<video src>`), rename, delete, open-in-folder.

---

## 5. Key Technical Details

### 5.1 Desktop capture constraints
```js
// in the recording window renderer
const sources = await window.electronAPI.recorder.getSources()
const chosen = sources.find(s => s.id === selectedId)
const stream = await navigator.mediaDevices.getUserMedia({
  audio: useMicrophone ? { deviceId: micId } : false,
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: chosen.id,
      minWidth:  1280,
      maxWidth:  3840,
      minHeight: 720,
      maxHeight: 2160,
      minFrameRate: 15,
      maxFrameRate: 60,
    },
  },
})
```
*(Chromium `mandatory` constraint keys are deprecated in favor of Screen Capture API, but in Electron 42 the legacy `chromeMediaSourceId` approach remains the reliable path. Validate against the exact Electron version before finalizing — see §7.)*

### 5.2 MediaRecorder
```js
const mime = 'video/webm;codecs=vp9,opus'  // fallback vp8
const rec = new MediaRecorder(stream, { mimeType: pickSupported(mime), videoBitsPerSecond: 8_000_000 })
rec.ondataavailable = e => chunks.push(e.data)
rec.onstop = async () => {
  const blob = new Blob(chunks, { type: rec.mimeType })
  const buf = await blob.arrayBuffer()
  await window.electronAPI.recorder.save(new Uint8Array(buf))
}
```

### 5.3 Main-process save
```js
ipcMain.handle('record:saveFile', async (_e, data /* Uint8Array */, suggestedName) => {
  const filePath = path.join(RECORDINGS_DIR, sanitize(suggestedName || `recording-${Date.now()}.webm`))
  fs.writeFileSync(filePath, Buffer.from(data))
  return { ok: true, path: filePath }
})
```

### 5.4 System audio (Windows)
- Loopback/system-audio capture on Windows requires WASAPI; the Electron capture APIs cannot grab system audio directly.
- **Option A (MVP):** microphone only.
- **Option B:** use FFmpeg with the `dshow`/`wasapi` device to capture system audio as a separate step, then merge via FFmpeg after recording. This is the pragmatic cross-platform approach and avoids extra native modules.
- Recommend landing **Option A** first, then adding system audio in a follow-up.

### 5.5 Permissions
- On macOS, screen capture requires the app to be granted **Screen Recording** permission in System Settings (first recording prompts the OS).
- On Windows, `desktopCapturer` generally works without special permissions.

---

## 6. Implementation Tasks (in dependency order)

1. **Scaffold types & IPC plumbing**
   - Add `RecordingSource` / `RecordingEntry` / `RecorderStatus` to `src/types/models.ts`.
   - Add `recorder.*` to `electron/preload.ts`.
   - Add stub `record:*` handlers to `registerIpcHandlers()`.

2. **Recordings directory + file ops (main)**
   - `RECORDINGS_DIR` creation, `record:list`, `record:rename`, `record:delete`, `record:openFolder`, `record:getPath`.

3. **Source enumeration (main)**
   - `record:getSources` using `desktopCapturer.getSources(...)` + thumbnail dataURLs.

4. **Recording window + preload**
   - `electron/record.html`, `electron/recordPreload.ts`, compiled `.cjs`.
   - Preview + MediaRecorder + save flow inside it.
   - Wire `record.html` into `vite.config.ts` / build script.

5. **Floating control window**
   - `recordFloating.html` + preload, timer + pause/resume/stop, `record:*` control IPC.

6. **React page**
   - `src/pages/ScreenRecorder.tsx` (source grid, preview, settings, record button).
   - Register route in `src/App.tsx` + nav item in `Layout.tsx`.

7. **Save & transcode**
   - `record:saveFile` + FFmpeg `record:transcode` (WebM→MP4) + add `ffmpeg-static`/`fluent-ffmpeg`.

8. **Playback library + polish**
   - Library list with `<video>` playback, rename/delete/open-folder UI.
   - Handle recording-state edge cases (window close during record, app quit, large files).

9. **Settings page integration (optional)**
   - Add a "Screen Recorder" tab under Settings for default folder, FPS, format.

---

## 7. Risks & Open Questions

- **Electron 42 desktop capture API:** Confirm whether `chromeMediaSourceId` legacy constraints still work or whether the newer Screen Capture API is required; adjust the renderer capture code accordingly.
- **System audio:** Cannot capture Windows loopback without FFmpeg/extra native modules — decided to ship mic-only first.
- **Performance:** Large-resolution/FPS captures can be memory heavy (MediaRecorder buffers in RAM). Mitigate with a max bits-per-second cap and, ideally, streaming to disk (MediaRecorder → `WritableStream` to a file via a custom sink is not natively supported; use chunk flushing to the main process periodically instead of only at stop).
- **File size:** WebM VP9 default; offer MP4 export for compatibility.
- **Where does recording live:** The dedicated capture window keeps the encoder off the main window's render loop. Decide whether the React page hands off fully to the capture window (recommended) or does capture inline.

---

## 8. Suggested Commit Sequence

1. `feat: add recorder types + IPC scaffolding`
2. `feat: recordings directory and file operations (IPC)`
3. `feat: desktop source enumeration (record:getSources)`
4. `feat: recording capture window + preload`
5. `feat: floating record-control window`
6. `feat: screen recorder page (source picker + preview)`
7. `feat: save file + ffmpeg transcode (webm→mp4)`
8. `feat: recordings library (playback/manage)`
9. `feat: settings integration + polish`
