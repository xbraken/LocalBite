import { db } from '@/db'
import { deals } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

interface DealResult {
  valid: boolean
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  reason?: string
}

export async function validateDeal(
  code: string,
  restaurantId: number,
  subtotal: number
): Promise<DealResult> {
  const deal = await db
    .select()
    .from(deals)
    .where(
      and(
        eq(deals.restaurantId, restaurantId),
        eq(deals.code, code.toUpperCase()),
        eq(deals.isActive, 1)
      )
    )
    .get()

  if (!deal) return { valid: false, reason: 'Invalid code' }

  if (deal.expiresAt && new Date(deal.expiresAt) < new Date()) {
    return { valid: false, reason: 'Code has expired' }
  }

  if (subtotal < deal.minOrder) {
    return {
      valid: false,
      reason: `Minimum order £${deal.minOrder.toFixed(2)} required`,
    }
  }

  return {
    valid: true,
    discountType: deal.discountType as 'percent' | 'fixed',
    discountValue: deal.discountValue,
  }
}
