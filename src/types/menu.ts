export interface ModifierOption {
  id: number | string
  name: string
  priceDelta: number
  isAvailable: boolean
  sortOrder: number
}

export interface ModifierGroup {
  id: number | string
  menuItemId: number | string
  name: string
  type: 'required' | 'optional'
  minChoices: number
  maxChoices: number
  sortOrder: number
  options: ModifierOption[]
}

export interface MenuItem {
  id: number | string
  restaurantId: number
  name: string
  description: string | null
  basePrice: number
  category: string
  imageUrl: string | null
  isAvailable: boolean
  sortOrder: number
  modifierGroups: ModifierGroup[]
}

export type MenuByCategory = Record<string, MenuItem[]>
