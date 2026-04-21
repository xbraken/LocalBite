import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { categories, menuItems } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { requireTenantAccess } from '@/lib/authz'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(['restaurant_admin', 'super_admin'])
  if (!access.ok) return access.response
  const { tenant } = access.data

  const id = parseInt(params.id)
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.restaurantId, tenant.id)))
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim()
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl || null
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder

  if (Object.keys(updates).length > 0) {
    await db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.restaurantId, tenant.id)))

    // Cascade rename to menu_items.category
    if (parsed.data.name !== undefined && parsed.data.name.trim() !== existing.name) {
      await db
        .update(menuItems)
        .set({ category: parsed.data.name.trim() })
        .where(and(eq(menuItems.restaurantId, tenant.id), eq(menuItems.category, existing.name)))
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireTenantAccess(['restaurant_admin', 'super_admin'])
  if (!access.ok) return access.response
  const { tenant } = access.data

  const id = parseInt(params.id)
  const url = new URL(req.url)
  const reassignTo = url.searchParams.get('reassignTo') // category name to move items to

  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.restaurantId, tenant.id)))
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if there are items in this category
  const items = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(eq(menuItems.restaurantId, tenant.id), eq(menuItems.category, existing.name)))

  if (items.length > 0) {
    if (!reassignTo) {
      return NextResponse.json({
        error: 'Category has items',
        itemCount: items.length,
        hint: 'Pass ?reassignTo=<categoryName> to move items, or delete items first',
      }, { status: 409 })
    }
    // Verify the target category exists for this tenant
    const [target] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.restaurantId, tenant.id), eq(categories.name, reassignTo)))
    if (!target) return NextResponse.json({ error: 'Reassign target not found' }, { status: 400 })

    await db
      .update(menuItems)
      .set({ category: reassignTo })
      .where(and(eq(menuItems.restaurantId, tenant.id), eq(menuItems.category, existing.name)))
  }

  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.restaurantId, tenant.id)))

  return NextResponse.json({ ok: true })
}
