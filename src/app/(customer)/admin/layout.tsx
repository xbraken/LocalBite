import { auth } from '@/lib/auth'
import { getTenantFromRequest } from '@/lib/tenant'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, tenant] = await Promise.all([auth(), getTenantFromRequest()])

  if (!session) redirect('/login')
  if (session.user.role !== 'restaurant_admin' && session.user.role !== 'super_admin') redirect('/')
  if (session.user.role === 'restaurant_admin' && tenant && session.user.restaurantId !== tenant.id) redirect('/')

  return <>{children}</>
}
