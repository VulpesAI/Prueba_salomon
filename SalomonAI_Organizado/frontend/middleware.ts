import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const hasSessionToken = Boolean(token && token.length > 0)

  // Rutas protegidas que requieren autenticación
  const protectedPaths = [
    "/dashboard",
    "/accounts",
    "/transactions",
    "/analytics",
    "/goals",
    "/alerts",
    "/assistant",
    "/settings",
  ]
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !hasSessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirigir usuarios autenticados fuera de login/signup
  const authPaths = ["/login", "/signup"]
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath && hasSessionToken) {
    return NextResponse.redirect(new URL("/dashboard/overview", request.url))
  }

  const response = NextResponse.next()

  if (hasSessionToken) {
    response.headers.set("x-authenticated-session", "true")
  }

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/transactions/:path*",
    "/analytics/:path*",
    "/goals/:path*",
    "/alerts/:path*",
    "/assistant/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
}
