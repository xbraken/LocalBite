import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/db'
import { restaurants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ restaurantId: z.number() })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const restaurant = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, parsed.data.restaurantId))
    .get()

  if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let accountId = restaurant.stripeAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' })
    accountId = account.id
    await db
      .update(restaurants)
      .set({ stripeAccountId: accountId })
      .where(eq(restaurants.id, restaurant.id))
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXTAUTH_URL}/superadmin`,
    return_url: `${process.env.NEXTAUTH_URL}/superadmin`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
