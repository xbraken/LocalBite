import { headers } from 'next/headers'
import { db } from '@/db'
import { restaurants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { Restaurant } from '@/types/tenant'

export async function getTenantFromRequest(): Promise<Restaurant | null> {
  const headersList = headers()
  const subdomain = headersList.get('x-tenant-subdomain')
  if (!subdomain) return null

  const row = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.subdomain, subdomain))
    .get()

  if (!row || !row.isActive) return null

  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    logo: row.logo,
    brandColours: row.brandColours ? JSON.parse(row.brandColours) : null,
    commissionRate: row.commissionRate,
    monthlyFee: row.monthlyFee,
    planType: row.planType,
    stripeAccountId: row.stripeAccountId,
    isActive: Boolean(row.isActive),
    menuTemplate: row.menuTemplate,
    createdAt: row.createdAt,
  }
}

export async function getTenantById(id: number): Promise<Restaurant | null> {
  const row = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, id))
    .get()

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    logo: row.logo,
    brandColours: row.brandColours ? JSON.parse(row.brandColours) : null,
    commissionRate: row.commissionRate,
    monthlyFee: row.monthlyFee,
    planType: row.planType,
    stripeAccountId: row.stripeAccountId,
    isActive: Boolean(row.isActive),
    menuTemplate: row.menuTemplate,
    createdAt: row.createdAt,
  }
}
