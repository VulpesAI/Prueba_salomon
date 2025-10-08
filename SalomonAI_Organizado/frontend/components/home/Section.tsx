import type { ReactNode } from "react"
import clsx from "clsx"

interface SectionProps {
  className?: string
  children: ReactNode
}

export function Section({ className, children }: SectionProps) {
  return (
    <section className={clsx("mx-auto max-w-6xl px-4 py-10 md:py-14", className)}>
      {children}
    </section>
  )
}
