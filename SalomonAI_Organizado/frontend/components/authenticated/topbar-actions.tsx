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
import { buildNav, flattenNav } from "@/lib/nav/derive"
import { Bell, LogOut, Search } from "lucide-react"

type TopbarActionsProps = {
  user: AuthUser
  onLogout?: () => Promise<void> | void
}

const QUICK_ACTIONS = flattenNav(buildNav())
  .filter((item) => item.quickAction)
  .slice(0, 3)

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
    <div className="flex items-center gap-3 text-textPrimary">
      <div className="hidden items-center gap-2 md:flex">
        <Search className="h-4 w-4 text-iconSecondary" aria-hidden />
        <Input
          placeholder="Buscar en tu espacio financiero"
          className="w-64 border-border/60 bg-panel-subtle text-textPrimary placeholder:text-textSecondary focus-visible:ring-primary-to"
          aria-label="Buscar"
        />
      </div>
      <div className="hidden items-center gap-2 lg:flex">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.href}
            variant="ghost"
            size="sm"
            className="group text-textPrimary hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
            asChild
          >
            <Link href={action.href} className="flex items-center gap-2">
              {action.icon ? (
                <action.icon className="h-4 w-4 text-iconPrimary transition-colors group-hover:text-primary-foreground" />
              ) : null}
              <span>{action.label}</span>
            </Link>
          </Button>
        ))}
      </div>
      {IS_DEMO_MODE ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-textPrimary hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
          onClick={handleReloadDemoData}
        >
          Cargar datos de ejemplo
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="group text-textPrimary hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
        asChild
      >
        <Link
          href="/notifications"
          aria-label="Notificaciones"
          className="flex items-center justify-center"
        >
          <Bell className="h-5 w-5 text-iconPrimary transition-colors group-hover:text-primary-foreground" />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group gap-2 text-textPrimary hover:bg-gradient-primary hover:text-primary-foreground focus-visible:ring-primary-to"
          >
            <Avatar className="h-8 w-8 border border-border/60 bg-panel-subtle text-textPrimary">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-panel-subtle text-textPrimary">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col text-left leading-tight sm:flex">
              <span className="text-sm font-medium text-textPrimary group-hover:text-primary-foreground">
                {user.name}
              </span>
              {user.email ? (
                <span className="text-xs text-textSecondary">{user.email}</span>
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
