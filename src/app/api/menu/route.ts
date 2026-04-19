import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { menuItems, modifierGroups, modifierOptions, categories } from '@/db/schema'
import { eq, asc, inArray, and } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'
import type { MenuByCategory } from '@/types/menu'

export async function GET() {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, tenant.id))
    .orderBy(asc(menuItems.category), asc(menuItems.sortOrder))

  const itemIds = items.map((i) => i.id)

  const allGroups =
    itemIds.length > 0
      ? await db
          .select()
          .from(modifierGroups)
          .where(inArray(modifierGroups.menuItemId, itemIds))
          .orderBy(asc(modifierGroups.sortOrder))
      : []

  const groupIds = allGroups.map((g) => g.id)
  const allOptions =
    groupIds.length > 0
      ? await db
          .select()
          .from(modifierOptions)
          .where(inArray(modifierOptions.modifierGroupId, groupIds))
          .orderBy(asc(modifierOptions.sortOrder))
      : []

  const menu: MenuByCategory = {}

  for (const item of items) {
    const groups = allGroups
      .filter((g) => g.menuItemId === item.id)
      .map((g) => ({
        id: g.id,
        menuItemId: g.menuItemId,
        name: g.name,
        type: g.type as 'required' | 'optional',
        minChoices: g.minChoices,
        maxChoices: g.maxChoices,
        sortOrder: g.sortOrder,
        options: allOptions
          .filter((o) => o.modifierGroupId === g.id && Boolean(o.isAvailable))
          .map((o) => ({
            id: o.id,
            name: o.name,
            priceDelta: o.priceDelta,
            isAvailable: Boolean(o.isAvailable),
            sortOrder: o.sortOrder,
          })),
      }))

    const menuItem = {
      id: item.id,
      restaurantId: item.restaurantId,
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      category: item.category,
      imageUrl: item.imageUrl,
      isAvailable: Boolean(item.isAvailable),
      sortOrder: item.sortOrder,
      modifierGroups: groups,
    }

    if (!menu[item.category]) menu[item.category] = []
    menu[item.category].push(menuItem)
  }

  const categoryRows = await db
    .select()
    .from(categories)
    .where(eq(categories.restaurantId, tenant.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name))

  return NextResponse.json({
    menu,
    categories: categoryRows,
    restaurant: {
      id: tenant.id,
      name: tenant.name,
      brandColours: tenant.brandColours,
    },
  })
}

async function ensureCategory(restaurantId: number, name: string) {
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.restaurantId, restaurantId), eq(categories.name, name)))
  if (existing.length > 0) return
  const all = await db
    .select({ sortOrder: categories.sortOrder })
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId))
  const nextSort = all.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1
  await db.insert(categories).values({ restaurantId, name, sortOrder: nextSort })
}

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

const postSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  basePrice: z.number().min(0),
  category: z.string().min(1),
  imageUrl: z.string().optional().default(''),
  groups: z.array(groupSchema).default([]),
})

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 })
  }
  const { name, description, basePrice, category, imageUrl, groups } = parsed.data

  await ensureCategory(tenant.id, category)

  const [inserted] = await db
    .insert(menuItems)
    .values({
      restaurantId: tenant.id,
      name,
      description: description || null,
      basePrice,
      category,
      imageUrl: imageUrl || null,
      isAvailable: 1,
      sortOrder: 0,
    })
    .returning({ id: menuItems.id })

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    const [insertedGroup] = await db
      .insert(modifierGroups)
      .values({
        menuItemId: inserted.id,
        name: g.name,
        type: g.type,
        minChoices: g.minChoices,
        maxChoices: g.maxChoices,
        sortOrder: gi,
      })
      .returning({ id: modifierGroups.id })

    for (let oi = 0; oi < g.options.length; oi++) {
      const o = g.options[oi]
      await db.insert(modifierOptions).values({
        modifierGroupId: insertedGroup.id,
        name: o.name,
        priceDelta: o.priceDelta,
        isAvailable: 1,
        sortOrder: oi,
      })
    }
  }

  return NextResponse.json({ ok: true, itemId: inserted.id })
}
