import { db } from '@/db'
import { menuItems, modifierGroups, modifierOptions } from '@/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { validateDeal } from '@/lib/deals'
import type { BasketItem, SnapshotItem } from '@/types/order'

function asIntId(value: string | number): number | null {
  const n = typeof value === 'number' ? value : parseInt(value, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export type PricingResult = {
  subtotal: number
  discountAmount: number
  deliveryFee: number
  total: number
  snapshot: SnapshotItem[]
}

export async function calculateOrderPricing(params: {
  restaurantId: number
  items: BasketItem[]
  fulfillmentType: 'collection' | 'delivery'
  deliveryFee?: number
  dealCode?: string
}): Promise<PricingResult> {
  const { restaurantId, items, fulfillmentType } = params
  if (items.length === 0) {
    throw new Error('Basket is empty')
  }

  const requestedDeliveryFee = params.deliveryFee ?? 0
  if (requestedDeliveryFee < 0 || requestedDeliveryFee > 100) {
    throw new Error('Invalid delivery fee')
  }
  if (fulfillmentType === 'collection' && requestedDeliveryFee > 0) {
    throw new Error('Delivery fee not allowed for collection orders')
  }
  const deliveryFee = roundMoney(requestedDeliveryFee)

  const itemIds = Array.from(new Set(items.map((i) => asIntId(i.itemId)).filter((v): v is number => v !== null)))
  if (itemIds.length === 0) {
    throw new Error('Invalid item ids')
  }

  const dbItems = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.restaurantId, restaurantId), inArray(menuItems.id, itemIds)))
  const itemMap = new Map(dbItems.map((i) => [i.id, i]))

  const selectedGroupIds = Array.from(new Set(
    items.flatMap((i) => i.selectedModifiers.map((m) => asIntId(m.groupId))).filter((v): v is number => v !== null)
  ))
  const selectedOptionIds = Array.from(new Set(
    items.flatMap((i) => i.selectedModifiers.map((m) => asIntId(m.optionId))).filter((v): v is number => v !== null)
  ))

  const groups = selectedGroupIds.length > 0
    ? await db.select().from(modifierGroups).where(inArray(modifierGroups.id, selectedGroupIds))
    : []
  const groupMap = new Map(groups.map((g) => [g.id, g]))

  const options = selectedOptionIds.length > 0
    ? await db.select().from(modifierOptions).where(inArray(modifierOptions.id, selectedOptionIds))
    : []
  const optionMap = new Map(options.map((o) => [o.id, o]))

  let subtotal = 0
  const snapshot: SnapshotItem[] = []

  for (const basketItem of items) {
    const itemId = asIntId(basketItem.itemId)
    if (!itemId) throw new Error('Invalid item id')

    const menuItem = itemMap.get(itemId)
    if (!menuItem || !menuItem.isAvailable) {
      throw new Error(`Menu item unavailable: ${basketItem.name}`)
    }

    if (!Number.isInteger(basketItem.qty) || basketItem.qty < 1 || basketItem.qty > 50) {
      throw new Error('Invalid item quantity')
    }

    let modifiersTotal = 0
    const snapModifiers: SnapshotItem['selectedModifiers'] = []

    for (const selected of basketItem.selectedModifiers) {
      const groupId = asIntId(selected.groupId)
      const optionId = asIntId(selected.optionId)
      if (!groupId || !optionId) throw new Error('Invalid modifier ids')

      const group = groupMap.get(groupId)
      const option = optionMap.get(optionId)
      if (!group || !option) throw new Error('Modifier not found')
      if (group.menuItemId !== menuItem.id || option.modifierGroupId !== group.id || !option.isAvailable) {
        throw new Error('Invalid modifier selection')
      }

      modifiersTotal += option.priceDelta
      snapModifiers.push({
        groupName: group.name,
        optionName: option.name,
        priceDelta: option.priceDelta,
      })
    }

    const lineTotal = roundMoney(menuItem.basePrice + modifiersTotal)
    subtotal += lineTotal * basketItem.qty
    snapshot.push({
      name: menuItem.name,
      basePrice: menuItem.basePrice,
      selectedModifiers: snapModifiers,
      totalPrice: lineTotal,
      qty: basketItem.qty,
    })
  }

  subtotal = roundMoney(subtotal)

  let discountAmount = 0
  const normalizedDealCode = params.dealCode?.trim().toUpperCase()
  if (normalizedDealCode) {
    const deal = await validateDeal(normalizedDealCode, restaurantId, subtotal)
    if (!deal.valid || !deal.discountType || deal.discountValue === undefined) {
      throw new Error(deal.reason ?? 'Invalid deal code')
    }

    discountAmount = deal.discountType === 'percent'
      ? subtotal * (deal.discountValue / 100)
      : deal.discountValue
    discountAmount = roundMoney(Math.max(0, Math.min(subtotal, discountAmount)))
  }

  const total = roundMoney(Math.max(0, subtotal - discountAmount + deliveryFee))
  return { subtotal, discountAmount, deliveryFee, total, snapshot }
}
