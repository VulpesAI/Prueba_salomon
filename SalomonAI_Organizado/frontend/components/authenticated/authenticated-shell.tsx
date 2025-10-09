"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/context/AuthContext"
import { Menu } from "lucide-react"

import { Breadcrumbs } from "./breadcrumbs"
import Sidebar from "@/components/nav/Sidebar"
import { TopbarActions } from "./topbar-actions"
import { HeaderResumen } from "../HeaderResumen"

const LoadingShell = () => (
  <div className="flex min-h-screen flex-col bg-app-bg text-app">
    <header className="border-b border-app-border bg-app-surface px-4 md:px-6">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="hidden flex-col gap-2 md:flex">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </header>
    <main className="flex-1 space-y-6 px-4 py-8 md:px-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
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

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [isLoading, router, user])

  if (isLoading || !user) {
    return <LoadingShell />
  }

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-app">
      <header className="sticky top-0 z-30 border-b border-app-border bg-app-surface">
        <div className="flex h-16 items-center justify-between px-4 text-app md:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir navegación"
                  className="group text-app hover:bg-app-surface-subtle focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_45%,transparent)]"
                >
                  <Menu className="h-5 w-5 transition-colors group-hover:text-primary-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 border-app-border bg-app-bg p-0 text-app"
              >
                <Sidebar />
              </SheetContent>
            </Sheet>
            <div className="hidden flex-col text-app-dim md:flex">
              <span className="text-sm font-semibold text-app-dim">
                Espacio financiero
              </span>
              <Breadcrumbs variant="inverted" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-app">
            <div className="hidden md:block">
              <HeaderResumen />
            </div>
            <TopbarActions user={user} onLogout={logout} />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 md:px-6">
        <div className="pb-6 pt-2 md:hidden">
          <Breadcrumbs />
        </div>
        <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
      </main>
    </div>
  )
}
