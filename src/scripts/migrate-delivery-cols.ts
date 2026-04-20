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

async function addCol(col: string, ddl: string) {
  if (!(await columnExists('restaurants', col))) {
    await exec(`ALTER TABLE restaurants ADD COLUMN ${ddl}`)
    console.log(`  + added ${col}`)
  } else {
    console.log(`  · ${col} exists`)
  }
}

async function main() {
  console.log('Patching restaurants table with delivery columns...')
  await addCol('delivery_enabled', 'delivery_enabled INTEGER NOT NULL DEFAULT 1')
  await addCol('delivery_origin_postcode', 'delivery_origin_postcode TEXT')
  await addCol('delivery_radius_miles', 'delivery_radius_miles REAL NOT NULL DEFAULT 3')
  await addCol('delivery_base_fee', 'delivery_base_fee REAL NOT NULL DEFAULT 2.5')
  await addCol('delivery_per_mile_fee', 'delivery_per_mile_fee REAL NOT NULL DEFAULT 0.8')
  await addCol('delivery_min_order', 'delivery_min_order REAL NOT NULL DEFAULT 0')
  console.log('Done.')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
