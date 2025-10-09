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
  <div className="flex min-h-screen flex-col bg-background">
    <header className="border-b border-border bg-panel px-4 text-textPrimary md:px-6">
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-panel text-textPrimary">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir navegación"
                  className="group text-textPrimary hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
                >
                  <Menu className="h-5 w-5 text-iconPrimary transition-colors group-hover:text-primary-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 border-border bg-background p-0 text-textPrimary"
              >
                <Sidebar className="h-full border-0" />
              </SheetContent>
            </Sheet>
            <div className="hidden flex-col text-textSecondary md:flex">
              <span className="text-sm font-semibold text-textSecondary">
                Espacio financiero
              </span>
              <Breadcrumbs variant="inverted" />
            </div>
            </div>
          <div className="flex items-center gap-4">
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
