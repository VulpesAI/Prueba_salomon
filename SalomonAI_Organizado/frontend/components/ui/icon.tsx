import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type IconSize = "sm" | "md" | "lg"

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

export type IconName = keyof typeof Icons

export interface IconProps {
  name: IconName
  size?: number | IconSize
  className?: string
  label?: string
}

const resolveSize = (value: IconProps["size"] | undefined) => {
  if (typeof value === "number") {
    return value
  }

  if (!value) {
    return SIZE_MAP.md
  }

  return SIZE_MAP[value] ?? SIZE_MAP.md
}

export function Icon({ name, size, className, label }: IconProps) {
  const Glyph = Icons[name] as LucideIcon | undefined

  if (!Glyph) {
    return null
  }

  const dimension = resolveSize(size)
  const ariaProps = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const }

  return (
    <Glyph
      width={dimension}
      height={dimension}
      className={cn("stroke-[1.6]", className)}
      focusable="false"
      {...ariaProps}
    />
  )
}
