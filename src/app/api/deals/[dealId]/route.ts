import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { deals } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { z } from 'zod'

const patchSchema = z.object({
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dealId = parseInt(params.dealId)
  if (Number.isNaN(dealId)) return NextResponse.json({ error: 'Invalid deal id' }, { status: 400 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await db
    .update(deals)
    .set({
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive ? 1 : 0 } : {}),
    })
    .where(and(eq(deals.id, dealId), eq(deals.restaurantId, tenant.id)))

  return NextResponse.json({ ok: true })
}
