import type {
  NavigationGroup,
  NavigationItem,
} from "@/src/config/post-login-navigation"

export type NavigationMatch = {
  group: NavigationGroup
  item: NavigationItem
  score: number
}

const normalize = (value: string) => {
  if (value.length > 1 && value.endsWith("/")) {
    return value.slice(0, -1)
  }
  return value
}

const sanitizeDynamicSegments = (href: string) =>
  href.replace(/\[[^/]+\]/g, "")

export const getMatchScore = (pathname: string, item: NavigationItem): number => {
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

export const findBestMatch = (
  navigation: NavigationGroup[],
  pathname: string
): NavigationMatch | null => {
  let bestMatch: NavigationMatch | null = null

  for (const group of navigation) {
    for (const item of group.items) {
      const score = getMatchScore(pathname, item)
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { group, item, score }
      }
    }
  }

  return bestMatch
}

export const flattenNavigation = (navigation: NavigationGroup[]) =>
  navigation.flatMap((group) => group.items.map((item) => ({ group, item })))
