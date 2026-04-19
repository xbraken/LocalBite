import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const val = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnv()

const baseUrl = process.env.DATABASE_URL!.replace(/^libsql:\/\//, 'https://')
const token = process.env.DATABASE_AUTH_TOKEN!

async function exec(sql: string) {
  const res = await fetch(`${baseUrl}/v3/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ baton: null, requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }] }),
  })
  const data = await res.json() as any
  const r = data.results?.[0]
  if (r?.type === 'error') throw new Error(r.error?.message ?? JSON.stringify(r.error))
  return r
}

async function columnExists(table: string, col: string) {
  const res = await exec(`PRAGMA table_info(${table})`)
  const rows = res?.response?.result?.rows ?? []
  return rows.some((row: any[]) => String(row[1].value) === col)
}

async function main() {
  console.log('Patching restaurant settings columns...')

  if (!(await columnExists('restaurants', 'contact_email'))) {
    await exec(`ALTER TABLE restaurants ADD COLUMN contact_email TEXT`)
    console.log('  + added contact_email')
  }

  if (!(await columnExists('restaurants', 'contact_phone'))) {
    await exec(`ALTER TABLE restaurants ADD COLUMN contact_phone TEXT`)
    console.log('  + added contact_phone')
  }

  if (!(await columnExists('restaurants', 'opening_hours'))) {
    await exec(`ALTER TABLE restaurants ADD COLUMN opening_hours TEXT`)
    console.log('  + added opening_hours')
  }

  console.log('Done.')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
