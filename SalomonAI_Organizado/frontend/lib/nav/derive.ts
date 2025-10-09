import type { Route } from "next"

import { NAV_SECTIONS_BASE, NAV_ALIASES, type NavItem, type NavSection } from "./config"

export function buildNav(): NavSection[] {
  const seen = new Set<Route>()
  const result: NavSection[] = []
  for (const section of NAV_SECTIONS_BASE) {
    const items: NavItem[] = []
    for (const item of section.items) {
      if (!item.href || item.href === "#") continue
      if (seen.has(item.href)) continue
      seen.add(item.href)
      items.push({ ...item, label: NAV_ALIASES[item.href] ?? item.label })
    }
    if (items.length) result.push({ ...section, items })
  }
  return result
}

export function findSectionByPath(sections: NavSection[], pathname: string): string | null {
  for (const s of sections) {
    if (s.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"))) return s.id
  }
  return null
}

export function isActive(pathname: string, href: Route): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}
