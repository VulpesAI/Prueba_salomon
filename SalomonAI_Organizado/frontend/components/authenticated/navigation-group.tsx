"use client"

import Link from "next/link"

import {
  AccordionContent as BaseAccordionContent,
  AccordionItem as BaseAccordionItem,
  AccordionTrigger as BaseAccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { NavigationGroup as NavigationGroupConfig } from "@/src/config/post-login-navigation"

import { getMatchScore } from "./navigation-utils"

type NavigationGroupProps = {
  group: NavigationGroupConfig
  pathname: string
  accordionComponents?: {
    AccordionItem?: typeof BaseAccordionItem
    AccordionTrigger?: typeof BaseAccordionTrigger
    AccordionContent?: typeof BaseAccordionContent
  }
}

export function NavigationGroup({
  group,
  pathname,
  accordionComponents,
}: NavigationGroupProps) {
  const {
    AccordionItem = BaseAccordionItem,
    AccordionTrigger = BaseAccordionTrigger,
    AccordionContent = BaseAccordionContent,
  } = accordionComponents ?? {}

  return (
    <AccordionItem value={group.title} className="border-none">
      <AccordionTrigger className="px-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary-foreground/70 hover:no-underline [&>svg]:text-secondary-foreground/70 [&[data-state=open]]:text-secondary-foreground">
        {group.title}
      </AccordionTrigger>
      <AccordionContent className="px-0 pb-1 pt-2">
        <ul className="space-y-1">
          {group.items.map((item) => {
            const isActive = getMatchScore(pathname, item) > 0

            return (
              <li key={`${group.title}-${item.href}`} className="space-y-1">
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors",
                    "hover:bg-white/10 hover:text-white",
                    isActive && "bg-white/10 text-primary"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-white/70 group-hover:text-white"
                    )}
                  />
                  <span className="flex-1 truncate">{item.title}</span>
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
                  <p className="px-3 text-xs text-secondary-foreground/70">
                    {item.description}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </AccordionContent>
    </AccordionItem>
  )
}
