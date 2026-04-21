import { NextRequest, NextResponse } from 'next/server'
import { getTenantFromRequest } from '@/lib/tenant'
import { stripe } from '@/lib/stripe'
import { calculateOrderPricing } from '@/lib/pricing'
import { z } from 'zod'

const schema = z.object({
  total: z.number().positive().optional(),
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
  })).optional(),
  dealCode: z.string().optional(),
  deliveryFee: z.number().min(0).max(100).default(0),
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

  let total = parsed.data.total ?? 0
  if (parsed.data.items && parsed.data.items.length > 0) {
    try {
      const pricing = await calculateOrderPricing({
        restaurantId: tenant.id,
        items: parsed.data.items,
        fulfillmentType: parsed.data.fulfillmentType,
        deliveryFee: parsed.data.fulfillmentType === 'delivery' ? parsed.data.deliveryFee : 0,
        dealCode: parsed.data.dealCode,
      })
      total = pricing.total
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid checkout pricing' }, { status: 400 })
    }
  }

  if (total <= 0) {
    return NextResponse.json({ error: 'Invalid total' }, { status: 400 })
  }

  const totalPence = Math.round(total * 100)
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
