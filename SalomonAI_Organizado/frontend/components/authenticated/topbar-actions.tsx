"use client"

import * as React from "react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  IS_DEMO_MODE,
  useDemoFinancialData,
} from "@/context/DemoFinancialDataContext"
import { CHILE_DEMO_STATEMENT } from "@/context/demo-statement.fixture"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { AuthUser } from "@/context/AuthContext"
import { Bell, LogOut, Search } from "lucide-react"

type TopbarActionsProps = {
  user: AuthUser
  onLogout?: () => Promise<void> | void
}

const getInitials = (user: AuthUser) => {
  if (user.name) {
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  if (user.email) {
    return user.email.slice(0, 2).toUpperCase()
  }

  return "SA"
}

export function TopbarActions({ user, onLogout }: TopbarActionsProps) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const { reset, updateFromStatement } = useDemoFinancialData()

  const handleReloadDemoData = React.useCallback(() => {
    if (!IS_DEMO_MODE) return

    reset()
    updateFromStatement(CHILE_DEMO_STATEMENT)
  }, [reset, updateFromStatement])

  const handleLogout = React.useCallback(async () => {
    if (!onLogout) return
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch (error) {
      console.error("Failed to logout", error)
    } finally {
      setIsLoggingOut(false)
    }
  }, [onLogout])

  return (
    <div className="flex items-center gap-3 text-foreground">
      <div className="hidden items-center gap-2 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Buscar en tu espacio financiero"
          className="w-64 border-border/60 bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-to"
          aria-label="Buscar"
        />
      </div>
      {IS_DEMO_MODE ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
          onClick={handleReloadDemoData}
        >
          Cargar datos de ejemplo
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="group text-foreground hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
        asChild
      >
        <Link
          href="/notifications"
          aria-label="Notificaciones"
          className="flex items-center justify-center"
        >
          <Bell className="h-5 w-5 transition-colors group-hover:text-primary-foreground" />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group gap-2 text-foreground hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
          >
            <Avatar className="h-8 w-8 border border-border/60 bg-card text-foreground">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-card text-foreground">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col text-left leading-tight sm:flex">
              <span className="text-sm font-medium text-foreground group-hover:text-primary-foreground">
                {user.name}
              </span>
              {user.email ? (
                <span className="text-xs text-muted-foreground">{user.email}</span>
              ) : null}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">Configuración</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings/security">Seguridad</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="focus:bg-transparent">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full justify-start text-primary-foreground"
              onClick={() => {
                void handleLogout()
              }}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
