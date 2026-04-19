// Bypasses @libsql/client migration-jobs check by calling Hrana v3 pipeline API directly
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

async function executeSQL(sql: string): Promise<void> {
  const res = await fetch(`${baseUrl}/v3/pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      baton: null,
      requests: [
        { type: 'execute', stmt: { sql } },
        { type: 'close' },
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  const data = await res.json() as any
  const result = data.results?.[0]
  if (result?.type === 'error') {
    throw new Error(result.error?.message ?? JSON.stringify(result.error))
  }
}

const statements = [
  [`restaurants`, `CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subdomain TEXT NOT NULL UNIQUE,
    logo TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    opening_hours TEXT,
    brand_colours TEXT,
    commission_rate REAL NOT NULL DEFAULT 10,
    monthly_fee REAL NOT NULL DEFAULT 49,
    plan_type TEXT NOT NULL DEFAULT 'starter',
    stripe_account_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    menu_template TEXT NOT NULL DEFAULT 'custom',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`],
  [`menu_items`, `CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_price REAL NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    is_available INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`],
  [`modifier_groups`, `CREATE TABLE IF NOT EXISTS modifier_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'optional',
    min_choices INTEGER NOT NULL DEFAULT 0,
    max_choices INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`],
  [`modifier_options`, `CREATE TABLE IF NOT EXISTS modifier_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modifier_group_id INTEGER NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_delta REAL NOT NULL DEFAULT 0,
    is_available INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`],
  [`orders`, `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    items_snapshot TEXT NOT NULL,
    subtotal REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    payment_method TEXT NOT NULL DEFAULT 'card',
    stripe_payment_intent_id TEXT,
    fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
    delivery_address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`],
  [`users`, `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER REFERENCES restaurants(id),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'kitchen_staff',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`],
  [`deals`, `CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percent',
    discount_value REAL NOT NULL,
    min_order REAL NOT NULL DEFAULT 0,
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  )`],
]

async function migrate() {
  console.log('Connecting to:', baseUrl)
  for (const [name, sql] of statements) {
    process.stdout.write(`Creating table: ${name}...`)
    await executeSQL(sql)
    console.log(' done')
  }
  console.log('\nAll 7 tables created successfully.')
}

migrate().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
