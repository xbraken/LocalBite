import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { broadcast } from '@/lib/socket'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['new', 'preparing', 'complete', 'cancelled']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const orderId = parseInt(params.orderId)
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  await db
    .update(orders)
    .set({ status: parsed.data.status })
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, tenant.id)))

  broadcast(String(tenant.id), 'order:updated', { orderId, status: parsed.data.status })

  return NextResponse.json({ ok: true })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const orderId = parseInt(params.orderId)
  const order = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, tenant.id)))
    .get()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  return NextResponse.json({
    order: {
      ...order,
      itemsSnapshot: JSON.parse(order.itemsSnapshot),
    },
  })
}
