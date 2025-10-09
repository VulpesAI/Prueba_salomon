import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { Button } from "./button"

interface EmptyStateProps {
  title?: string
  description?: string
  action?: ReactNode
  ctaLabel?: string
  onCta?: () => void
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  ctaLabel,
  onCta,
  className,
}: EmptyStateProps) {
  const resolvedTitle = title ?? "Sin información disponible"
  const fallbackAction = ctaLabel && onCta ? (
    <Button onClick={onCta} variant="secondary">
      {ctaLabel}
    </Button>
  ) : null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-dashed border-app-border bg-app-card-subtle p-8 text-center text-app",
        className
      )}
    >
      <div className="text-title leading-tight">{resolvedTitle}</div>
      {description ? (
        <p className="text-sm text-app-dim">{description}</p>
      ) : null}
      {action ?? fallbackAction ? (
        <div className="mt-2 flex justify-center">
          {action ?? fallbackAction}
        </div>
      ) : null}
    </div>
  )
}
