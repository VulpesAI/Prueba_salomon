"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Icon, type IconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

type RailItem = {
  id: string
  label: string
  href: string
  icon: IconName
}

const RAIL_ITEMS: RailItem[] = [
  { id: "overview", label: "Resumen", href: "/dashboard/overview", icon: "LayoutDashboard" },
  { id: "transactions", label: "Movimientos", href: "/transactions", icon: "ReceiptText" },
  { id: "goals", label: "Metas", href: "/goals", icon: "Target" },
  { id: "alerts", label: "Alertas", href: "/alerts", icon: "Bell" },
  { id: "assistant", label: "Asistente", href: "/assistant", icon: "Bot" },
  { id: "settings", label: "Configuración", href: "/settings/profile", icon: "Settings" },
]

export function NavigationRail() {
  const pathname = usePathname() ?? ""

  return (
    <nav
      aria-label="Navegación principal"
      className="hidden h-dvh w-[72px] flex-col items-center border-r border-app-border-subtle bg-app-surface/70 py-6 md:flex lg:hidden"
    >
      <ul className="flex w-full flex-1 flex-col items-stretch gap-2">
        {RAIL_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.id} className="px-2">
              <Link
                href={item.href}
                className={cn(
                  "touch-target touch-feedback relative flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium text-app-dim transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
                  active &&
                    "bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] font-semibold text-app"
                )}
                aria-current={active ? "page" : undefined}
                title={item.label}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute left-2 top-3 h-[calc(100%-24px)] w-1 rounded-full opacity-0 transition",
                    active && "opacity-100 bg-[color:color-mix(in_srgb,var(--accent)_65%,transparent)]"
                  )}
                />
                <Icon name={item.icon} className="h-5 w-5" aria-hidden />
                <span className="hidden text-[11px] leading-tight sm:block">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
