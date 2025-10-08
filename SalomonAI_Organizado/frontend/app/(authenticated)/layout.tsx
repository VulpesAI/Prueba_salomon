import type { ReactNode } from "react"

import AuthenticatedLayoutClient from "./layout.client"

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AuthenticatedLayoutClient dehydratedState={undefined}>
      {children}
    </AuthenticatedLayoutClient>
  )
}
