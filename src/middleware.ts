import { NextRequest, NextResponse } from 'next/server'

const PLATFORM_SUBDOMAINS = new Set(['www', 'app', 'superadmin', 'api'])

function extractSubdomain(host: string): string | null {
  // Strip port
  const hostname = host.split(':')[0]
  const parts = hostname.split('.')

  // e.g. goldenpanda.localhost or goldenpanda.localbite.com
  if (parts.length >= 2) {
    const sub = parts[0]
    // 'localhost' alone = no subdomain
    if (hostname === 'localhost' || hostname === '127.0.0.1') return null
    if (PLATFORM_SUBDOMAINS.has(sub)) return null
    return sub
  }
  return null
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const subdomain = extractSubdomain(host)

  // Allow ?tenant= query param for local dev without hosts file
  const tenantParam = req.nextUrl.searchParams.get('tenant')
  const tenant = tenantParam ?? subdomain

  const requestHeaders = new Headers(req.headers)
  if (tenant) {
    requestHeaders.set('x-tenant-subdomain', tenant)
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
