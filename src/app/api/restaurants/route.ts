import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { restaurants, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { seedMenuTemplate } from '@/scripts/seed'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  subdomain: z.string().min(1).regex(/^[a-z0-9-]+$/),
  ownerEmail: z.string().email(),
  planType: z.enum(['starter', 'pro', 'enterprise']).default('starter'),
  commissionRate: z.number().min(0).max(100).default(8.5),
  monthlyFee: z.number().min(0).default(49),
  menuTemplate: z.enum(['chinese', 'pizza', 'burger', 'indian', 'custom']).default('custom'),
})

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db.select().from(restaurants)
  return NextResponse.json({ restaurants: rows })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const data = parsed.data

  // Check subdomain uniqueness
  const existing = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.subdomain, data.subdomain))
    .get()
  if (existing) return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 })

  // Create Stripe Express account
  let stripeAccountId: string | null = null
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const account = await stripe.accounts.create({ type: 'express' })
      stripeAccountId = account.id
    } catch {
      // Continue without Stripe in dev
    }
  }

  // Create restaurant
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      name: data.name,
      subdomain: data.subdomain,
      planType: data.planType,
      commissionRate: data.commissionRate,
      monthlyFee: data.monthlyFee,
      menuTemplate: data.menuTemplate,
      stripeAccountId,
      isActive: 1,
    })
    .returning()

  // Create owner user
  const passwordHash = await bcrypt.hash('changeme123', 10)
  await db.insert(users).values({
    restaurantId: restaurant.id,
    email: data.ownerEmail,
    passwordHash,
    role: 'restaurant_admin',
  })

  // Seed menu template
  await seedMenuTemplate(restaurant.id, data.menuTemplate)

  return NextResponse.json({ restaurant })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { id, ...updates } = body

  const allowed: Record<string, unknown> = {}
  if (typeof updates.commissionRate === 'number') allowed.commissionRate = updates.commissionRate
  if (typeof updates.monthlyFee === 'number') allowed.monthlyFee = updates.monthlyFee
  if (typeof updates.isActive === 'boolean') allowed.isActive = updates.isActive ? 1 : 0
  if (typeof updates.planType === 'string') allowed.planType = updates.planType

  await db.update(restaurants).set(allowed).where(eq(restaurants.id, id))

  return NextResponse.json({ ok: true })
}
