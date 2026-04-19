import { NextRequest, NextResponse } from 'next/server'
import { getTenantFromRequest } from '@/lib/tenant'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  total: z.number().positive(),
})

export async function POST(req: NextRequest) {
  const tenant = await getTenantFromRequest()
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const totalPence = Math.round(parsed.data.total * 100)
  const feePence = Math.round(totalPence * (tenant.commissionRate / 100))

  const intentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
    amount: totalPence,
    currency: 'gbp',
    payment_method_types: ['card'],
    metadata: { restaurantId: String(tenant.id), subdomain: tenant.subdomain },
  }

  if (tenant.stripeAccountId) {
    intentParams.application_fee_amount = feePence
    intentParams.transfer_data = { destination: tenant.stripeAccountId }
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams)

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
