import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { broadcast } from '@/lib/socket'
import { calculateOrderPricing } from '@/lib/pricing'
import { z } from 'zod'

const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  fulfillmentType: z.enum(['collection', 'delivery']).default('collection'),
  items: z.array(z.object({
    basketId: z.string(),
    itemId: z.union([z.string(), z.number()]),
    name: z.string(),
    basePrice: z.number(),
    selectedModifiers: z.array(z.object({
      groupId: z.union([z.string(), z.number()]),
      groupName: z.string(),
      optionId: z.union([z.string(), z.number()]),
      optionName: z.string(),
      priceDelta: z.number(),
    })),
    totalPrice: z.number(),
    qty: z.number().min(1),
    customisationLabel: z.string(),
  })),
  dealCode: z.string().optional(),
  deliveryFee: z.number().min(0).max(100).default(0),
  // Deprecated client-calculated fields (ignored server-side)
  subtotal: z.number().optional(),
  discountAmount: z.number().optional(),
  total: z.number().optional(),
  paymentMethod: z.enum(['card', 'cash']).default('card'),
  stripePaymentIntentId: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data
  let pricing
  try {
    pricing = await calculateOrderPricing({
      restaurantId: tenant.id,
      items: data.items,
      fulfillmentType: data.fulfillmentType,
      deliveryFee: data.fulfillmentType === 'delivery' ? data.deliveryFee : 0,
      dealCode: data.dealCode,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid order pricing' }, { status: 400 })
  }

  const result = await db
    .insert(orders)
    .values({
      restaurantId: tenant.id,
      customerName: data.customerName,
      customerEmail: null,
      customerPhone: data.customerPhone ?? null,
      customerAddress: data.customerAddress ?? null,
      fulfillmentType: data.fulfillmentType,
      itemsSnapshot: JSON.stringify(pricing.snapshot),
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      total: pricing.total,
      status: 'new',
      paymentMethod: data.paymentMethod,
      stripePaymentIntentId: data.stripePaymentIntentId ?? null,
      notes: data.notes ?? null,
    })
    .returning({ id: orders.id })

  const orderId = result[0].id

  const newOrder = {
    id: orderId,
    restaurantId: tenant.id,
    customerName: data.customerName,
    fulfillmentType: data.fulfillmentType,
    itemsSnapshot: pricing.snapshot,
    total: pricing.total,
    status: 'new',
    paymentMethod: data.paymentMethod,
    createdAt: new Date().toISOString(),
  }

  broadcast(String(tenant.id), 'order:new', newOrder)

  return NextResponse.json({
    orderId,
    pricing: {
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total,
    },
  })
}

export async function GET(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')

  let query = db
    .select()
    .from(orders)
    .where(eq(orders.restaurantId, tenant.id))
    .orderBy(desc(orders.createdAt))
    .$dynamic()

  if (status && status !== 'all') {
    const { and } = await import('drizzle-orm')
    query = db
      .select()
      .from(orders)
      .where(and(eq(orders.restaurantId, tenant.id), eq(orders.status, status)))
      .orderBy(desc(orders.createdAt))
      .$dynamic()
  }

  const rows = await query

  return NextResponse.json({
    orders: rows.map((o) => ({
      ...o,
      itemsSnapshot: JSON.parse(o.itemsSnapshot),
    })),
  })
}
