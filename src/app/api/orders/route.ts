import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { buildOrderSnapshot } from '@/lib/snapshot'
import { broadcast } from '@/lib/socket'
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
  subtotal: z.number(),
  discountAmount: z.number().default(0),
  total: z.number(),
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
  const snapshot = buildOrderSnapshot(data.items)

  const result = await db
    .insert(orders)
    .values({
      restaurantId: tenant.id,
      customerName: data.customerName,
      customerEmail: null,
      customerPhone: data.customerPhone ?? null,
      customerAddress: data.customerAddress ?? null,
      fulfillmentType: data.fulfillmentType,
      itemsSnapshot: JSON.stringify(snapshot),
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      total: data.total,
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
    itemsSnapshot: snapshot,
    total: data.total,
    status: 'new',
    paymentMethod: data.paymentMethod,
    createdAt: new Date().toISOString(),
  }

  broadcast(String(tenant.id), 'order:new', newOrder)

  return NextResponse.json({ orderId })
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
