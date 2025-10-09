"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import type { NavItem, NavSection } from "@/lib/nav/config"
import { buildNav, findSectionByPath, isActive } from "@/lib/nav/derive"

type BreadcrumbProps = {
  sections?: NavSection[]
  variant?: "default" | "inverted"
}

type Crumb = {
  label: string
  href?: string
  isCurrent?: boolean
}

export function Breadcrumbs({ sections, variant = "default" }: BreadcrumbProps) {
  const pathname = usePathname() ?? ""
  const navigation = React.useMemo(
    () => sections ?? buildNav(),
    [sections]
  )
  const currentSectionId = findSectionByPath(navigation, pathname)
  const match = React.useMemo(() => {
    let best: { section: NavSection; item: NavItem } | null = null
    for (const section of navigation) {
      for (const item of section.items) {
        if (isActive(pathname, item.href)) {
          if (!best || item.href.length > best.item.href.length) {
            best = { section, item }
          }
        }
      }
    }
    if (best) return best
    if (currentSectionId) {
      const section = navigation.find((s) => s.id === currentSectionId)
      const item = section?.items[0]
      if (section && item) return { section, item }
    }
    return null
  }, [currentSectionId, navigation, pathname])

  const isInverted = variant === "inverted"
  const listClassName = isInverted
    ? "text-secondary-foreground [&>li>a]:text-secondary-foreground [&>li>a:hover]:text-secondary-foreground [&>li>span]:text-secondary-foreground"
    : undefined

  const crumbs: Crumb[] = [
    {
      label: "Inicio",
      href: "/dashboard/overview",
      isCurrent:
        pathname === "/dashboard/overview" &&
        (!match || match.item.href === "/dashboard/overview"),
    },
  ]

  if (match) {
    const defaultSectionItem = match.section.items[0]
    const sectionHref = defaultSectionItem?.href ?? "/dashboard/overview"

    if (defaultSectionItem && defaultSectionItem.href !== "/dashboard/overview") {
      crumbs.push({ label: match.section.label, href: sectionHref })
    }

    crumbs.push({ label: match.item.label, href: match.item.href, isCurrent: true })
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className={listClassName}>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          const linkClassName = isInverted
            ? "text-secondary-foreground hover:text-secondary-foreground"
            : undefined
          const pageClassName = isInverted
            ? "text-secondary-foreground"
            : undefined

          return (
            <React.Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {crumb.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link
                      className={linkClassName}
                      href={{ pathname: crumb.href }}
                    >
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : isLast || crumb.isCurrent ? (
                  <BreadcrumbPage className={pageClassName}>
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <span
                    className={
                      isInverted ? "text-secondary-foreground" : "text-muted-foreground"
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
