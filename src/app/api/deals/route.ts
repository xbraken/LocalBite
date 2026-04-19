import { NextRequest, NextResponse } from 'next/server'
import { getTenantFromRequest } from '@/lib/tenant'
import { validateDeal } from '@/lib/deals'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
})

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const result = await validateDeal(parsed.data.code, tenant.id, parsed.data.subtotal)
  return NextResponse.json(result)
}
