export type OrderStatus = 'new' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'complete' | 'cancelled'
export type PaymentMethod = 'card' | 'cash'
export type FulfillmentType = 'collection' | 'delivery'

export interface SelectedModifier {
  groupId: number | string
  groupName: string
  optionId: number | string
  optionName: string
  priceDelta: number
}

export interface BasketItem {
  basketId: string // unique per customised instance
  itemId: number | string
  name: string
  basePrice: number
  selectedModifiers: SelectedModifier[]
  totalPrice: number
  qty: number
  customisationLabel: string // e.g. "Medium • Egg Fried Rice"
}

export interface SnapshotItem {
  name: string
  basePrice: number
  selectedModifiers: {
    groupName: string
    optionName: string
    priceDelta: number
  }[]
  totalPrice: number
  qty: number
}

export interface Order {
  id: number
  restaurantId: number
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerAddress: string | null
  fulfillmentType: FulfillmentType
  itemsSnapshot: SnapshotItem[]
  subtotal: number
  discountAmount: number
  total: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  stripePaymentIntentId: string | null
  notes: string | null
  createdAt: string
}
