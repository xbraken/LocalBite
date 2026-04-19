import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { menuItems, modifierGroups, modifierOptions, categories } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'

const optionSchema = z.object({
  name: z.string().min(1),
  priceDelta: z.number().default(0),
})

const groupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['required', 'optional']).default('required'),
  minChoices: z.number().int().min(0).default(1),
  maxChoices: z.number().int().min(1).default(1),
  options: z.array(optionSchema).default([]),
})

const itemSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  basePrice: z.number().nonnegative(),
  modifierGroups: z.array(groupSchema).default([]),
})

const bodySchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1),
      items: z.array(itemSchema).default([]),
    })
  ),
})

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 })

  let insertedItems = 0
  let insertedGroups = 0
  let insertedOptions = 0

  const existingCats = await db
    .select()
    .from(categories)
    .where(eq(categories.restaurantId, tenant.id))

  let nextCatSort = existingCats.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1
  const catByName = new Map(existingCats.map((c) => [c.name, c]))

  for (const cat of parsed.data.categories) {
    if (!catByName.has(cat.name)) {
      await db.insert(categories).values({
        restaurantId: tenant.id,
        name: cat.name,
        sortOrder: nextCatSort++,
      })
    }

    let itemSort = 0
    for (const item of cat.items) {
      const [row] = await db
        .insert(menuItems)
        .values({
          restaurantId: tenant.id,
          name: item.name,
          description: item.description || null,
          basePrice: item.basePrice,
          category: cat.name,
          sortOrder: itemSort++,
        })
        .returning({ id: menuItems.id })
      insertedItems++

      let groupSort = 0
      for (const group of item.modifierGroups) {
        const [grow] = await db
          .insert(modifierGroups)
          .values({
            menuItemId: row.id,
            name: group.name,
            type: group.type,
            minChoices: group.minChoices,
            maxChoices: group.maxChoices,
            sortOrder: groupSort++,
          })
          .returning({ id: modifierGroups.id })
        insertedGroups++

        let optSort = 0
        for (const opt of group.options) {
          await db.insert(modifierOptions).values({
            modifierGroupId: grow.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
            sortOrder: optSort++,
          })
          insertedOptions++
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    insertedItems,
    insertedGroups,
    insertedOptions,
  })
}
