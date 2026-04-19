import type { BasketItem, SnapshotItem } from '@/types/order'

export function buildOrderSnapshot(basketItems: BasketItem[]): SnapshotItem[] {
  return basketItems.map((item) => ({
    name: item.name,
    basePrice: item.basePrice,
    selectedModifiers: item.selectedModifiers.map((mod) => ({
      groupName: mod.groupName,
      optionName: mod.optionName,
      priceDelta: mod.priceDelta,
    })),
    totalPrice: item.totalPrice,
    qty: item.qty,
  }))
}
