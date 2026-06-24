import { execSync } from 'child_process'
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const targetDir = join(root, 'public', 'drawio')
const tempDir = join(root, 'tmp', 'drawio-download')

const RELEASE = 'v30.2.5'
const WAR_URL = `https://github.com/jgraph/drawio/releases/download/${RELEASE}/draw.war`
const WAR_PATH = join(tempDir, 'draw.war')

console.log(`\n  Downloading draw.io ${RELEASE}...\n`)

if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true })

if (!existsSync(WAR_PATH)) {
  console.log(`  Downloading ${WAR_URL} ...`)
  execSync(`powershell -Command "Invoke-WebRequest -Uri '${WAR_URL}' -OutFile '${WAR_PATH}'"`, { cwd: root, stdio: 'inherit' })
} else {
  console.log('  Already downloaded, skipping.')
}

if (existsSync(targetDir)) rmSync(targetDir, { recursive: true })
mkdirSync(targetDir, { recursive: true })

console.log('  Extracting draw.war ...')
execSync(`powershell -Command "Add-Type -Assembly System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${WAR_PATH}', '${targetDir}')"`, { cwd: root, stdio: 'inherit' })

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
