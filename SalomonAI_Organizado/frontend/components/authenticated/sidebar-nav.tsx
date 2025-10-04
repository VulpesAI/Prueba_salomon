"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { postLoginNavigation } from "@/src/config/post-login-navigation"

import { NavigationGroup } from "./navigation-group"
import { flattenNavigation, getMatchScore } from "./navigation-utils"

const getQuickActions = () =>
  flattenNavigation(postLoginNavigation)
    .filter(({ item }) => item.quickAction)
    .map(({ item }) => item)

export function SidebarNav({
  navigation = postLoginNavigation,
  className,
}: {
  navigation?: typeof postLoginNavigation
  className?: string
}) {
  const pathname = usePathname() ?? ""
  const quickActions = getQuickActions()
  const activeGroups = navigation
    .filter((group) =>
      group.items.some((item) => getMatchScore(pathname, item) > 0)
    )
    .map((group) => group.title)

  const accordionComponents = {
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
  }

  return (
    <aside className={cn("border-r bg-muted/10", className)}>
      <div className="flex h-full w-72 flex-col">
        <div className="flex h-16 items-center px-6">
          <Link
            href="/dashboard/overview"
            className="text-lg font-semibold tracking-tight"
          >
            SalomonAI
          </Link>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8">
          <Accordion
            type="multiple"
            defaultValue={activeGroups.length ? activeGroups : undefined}
            className="space-y-6 pt-4"
          >
            {navigation.map((group) => (
              <NavigationGroup
                key={group.title}
                group={group}
                pathname={pathname}
                accordionComponents={accordionComponents}
              />
            ))}
          </Accordion>
          {quickActions.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed border-muted-foreground/40 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Accesos rápidos
              </p>
              <div className="grid gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={`quick-${action.href}`}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2"
                    asChild
                  >
                    <Link href={action.href}>
                      <action.icon className="h-4 w-4" />
                      {action.title}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
