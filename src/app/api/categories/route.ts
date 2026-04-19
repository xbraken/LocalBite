import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { categories, menuItems } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'

export async function GET() {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.restaurantId, tenant.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  return NextResponse.json({ categories: rows })
}

const postSchema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const name = parsed.data.name.trim()

  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.restaurantId, tenant.id), eq(categories.name, name)))
  if (existing.length > 0) return NextResponse.json({ error: 'Category already exists' }, { status: 409 })

  const all = await db
    .select({ sortOrder: categories.sortOrder })
    .from(categories)
    .where(eq(categories.restaurantId, tenant.id))
  const nextSort = all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1

  const [row] = await db.insert(categories).values({
    restaurantId: tenant.id,
    name,
    imageUrl: parsed.data.imageUrl || null,
    sortOrder: nextSort,
  }).returning()

  return NextResponse.json({ category: row })
}
