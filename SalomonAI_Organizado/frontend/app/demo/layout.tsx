import type { ReactNode } from 'react'

import DemoLayoutClient from './layout.client'

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <DemoLayoutClient>{children}</DemoLayoutClient>
}
