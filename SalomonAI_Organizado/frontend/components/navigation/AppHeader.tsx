"use client"

import {
  useMemo,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react"
import { usePathname } from "next/navigation"

import { buildNav, findSectionByPath, isActive } from "@/lib/nav/derive"
import { Icon } from "@/components/ui/icon"
import { Breadcrumbs } from "@/components/authenticated/breadcrumbs"

type AppHeaderProps = {
  navigationOpen: boolean
  onNavigationToggle: () => void
  navigationId: string
  triggerRef:
    | RefObject<HTMLButtonElement>
    | MutableRefObject<HTMLButtonElement | null>
  actions?: ReactNode
}

export function AppHeader({
  navigationOpen,
  onNavigationToggle,
  navigationId,
  triggerRef,
  actions,
}: AppHeaderProps) {
  const pathname = usePathname() ?? ""

  const sections = useMemo(() => buildNav(), [])
  const currentSectionId = findSectionByPath(sections, pathname)

  const activeItem = useMemo(() => {
    for (const section of sections) {
      for (const item of section.items) {
        if (isActive(pathname, item.href)) {
          return { section, item }
        }
      }
    }
    if (currentSectionId) {
      const fallbackSection = sections.find((section) => section.id === currentSectionId)
      if (fallbackSection?.items[0]) {
        return { section: fallbackSection, item: fallbackSection.items[0] }
      }
    }
    return null
  }, [currentSectionId, pathname, sections])

  const viewTitle = activeItem?.item.label ?? "SalomónAI"
  const viewSection = activeItem?.section.label

  return (
    <header className="sticky top-0 z-30 border-b border-app-border-subtle bg-app-surface/95 backdrop-blur supports-[backdrop-filter]:bg-app-surface/92">
      <div className="safe-pt safe-pb flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <button
            ref={triggerRef}
            type="button"
            aria-controls={navigationId}
            aria-expanded={navigationOpen}
            aria-label={navigationOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={onNavigationToggle}
            className="touch-target touch-feedback inline-flex items-center justify-center rounded-2xl border border-app-border-subtle bg-app-surface-subtle px-3 text-app transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
          >
            <Icon name="Menu" className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0">
            {viewSection ? (
              <span className="caption block text-app-dim">{viewSection}</span>
            ) : null}
            <h1 className="h2 truncate text-app">{viewTitle}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {actions}
        </div>
      </div>
      <div className="hidden px-4 pb-3 sm:px-6 lg:px-8 lg:block">
        <Breadcrumbs sections={sections} />
      </div>
    </header>
  )
}
