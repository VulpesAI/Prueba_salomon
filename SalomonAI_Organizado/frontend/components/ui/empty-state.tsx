"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { Button, type ButtonProps } from "./button"

export type EmptyStateAction = {
  label: string
  href?: string
  onClick?: () => void
  icon?: LucideIcon
  variant?: ButtonProps["variant"]
  disabled?: boolean
}

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  cta?: EmptyStateAction
  align?: "center" | "start"
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  align = "center",
  className,
  children,
}: EmptyStateProps) {
  const alignmentClasses =
    align === "start"
      ? "items-start text-left"
      : "items-center text-center"

  const iconWrapperClasses =
    align === "start"
      ? "self-start rounded-full bg-muted p-3"
      : "rounded-full bg-muted p-3"

  return (
    <div className={cn("flex flex-col gap-4", alignmentClasses, className)}>
      <div className={cn("inline-flex", iconWrapperClasses)}>
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
      {cta ? (
        cta.href ? (
          <Button
            asChild
            variant={cta.variant ?? "default"}
            className="gap-2"
            disabled={cta.disabled}
          >
            <Link href={cta.href}>
              {cta.icon ? <cta.icon className="h-4 w-4" aria-hidden /> : null}
              {cta.label}
            </Link>
          </Button>
        ) : (
          <Button
            onClick={cta.onClick}
            variant={cta.variant ?? "default"}
            className="gap-2"
            disabled={cta.disabled}
          >
            {cta.icon ? <cta.icon className="h-4 w-4" aria-hidden /> : null}
            {cta.label}
          </Button>
        )
      ) : null}
    </div>
  )
}
