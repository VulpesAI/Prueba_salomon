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
import { postLoginNavigation } from "@/src/config/post-login-navigation"

import { findBestMatch } from "./navigation-utils"

type BreadcrumbProps = {
  navigation?: typeof postLoginNavigation
}

type Crumb = {
  label: string
  href?: string
  isCurrent?: boolean
}

export function Breadcrumbs({
  navigation = postLoginNavigation,
}: BreadcrumbProps) {
  const pathname = usePathname() ?? ""
  const match = findBestMatch(navigation, pathname)

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
    const defaultGroupItem = match.group.items[0]
    const groupHref = defaultGroupItem?.href ?? "/dashboard/overview"

    if (defaultGroupItem && defaultGroupItem.href !== "/dashboard/overview") {
      crumbs.push({ label: match.group.title, href: groupHref })
    }

    crumbs.push({ label: match.item.title, href: match.item.href, isCurrent: true })
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1

          return (
            <React.Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {crumb.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : isLast || crumb.isCurrent ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <span className="text-muted-foreground">{crumb.label}</span>
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
