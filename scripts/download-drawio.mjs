import { execSync } from 'child_process'
import { existsSync, mkdirSync, rmSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const targetDir = join(root, 'public', 'drawio')
const tempDir = join(root, 'tmp', 'drawio-download')
const versionFile = join(root, 'drawio-version.txt')
const isWin = os.platform() === 'win32'

// Currently-bundled draw.io version, sourced from drawio-version.txt so it is
// easy to inspect. The build always downloads the LATEST published draw.io
// release from GitHub (no env var required); this pinned version is only used
// as an offline fallback if the GitHub check fails.
function readBundledVersion() {
  try {
    const raw = readFileSync(versionFile, 'utf-8').trim()
    if (/^v?\d+(\.\d+){1,3}(-[\w.]+)?$/.test(raw)) {
      return raw.startsWith('v') ? raw : `v${raw}`
    }
  } catch { /* fall through to default */ }
  return 'v30.2.5'
}

const BUNDLED_RELEASE = readBundledVersion()

async function fetchLatestRelease() {
  try {
    const url = 'https://api.github.com/repos/jgraph/drawio/releases/latest'
    const res = await fetch(url, { headers: { 'User-Agent': 'vibetasks', Accept: 'application/vnd.github+json' } })
    if (!res.ok) {
      console.warn(`  Could not check latest draw.io release (HTTP ${res.status}).`)
      return null
    }
    const json = await res.json()
    return json.tag_name || null
  } catch (e) {
    console.warn('  Could not check latest draw.io release:', e?.message || e)
    return null
  }
}

const latest = await fetchLatestRelease()
console.log(`\n  Bundled draw.io: ${BUNDLED_RELEASE}`)
if (latest) {
  console.log(`  Latest draw.io:  ${latest}`)
} else {
  console.log('  Could not fetch latest draw.io release — falling back to bundled version.')
}

// Always use the latest published release (no env var required). If the
// GitHub check fails (offline/rate-limited), fall back to the pinned version
// from drawio-version.txt so the build still succeeds.
const RELEASE = process.env.FORCE_DRAWIO_VERSION
  ? `v${process.env.FORCE_DRAWIO_VERSION.replace(/^v/, '')}`
  : latest || BUNDLED_RELEASE
const WAR_URL = `https://github.com/jgraph/drawio/releases/download/${RELEASE}/draw.war`
const WAR_PATH = join(tempDir, 'draw.war')
const VERSION_MARKER = join(tempDir, '.release-version')

console.log(`\n  Downloading draw.io ${RELEASE}...\n`)

if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

let cachedRelease = ''
try { cachedRelease = readFileSync(VERSION_MARKER, 'utf-8').trim() } catch { /* first run */ }

if (!existsSync(WAR_PATH) || !cachedRelease || cachedRelease !== RELEASE) {
  console.log(`  Downloading ${WAR_URL} ...`)
  if (isWin) {
    execSync(`powershell -Command "Invoke-WebRequest -Uri '${WAR_URL}' -OutFile '${WAR_PATH}'"`, { cwd: root, stdio: 'inherit' })
  } else {
    execSync(`curl -fsSL '${WAR_URL}' -o '${WAR_PATH}'`, { cwd: root, stdio: 'inherit' })
  }
  writeFileSync(VERSION_MARKER, RELEASE)
} else {
  console.log(`  draw.io ${RELEASE} already downloaded, skipping.`)
}

if (existsSync(targetDir)) rmSync(targetDir, { recursive: true })
mkdirSync(targetDir, { recursive: true })

console.log('  Extracting draw.war ...')
if (isWin) {
  execSync(`powershell -Command "Add-Type -Assembly System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${WAR_PATH}', '${targetDir}')"`, { cwd: root, stdio: 'inherit' })
} else {
  execSync(`unzip -q '${WAR_PATH}' -d '${targetDir}'`, { cwd: root, stdio: 'inherit' })
}

const webinf = join(targetDir, 'WEB-INF')
if (existsSync(webinf)) rmSync(webinf, { recursive: true })

// Keep the pinned version file in sync so future offline builds (and the
// startup log) reference the actual bundled release.
if (latest && RELEASE !== BUNDLED_RELEASE) {
  writeFileSync(versionFile, RELEASE.replace(/^v/, ''))
  console.log(`  Updated drawio-version.txt -> ${RELEASE}`)
}

console.log(`\n  Done! draw.io extracted to public/drawio/\n`)

function countFiles(dir) {
  let count = 0
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) { walk(full); continue }
      count++
    }
  }
  if (existsSync(dir)) walk(dir)
  return count
}

console.log(`  File count: ${countFiles(targetDir)}\n`)
