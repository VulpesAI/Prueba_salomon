"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  buildNav,
  findSectionByPath,
  flattenNav,
  isNavItemActive,
} from "@/lib/nav/derive"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarProps = {
  className?: string
  sections?: ReturnType<typeof buildNav>
}

export default function Sidebar({ className, sections: sectionsProp }: SidebarProps) {
  const pathname = usePathname() ?? ""
  const sections = React.useMemo(() => sectionsProp ?? buildNav(), [sectionsProp])
  const currentSectionId =
    findSectionByPath(sections, pathname) ?? sections[0]?.id
  const quickActions = React.useMemo(
    () =>
      flattenNav(sections)
        .filter((item) => item.quickAction)
        .slice(0, 3),
    [sections]
  )

  return (
    <aside
      className={cn(
        "border-r border-border bg-background text-textPrimary",
        className
      )}
    >
      <div className="flex h-full w-72 flex-col">
        <div className="flex h-16 items-center px-6">
          <Link
            href="/dashboard/overview"
            className="text-lg font-semibold tracking-tight text-textPrimary"
          >
            SalomonAI
          </Link>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8">
          <Accordion
            type="single"
            collapsible
            value={currentSectionId ?? undefined}
            className="space-y-6 pt-4"
          >
            {sections.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border-none"
              >
                <AccordionTrigger className="px-3 text-left text-xs font-semibold uppercase tracking-wide text-textSecondary hover:no-underline [&>svg]:text-iconSecondary data-[state=open]:text-textPrimary data-[state=open]>svg:text-iconPrimary">
                  {section.label}
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-1 pt-2">
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const active = isNavItemActive(pathname, item)

                      return (
                        <li key={`${section.id}-${item.id}`} className="space-y-1">
                          <Link
                            href={item.href}
                            className={cn(
                              "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-textSecondary transition",
                              "hover:bg-gradient-primary hover:text-primary-foreground hover:shadow-sm",
                              active && "bg-gradient-primary text-primary-foreground shadow-sm"
                            )}
                            aria-current={active ? "page" : undefined}
                          >
                            {Icon ? (
                              <Icon
                                className={cn(
                                  "h-4 w-4 transition-colors",
                                  active
                                    ? "text-primary-foreground"
                                    : "text-iconSecondary group-hover:text-primary-foreground"
                                )}
                              />
                            ) : null}
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge ? (
                              <Badge
                                variant={item.badge.variant}
                                className="ml-auto flex-shrink-0"
                              >
                                {item.badge.label}
                              </Badge>
                            ) : null}
                          </Link>
                          {item.description ? (
                            <p className="px-4 text-xs text-textSecondary">
                              {item.description}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {quickActions.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-panel-subtle p-4">
              <p className="text-xs font-semibold uppercase text-textSecondary">
                Accesos rápidos
              </p>
              <div className="grid gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <Button
                      key={`quick-${action.href}`}
                      variant="ghost"
                      size="sm"
                      className="group justify-start gap-2 text-textPrimary hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
                      asChild
                    >
                      <Link href={action.href}>
                        {Icon ? (
                          <Icon className="h-4 w-4 text-iconPrimary transition-colors group-hover:text-primary-foreground" />
                        ) : null}
                        {action.label}
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
