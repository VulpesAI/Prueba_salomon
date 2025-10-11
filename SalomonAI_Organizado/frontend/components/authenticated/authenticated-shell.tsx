"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/AuthContext"

import Sidebar from "@/components/nav/Sidebar"
import { TopbarActions } from "./topbar-actions"
import { HeaderResumen } from "../HeaderResumen"
import { AppHeader } from "@/components/navigation/AppHeader"
import { SidebarDrawer } from "@/components/navigation/SidebarDrawer"
import { NavigationRail } from "@/components/navigation/NavigationRail"
import { Breadcrumbs } from "./breadcrumbs"

const LoadingShell = () => (
  <div className="flex min-h-screen flex-col bg-app-bg text-app">
    <header className="border-b border-app-border bg-app-surface/95 px-4 md:px-6">
      <div className="safe-pt safe-pb flex items-center justify-between gap-4">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-6 w-48" />
        </div>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
    </header>
    <main className="flex-1 space-y-6 px-4 py-8 md:px-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </main>
  </div>
)

export function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const navigationId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [isLoading, router, user])

  React.useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  if (isLoading || !user) {
    return <LoadingShell />
  }

  return (
    <div className="flex min-h-dvh bg-app-bg text-app">
      <SidebarDrawer
        id={navigationId}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        triggerRef={triggerRef}
      >
        <Sidebar />
      </SidebarDrawer>
      <NavigationRail />
      <aside className="hidden h-dvh w-[312px] flex-none border-r border-app-border-subtle bg-app-surface/70 px-4 py-6 lg:flex">
        <div className="flex h-full w-full flex-col overflow-hidden">
          <div className="px-2 text-xs font-semibold uppercase tracking-wide text-app-dim">
            Navegación
          </div>
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <Sidebar />
          </div>
        </div>
      </aside>
      <div className="flex min-h-dvh flex-1 flex-col">
        <AppHeader
          navigationOpen={isSidebarOpen}
          onNavigationToggle={() => setIsSidebarOpen((open) => !open)}
          navigationId={navigationId}
          triggerRef={triggerRef}
          actions={
            <>
              <div className="hidden xl:block">
                <HeaderResumen />
              </div>
              <TopbarActions user={user} onLogout={logout} />
            </>
          }
        />
        <main className="flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8 safe-pb">
          <div className="pb-4 lg:hidden">
            <Breadcrumbs />
          </div>
          <div className="mx-auto flex w-full max-w-6xl flex-col section-gap">{children}</div>
        </main>
      </div>
    </div>
  )
}
