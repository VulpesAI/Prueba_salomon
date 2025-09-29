import { createCipheriv, createHash, randomBytes } from "crypto"

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const TOKEN_COOKIE_NAME = "token"
const REFRESH_COOKIE_NAME = "refreshToken"

const isProduction = process.env.NODE_ENV === "production"

const deriveEncryptionKey = () => {
  const secret = process.env.REFRESH_TOKEN_COOKIE_SECRET
  if (!secret) {
    return null
  }

  const hash = createHash("sha256").update(secret).digest()
  return hash.subarray(0, 32)
}

const encryptRefreshToken = (refreshToken: string) => {
  const key = deriveEncryptionKey()
  if (!key) {
    return null
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url")
}

const resolveExpiration = (expiresAt?: unknown): Date | undefined => {
  if (!expiresAt) {
    return undefined
  }

  if (typeof expiresAt === "number") {
    return new Date(expiresAt)
  }

  if (typeof expiresAt === "string") {
    const timestamp = Date.parse(expiresAt)
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp)
    }
  }

  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const { token, refreshToken, expiresAt } = (await request.json()) as {
      token?: string
      refreshToken?: string
      expiresAt?: unknown
    }

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ ok: true })
    const expirationDate = resolveExpiration(expiresAt)

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      ...(expirationDate ? { expires: expirationDate } : { maxAge: 60 * 15 }),
    })

    if (refreshToken) {
      const encryptedRefreshToken = encryptRefreshToken(refreshToken) ?? refreshToken

      response.cookies.set({
        name: REFRESH_COOKIE_NAME,
        value: encryptedRefreshToken,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    return response
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  })

  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  })

  return response
}
