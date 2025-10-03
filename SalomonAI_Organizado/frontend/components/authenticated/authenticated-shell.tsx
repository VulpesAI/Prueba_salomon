"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/context/AuthContext"
import { postLoginNavigation } from "@/src/config/post-login-navigation"
import { Menu } from "lucide-react"

import { Breadcrumbs } from "./breadcrumbs"
import { NavigationGroup } from "./navigation-group"
import { SidebarNav } from "./sidebar-nav"
import { TopbarActions } from "./topbar-actions"

const LoadingShell = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <div className="flex flex-1">
      <aside className="hidden w-72 border-r bg-muted/20 p-6 lg:block">
        <Skeleton className="h-6 w-32" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        <div className="h-16 border-b px-6">
          <div className="flex h-full items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex-1 space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    </div>
  </div>
)

export function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname() ?? ""

  if (!user) {
    return <LoadingShell />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav navigation={postLoginNavigation} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Abrir navegación"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center px-6 text-lg font-semibold">
                      SalomonAI
                    </div>
                    <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-8">
                      {postLoginNavigation.map((group) => (
                        <NavigationGroup
                          key={`mobile-${group.title}`}
                          group={group}
                          pathname={pathname}
                        />
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="hidden flex-col md:flex">
                <span className="text-sm font-semibold text-muted-foreground">
                  Espacio financiero
                </span>
                <Breadcrumbs navigation={postLoginNavigation} />
              </div>
            </div>
            <TopbarActions user={user} onLogout={logout} />
          </div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-6">
          <div className="pb-6 pt-2 md:hidden">
            <Breadcrumbs navigation={postLoginNavigation} />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
