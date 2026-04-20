import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { restaurants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'

const openingHoursRowSchema = z.object({
  day: z.string().min(1),
  open: z.string().min(1),
  close: z.string().min(1),
  on: z.boolean(),
})

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  openingHours: z.array(openingHoursRowSchema).optional(),
  deliveryEnabled: z.boolean().optional(),
  deliveryOriginPostcode: z.string().nullable().optional(),
  deliveryRadiusMiles: z.number().min(0).max(50).optional(),
  deliveryBaseFee: z.number().min(0).max(50).optional(),
  deliveryPerMileFee: z.number().min(0).max(20).optional(),
  deliveryMinOrder: z.number().min(0).max(500).optional(),
})

export async function GET() {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const restaurant = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, tenant.id))
    .get()

  if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      subdomain: restaurant.subdomain,
      contactEmail: restaurant.contactEmail,
      contactPhone: restaurant.contactPhone,
      openingHours: restaurant.openingHours ? JSON.parse(restaurant.openingHours) : null,
      delivery: {
        enabled: Boolean(restaurant.deliveryEnabled),
        originPostcode: restaurant.deliveryOriginPostcode,
        radiusMiles: restaurant.deliveryRadiusMiles,
        baseFee: restaurant.deliveryBaseFee,
        perMileFee: restaurant.deliveryPerMileFee,
        minOrder: restaurant.deliveryMinOrder,
      },
    },
  })
}

export async function PATCH(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim()
  if (parsed.data.contactEmail !== undefined) updates.contactEmail = parsed.data.contactEmail?.trim() || null
  if (parsed.data.contactPhone !== undefined) updates.contactPhone = parsed.data.contactPhone?.trim() || null
  if (parsed.data.openingHours !== undefined) updates.openingHours = JSON.stringify(parsed.data.openingHours)
  if (parsed.data.deliveryEnabled !== undefined) updates.deliveryEnabled = parsed.data.deliveryEnabled ? 1 : 0
  if (parsed.data.deliveryOriginPostcode !== undefined) updates.deliveryOriginPostcode = parsed.data.deliveryOriginPostcode?.trim().toUpperCase() || null
  if (parsed.data.deliveryRadiusMiles !== undefined) updates.deliveryRadiusMiles = parsed.data.deliveryRadiusMiles
  if (parsed.data.deliveryBaseFee !== undefined) updates.deliveryBaseFee = parsed.data.deliveryBaseFee
  if (parsed.data.deliveryPerMileFee !== undefined) updates.deliveryPerMileFee = parsed.data.deliveryPerMileFee
  if (parsed.data.deliveryMinOrder !== undefined) updates.deliveryMinOrder = parsed.data.deliveryMinOrder

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  await db.update(restaurants).set(updates).where(eq(restaurants.id, tenant.id))

  return NextResponse.json({ ok: true })
}
