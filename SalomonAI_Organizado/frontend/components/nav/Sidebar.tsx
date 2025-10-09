"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { buildNav, findSectionByPath, isActive } from "@/lib/nav/derive"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

export default function Sidebar() {
  const pathname = usePathname()
  const sections = buildNav()
  const currentSectionId = findSectionByPath(sections, pathname) ?? sections[0]?.id
  const [openSectionId, setOpenSectionId] = useState<string | undefined>(
    currentSectionId ?? undefined,
  )

  useEffect(() => {
    setOpenSectionId(currentSectionId ?? undefined)
  }, [currentSectionId])

  return (
    <nav aria-label="Navegación lateral" className="space-y-6 pt-4" data-orientation="vertical">
      <Accordion
        type="single"
        collapsible
        value={openSectionId}
        onValueChange={setOpenSectionId}
      >
        {sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border-none">
            <AccordionTrigger className="px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline [&>svg]:text-muted-foreground data-[state=open]:text-foreground data-[state=open]>svg:text-foreground">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm">
              <div className="px-0 pb-1 pt-2">
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href)
                    return (
                      <li key={item.id} className="space-y-1">
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
                            active
                              ? "border-app-accent bg-[color:color-mix(in_srgb,var(--accent)_16%,transparent)] text-app shadow-sm"
                              : "border-transparent text-app-dim hover:border-app-border-subtle hover:bg-app-surface-subtle hover:text-app"
                          )}
                        >
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.id === "insights" && (
                            <div className="ml-auto inline-flex flex-shrink-0 items-center rounded-full border border-transparent bg-app-card px-2.5 py-0.5 text-xs font-semibold text-app-dim transition-colors hover:bg-app-card-subtle">
                              IA
                            </div>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </nav>
  )
}
