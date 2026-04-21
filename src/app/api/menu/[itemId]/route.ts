import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { menuItems, modifierGroups, modifierOptions, categories } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'

const optionSchema = z.object({
  name: z.string().min(1),
  priceDelta: z.number().default(0),
})

const groupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['required', 'optional']).default('optional'),
  minChoices: z.number().int().min(0).default(0),
  maxChoices: z.number().int().min(1).default(1),
  options: z.array(optionSchema).min(1),
})

const patchSchema = z.object({
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  groups: z.array(groupSchema).optional(), // if present, replaces all existing groups
})

async function ensureCategory(
  tx: Pick<typeof db, 'select' | 'insert'>,
  restaurantId: number,
  name: string
) {
  const existing = await tx
    .select()
    .from(categories)
    .where(and(eq(categories.restaurantId, restaurantId), eq(categories.name, name)))
  if (existing.length > 0) return

  const all = await tx
    .select({ sortOrder: categories.sortOrder })
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId))
  const nextSort = all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1
  await tx.insert(categories).values({ restaurantId, name, sortOrder: nextSort })
}

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const itemId = parseInt(params.itemId)
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  try {
    await db.transaction(async (tx) => {
      const updates: Record<string, unknown> = {}
      if (parsed.data.isAvailable !== undefined) updates.isAvailable = parsed.data.isAvailable ? 1 : 0
      if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder
      if (parsed.data.name !== undefined) updates.name = parsed.data.name
      if (parsed.data.description !== undefined) updates.description = parsed.data.description
      if (parsed.data.basePrice !== undefined) updates.basePrice = parsed.data.basePrice
      if (parsed.data.category !== undefined) {
        updates.category = parsed.data.category
        await ensureCategory(tx, tenant.id, parsed.data.category)
      }
      if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl || null

      if (Object.keys(updates).length > 0) {
        await tx
          .update(menuItems)
          .set(updates)
          .where(and(eq(menuItems.id, itemId), eq(menuItems.restaurantId, tenant.id)))
      }

      if (parsed.data.groups !== undefined) {
        // full replace: cascade-delete existing groups (options go with them)
        await tx.delete(modifierGroups).where(eq(modifierGroups.menuItemId, itemId))

        const groups = parsed.data.groups
        for (let gi = 0; gi < groups.length; gi++) {
          const g = groups[gi]
          const [insertedGroup] = await tx
            .insert(modifierGroups)
            .values({
              menuItemId: itemId,
              name: g.name,
              type: g.type,
              minChoices: g.minChoices,
              maxChoices: g.maxChoices,
              sortOrder: gi,
            })
            .returning({ id: modifierGroups.id })

          for (let oi = 0; oi < g.options.length; oi++) {
            const o = g.options[oi]
            await tx.insert(modifierOptions).values({
              modifierGroupId: insertedGroup.id,
              name: o.name,
              priceDelta: o.priceDelta,
              isAvailable: 1,
              sortOrder: oi,
            })
          }
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('menu_item_patch_failed', {
      operation: parsed.data.groups !== undefined ? 'menu_item_patch_replace_groups' : 'menu_item_patch',
      restaurantId: tenant.id,
      itemId,
      error,
    })
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 })
  }
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
