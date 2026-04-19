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
  console.log('Patching orders table columns...')

  if (!(await columnExists('orders', 'customer_address'))) {
    await exec(`ALTER TABLE orders ADD COLUMN customer_address TEXT`)
    console.log('  + added customer_address')
  }
  if (!(await columnExists('orders', 'discount_amount'))) {
    await exec(`ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0`)
    console.log('  + added discount_amount')
  }

  // Backfill: copy delivery_address → customer_address if old col exists
  if (await columnExists('orders', 'delivery_address')) {
    await exec(`UPDATE orders SET customer_address = delivery_address WHERE customer_address IS NULL AND delivery_address IS NOT NULL`)
    console.log('  ✓ backfilled from delivery_address')
  }

  console.log('Done.')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
