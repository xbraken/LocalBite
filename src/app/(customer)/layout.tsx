import { getTenantFromRequest } from '@/lib/tenant'
import { notFound } from 'next/navigation'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantFromRequest()

  // No tenant = unknown subdomain = 404
  if (!tenant) notFound()

  return <>{children}</>
}
