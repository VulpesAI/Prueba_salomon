import type { ReactNode } from "react"

import MovementsLayoutClient from "./layout.client"

export default function MovementsLayout({ children }: { children: ReactNode }) {
  return <MovementsLayoutClient>{children}</MovementsLayoutClient>
}
