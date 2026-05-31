import { execSync, spawnSync } from 'child_process'
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import os from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distElectron = join(root, 'dist-electron')

const require = createRequire(import.meta.url)
const pkg = require(join(root, 'package.json'))

const platform = process.argv[2] || 'current'
const version = pkg.version

const targets = {
  win: '--win --x64',
  portable: '--win --x64 --config electron-builder.portable.yml',
  mac: '--mac --x64',
  linux: '--linux --x64',
  all: '--win --mac --linux --x64',
  current: process.platform === 'win32' ? '--win --x64' : process.platform === 'darwin' ? '--mac --x64,arm64' : '--linux --x64',
}

const target = targets[platform]
if (!target) {
  console.error(`Unknown platform: ${platform}. Use: win, mac, linux, all, or omit for current OS.`)
  process.exit(1)
}

console.log(`\n  Building Vibe Tasks v${version}`)
console.log(`  Platform target(s): ${platform}\n`)

// Step 1: Vite build (renderer + electron main process)
console.log('[1/3] Building app with Vite...')
execSync('npx vite build', { cwd: root, stdio: 'inherit' })

// Step 2: Copy preload & HTML files to dist-electron
console.log('[2/3] Copying preload & asset files...')
const filesToCopy = ['preload.cjs', 'pomodoroPreload.cjs', 'pomodoro.html', 'focusPreload.cjs', 'focus.html']
for (const file of filesToCopy) {
  const src = join(root, 'electron', file)
  const dest = join(distElectron, file)
  if (!existsSync(src)) {
    console.warn(`  Warning: ${src} not found, skipping.`)
    continue
  }
  copyFileSync(src, dest)
  console.log(`  Copied: ${file}`)
}

// Pre-extract winCodeSign to avoid 7za symlink errors on Windows
function preExtractWinCodeSign() {
  if (process.platform !== 'win32') return

  const localAppData = process.env.LOCALAPPDATA || join(os.homedir(), 'AppData', 'Local')
  const cacheDir = join(localAppData, 'electron-builder', 'Cache', 'winCodeSign')
  const sevenZipPath = join(root, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe')

  if (!existsSync(sevenZipPath) || !existsSync(cacheDir)) return

  for (const entry of readdirSync(cacheDir)) {
    if (!entry.endsWith('.7z')) continue
    const archivePath = join(cacheDir, entry)
    const extractDir = join(cacheDir, entry.replace('.7z', ''))
    if (existsSync(extractDir) && readdirSync(extractDir).length > 0) continue
    console.log(`  Pre-extracting ${entry}...`)
    if (!existsSync(extractDir)) mkdirSync(extractDir, { recursive: true })
    spawnSync(sevenZipPath, ['x', '-snld-', '-bd', archivePath, `-o${extractDir}`], { stdio: 'inherit', shell: false })
  }
}

// Step 3: Package with electron-builder
console.log('[3/3] Packaging with electron-builder...')
const usePortableConfig = platform === 'portable'
const cmd = usePortableConfig
  ? `npx electron-builder ${target}`
  : `npx electron-builder ${target} --config electron-builder.yml`
preExtractWinCodeSign()
execSync(cmd, { cwd: root, stdio: 'inherit' })

console.log(`\n  Done! Packages are in the "build" directory.\n`)
