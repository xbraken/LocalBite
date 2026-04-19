import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { menuItems } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'

const patchSchema = z.object({
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().optional(),
  category: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const itemId = parseInt(params.itemId)
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.isAvailable !== undefined) updates.isAvailable = parsed.data.isAvailable ? 1 : 0
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.basePrice !== undefined) updates.basePrice = parsed.data.basePrice
  if (parsed.data.category !== undefined) updates.category = parsed.data.category

  await db
    .update(menuItems)
    .set(updates)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, tenant.id)))

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const itemId = parseInt(params.itemId)

  await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, tenant.id)))

  return NextResponse.json({ ok: true })
}
