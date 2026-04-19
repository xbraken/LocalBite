// Adds `categories` table + backfills distinct categories from menu_items per restaurant.
// Safe to run multiple times.
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

const rawUrl = process.env.DATABASE_URL!
const authToken = process.env.DATABASE_AUTH_TOKEN!
const baseUrl = rawUrl.replace(/^libsql:\/\//, 'https://')

interface Stmt {
  sql: string
  args?: { type: 'text' | 'integer'; value: string }[]
}

async function pipeline(stmts: Stmt[]): Promise<any[]> {
  const res = await fetch(`${baseUrl}/v3/pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      baton: null,
      requests: [
        ...stmts.map((s) => ({ type: 'execute', stmt: s })),
        { type: 'close' },
      ],
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  const data = await res.json() as any
  const out: any[] = []
  for (let i = 0; i < stmts.length; i++) {
    const r = data.results?.[i]
    if (r?.type === 'error') throw new Error(r.error?.message ?? JSON.stringify(r.error))
    out.push(r?.response?.result)
  }
  return out
}

async function main() {
  console.log('Connecting to:', baseUrl)

  // 1. Create table
  await pipeline([{
    sql: `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
  }])
  console.log('✓ categories table ready')

  // 2. Find all distinct (restaurant_id, category) pairs from menu_items
  const [distinctRes] = await pipeline([{
    sql: `SELECT DISTINCT restaurant_id, category FROM menu_items ORDER BY restaurant_id, category`,
  }])
  const rows: [number, string][] = (distinctRes?.rows ?? []).map((row: any[]) => [
    Number(row[0].value),
    String(row[1].value),
  ])
  console.log(`  found ${rows.length} distinct (restaurant, category) pairs`)

  // 3. Find all currently existing category rows
  const [existingRes] = await pipeline([{
    sql: `SELECT restaurant_id, name FROM categories`,
  }])
  const existing = new Set(
    (existingRes?.rows ?? []).map((row: any[]) => `${row[0].value}:${row[1].value}`)
  )

  // 4. Insert missing
  const toInsert = rows.filter(([rid, name]) => !existing.has(`${rid}:${name}`))
  if (toInsert.length === 0) {
    console.log('  nothing to backfill')
  } else {
    let sortByRestaurant = new Map<number, number>()
    for (const [rid, name] of toInsert) {
      const sort = sortByRestaurant.get(rid) ?? 0
      await pipeline([{
        sql: `INSERT INTO categories (restaurant_id, name, sort_order) VALUES (?, ?, ?)`,
        args: [
          { type: 'integer', value: String(rid) },
          { type: 'text', value: name },
          { type: 'integer', value: String(sort) },
        ],
      }])
      sortByRestaurant.set(rid, sort + 1)
      console.log(`  + restaurant ${rid}: ${name}`)
    }
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
