import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenantFromRequest } from '@/lib/tenant'
import type { Restaurant } from '@/types/tenant'

type TenantAccessData = {
  tenant: Restaurant
  session: NonNullable<Awaited<ReturnType<typeof auth>>>
}

type TenantAccessResult =
  | { ok: true; data: TenantAccessData }
  | { ok: false; response: NextResponse }

export async function requireTenantAccess(allowedRoles: string[]): Promise<TenantAccessResult> {
  const tenant = await getTenantFromRequest()
  if (!tenant) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }

  const session = await auth()
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!allowedRoles.includes(session.user.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  if (
    (session.user.role === 'restaurant_admin' || session.user.role === 'kitchen_staff') &&
    session.user.restaurantId !== tenant.id
  ) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, data: { tenant, session } }
}
