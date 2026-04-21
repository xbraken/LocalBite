import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { deals } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getTenantFromRequest } from '@/lib/tenant'
import { requireTenantAccess } from '@/lib/authz'
import { validateDeal } from '@/lib/deals'
import { z } from 'zod'

const validateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
})

const createSchema = z.object({
  code: z.string().min(1),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.number().positive(),
  minOrder: z.number().min(0).default(0),
  expiresAt: z.string().nullable().optional(),
})

export async function GET() {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await db
    .select()
    .from(deals)
    .where(eq(deals.restaurantId, tenant.id))
    .orderBy(desc(deals.id))

  return NextResponse.json({
    deals: rows.map((deal) => ({
      ...deal,
      isActive: Boolean(deal.isActive),
    })),
  })
}

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = validateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const result = await validateDeal(parsed.data.code, tenant.id, parsed.data.subtotal)
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const access = await requireTenantAccess(['restaurant_admin', 'super_admin'])
  if (!access.ok) return access.response
  const { tenant } = access.data

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const data = parsed.data
  const code = data.code.trim().toUpperCase()

  const duplicate = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.restaurantId, tenant.id), eq(deals.code, code)))
    .get()

  if (duplicate) {
    return NextResponse.json({ error: 'A deal with that code already exists' }, { status: 409 })
  }

  const inserted = await db
    .insert(deals)
    .values({
      restaurantId: tenant.id,
      code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrder: data.minOrder,
      expiresAt: data.expiresAt ?? null,
      isActive: 1,
    })
    .returning()

  return NextResponse.json({
    deal: {
      ...inserted[0],
      isActive: Boolean(inserted[0].isActive),
    },
  }, { status: 201 })
}
