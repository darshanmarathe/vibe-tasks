import { execSync } from 'child_process'
import { existsSync, mkdirSync, rmSync, readdirSync, statSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const targetDir = join(root, 'public', 'drawio')
const tempDir = join(root, 'tmp', 'drawio-download')
const versionFile = join(root, 'drawio-version.txt')
const isWin = os.platform() === 'win32'

// Currently-bundled draw.io version, sourced from drawio-version.txt so the
// pinned version is easy to update (the build will also warn if a newer
// draw.io release exists on GitHub).
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

function compareVersions(a, b) {
  const pa = a.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const av = pa[i] || 0
    const bv = pb[i] || 0
    if (av !== bv) return av - bv
  }
  return 0
}

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
  if (compareVersions(latest, BUNDLED_RELEASE) > 0) {
    console.log(`  UPDATE AVAILABLE: a newer draw.io (${latest}) exists.`)
    console.log(`  Run with FORCE_DRAWIO_VERSION=${latest.replace(/^v/, '')} to update the bundled draw.io.`)
  } else {
    console.log('  draw.io is up to date.')
  }
}

const RELEASE = process.env.FORCE_DRAWIO_VERSION
  ? `v${process.env.FORCE_DRAWIO_VERSION.replace(/^v/, '')}`
  : BUNDLED_RELEASE
const WAR_URL = `https://github.com/jgraph/drawio/releases/download/${RELEASE}/draw.war`
const WAR_PATH = join(tempDir, 'draw.war')

console.log(`\n  Downloading draw.io ${RELEASE}...\n`)

if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

if (!existsSync(WAR_PATH) || process.env.FORCE_DRAWIO_VERSION) {
  console.log(`  Downloading ${WAR_URL} ...`)
  if (isWin) {
    execSync(`powershell -Command "Invoke-WebRequest -Uri '${WAR_URL}' -OutFile '${WAR_PATH}'"`, { cwd: root, stdio: 'inherit' })
  } else {
    execSync(`curl -fsSL '${WAR_URL}' -o '${WAR_PATH}'`, { cwd: root, stdio: 'inherit' })
  }
} else {
  console.log('  Already downloaded, skipping.')
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
