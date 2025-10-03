import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/accounts/:path*',
    '/transactions/:path*',
    '/analytics/:path*',
    '/goals/:path*',
    '/alerts/:path*',
    '/assistant/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
}
