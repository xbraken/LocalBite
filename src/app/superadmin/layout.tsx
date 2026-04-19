import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'super_admin') redirect('/login')
  return <>{children}</>
}
