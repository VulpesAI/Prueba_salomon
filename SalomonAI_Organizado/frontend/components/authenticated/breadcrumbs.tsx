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
  variant?: "default" | "inverted"
}

type Crumb = {
  label: string
  href?: string
  isCurrent?: boolean
}

export function Breadcrumbs({
  navigation = postLoginNavigation,
  variant = "default",
}: BreadcrumbProps) {
  const pathname = usePathname() ?? ""
  const match = findBestMatch(navigation, pathname)

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
    const defaultGroupItem = match.group.items[0]
    const groupHref = defaultGroupItem?.href ?? "/dashboard/overview"

    if (defaultGroupItem && defaultGroupItem.href !== "/dashboard/overview") {
      crumbs.push({ label: match.group.title, href: groupHref })
    }

    crumbs.push({ label: match.item.title, href: match.item.href, isCurrent: true })
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
                    <Link className={linkClassName} href={crumb.href}>
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
