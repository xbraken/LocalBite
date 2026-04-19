import { getTenantFromRequest } from '@/lib/tenant'
import { db } from '@/db'
import { menuItems, modifierGroups, modifierOptions } from '@/db/schema'
import { eq, asc, inArray } from 'drizzle-orm'
import { CustomerOrdering } from '@/components/ordering/CustomerOrdering'
import type { MenuByCategory } from '@/types/menu'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromRequest()
  return { title: tenant ? `${tenant.name} — Order Online` : 'Order Online' }
}

export default async function OrderingPage() {
  const tenant = await getTenantFromRequest()
  if (!tenant) return null

  // Fetch menu server-side
  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, tenant.id))
    .orderBy(asc(menuItems.category), asc(menuItems.sortOrder))

  const availableItems = items.filter((i) => Boolean(i.isAvailable))
  const itemIds = availableItems.map((i) => i.id)

  const allGroups = itemIds.length
    ? await db
        .select()
        .from(modifierGroups)
        .where(inArray(modifierGroups.menuItemId, itemIds))
        .orderBy(asc(modifierGroups.sortOrder))
    : []

  const groupIds = allGroups.map((g) => g.id)
  const allOptions = groupIds.length
    ? await db
        .select()
        .from(modifierOptions)
        .where(inArray(modifierOptions.modifierGroupId, groupIds))
        .orderBy(asc(modifierOptions.sortOrder))
    : []

  const menu: MenuByCategory = {}
  for (const item of availableItems) {
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

  return (
    <CustomerOrdering
      menu={menu}
      restaurant={{
        id: tenant.id,
        name: tenant.name,
        logo: tenant.logo,
        brandColours: tenant.brandColours,
      }}
    />
  )
}
