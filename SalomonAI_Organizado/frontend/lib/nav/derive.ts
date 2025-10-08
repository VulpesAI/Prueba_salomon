import {
  NAV_ALIASES,
  NAV_SECTIONS_BASE,
  type NavItem,
  type NavSection,
} from "./config"

export function buildNav(): NavSection[] {
  const seen = new Set<string>()
  const result: NavSection[] = []

  for (const section of NAV_SECTIONS_BASE) {
    const items: NavItem[] = []

    for (const item of section.items) {
      if (seen.has(item.href)) {
        continue
      }

      seen.add(item.href)

      const alias = NAV_ALIASES[item.href]
      items.push({
        ...item,
        label: alias ?? item.label,
      })
    }

    if (items.length > 0) {
      result.push({
        ...section,
        items,
      })
    }
  }

  return result
}

export function flattenNav(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items)
}

export function findSectionByPath(
  sections: NavSection[],
  pathname: string
): string | null {
  for (const section of sections) {
    if (section.items.some((item) => isNavItemActive(pathname, item))) {
      return section.id
    }
  }

  return null
}

export function isActive(pathname: string, href: string): boolean {
  const normalizedPath = normalize(pathname)
  const normalizedHref = normalize(href)

  if (normalizedHref.length === 0) {
    return false
  }

  if (normalizedPath === normalizedHref) {
    return true
  }

  return normalizedPath.startsWith(`${normalizedHref}/`)
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  return getMatchScore(pathname, item) > 0
}

export type NavMatch = {
  section: NavSection
  item: NavItem
  score: number
}

export function findBestMatch(
  sections: NavSection[],
  pathname: string
): NavMatch | null {
  let bestMatch: NavMatch | null = null

  for (const section of sections) {
    for (const item of section.items) {
      const score = getMatchScore(pathname, item)

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { section, item, score }
      }
    }
  }

  return bestMatch
}

function getMatchScore(pathname: string, item: NavItem): number {
  const normalizedPath = normalize(pathname)
  const normalizedHref = normalize(sanitizeDynamicSegments(item.href))

  if (normalizedHref.length === 0) {
    return 0
  }

  if (item.exact) {
    return normalizedPath === normalizedHref ? normalizedHref.length : 0
  }

  if (normalizedPath === normalizedHref) {
    return normalizedHref.length
  }

  const hrefWithSlash = `${normalizedHref}/`
  if (normalizedPath.startsWith(hrefWithSlash)) {
    return hrefWithSlash.length
  }

  return 0
}

const TRAILING_SLASH_REGEX = /\/$/

function normalize(value: string): string {
  if (value.length > 1 && TRAILING_SLASH_REGEX.test(value)) {
    return value.slice(0, -1)
  }

  return value
}

const DYNAMIC_SEGMENT_REGEX = /\[[^/]+\]/g

function sanitizeDynamicSegments(href: string): string {
  return href.replace(DYNAMIC_SEGMENT_REGEX, "")
}
