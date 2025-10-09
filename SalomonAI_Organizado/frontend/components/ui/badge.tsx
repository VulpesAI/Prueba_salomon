import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] text-app-accent backdrop-blur-sm",
        primary: "border-transparent bg-app-accent text-app-accent-contrast",
        secondary:
          "border border-app-border bg-app-card-subtle text-app-dim",
        destructive:
          "border-transparent bg-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] text-app-danger",
        outline: "border border-app-border text-app",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
