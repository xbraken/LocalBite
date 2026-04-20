import { NextResponse } from 'next/server'
import { db } from '@/db'
import { restaurants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'

export async function GET() {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const r = await db
    .select({
      deliveryEnabled: restaurants.deliveryEnabled,
      deliveryOriginPostcode: restaurants.deliveryOriginPostcode,
      deliveryRadiusMiles: restaurants.deliveryRadiusMiles,
      deliveryBaseFee: restaurants.deliveryBaseFee,
      deliveryPerMileFee: restaurants.deliveryPerMileFee,
      deliveryMinOrder: restaurants.deliveryMinOrder,
    })
    .from(restaurants)
    .where(eq(restaurants.id, tenant.id))
    .get()

  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    delivery: {
      enabled: Boolean(r.deliveryEnabled),
      originPostcode: r.deliveryOriginPostcode,
      radiusMiles: r.deliveryRadiusMiles,
      baseFee: r.deliveryBaseFee,
      perMileFee: r.deliveryPerMileFee,
      minOrder: r.deliveryMinOrder,
    },
  })
}
