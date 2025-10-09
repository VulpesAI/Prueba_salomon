"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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

  return (
    <nav aria-label="Navegación lateral" className="space-y-6 pt-4" data-orientation="vertical">
      <Accordion type="single" collapsible value={currentSectionId ?? undefined}>
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
                            "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                            active
                              ? "bg-gradient-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-gradient-primary hover:text-primary-foreground hover:shadow-sm"
                          )}
                        >
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.id === "insights" && (
                            <div className="ml-auto inline-flex flex-shrink-0 items-center rounded-full border border-transparent bg-card px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-card/80">
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
