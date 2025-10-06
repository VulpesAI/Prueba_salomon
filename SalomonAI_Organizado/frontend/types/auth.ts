export type UserSession = {
  id: string
  device?: string | null
  ipAddress?: string | null
  city?: string | null
  country?: string | null
  createdAt: string
  lastActiveAt: string
  userAgent?: string | null
  isCurrent?: boolean
}

export type UserSessionsResponse = {
  sessions: UserSession[]
}

