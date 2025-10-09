import type { SVGProps } from "react"
import { icons } from "lucide-react"

import { cn } from "@/lib/utils"

type IconSize = "sm" | "md" | "lg"

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

export type IconName = keyof typeof icons

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: IconSize
  label?: string
}

export function Icon({ name, size = "md", className, label, ...props }: IconProps) {
  const LucideIcon = icons[name]

  if (!LucideIcon) {
    return null
  }

  const ariaProps = label
    ? { "aria-label": label }
    : { "aria-hidden": true }

  return (
    <LucideIcon
      className={cn("stroke-[1.6]", className)}
      size={SIZE_MAP[size]}
      {...ariaProps}
      {...props}
    />
  )
}
