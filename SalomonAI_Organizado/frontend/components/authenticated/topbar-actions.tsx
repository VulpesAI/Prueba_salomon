"use client"

import * as React from "react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { postLoginNavigation } from "@/src/config/post-login-navigation"
import { flattenNavigation } from "./navigation-utils"
import { Bell, LogOut, Search } from "lucide-react"

type TopbarActionsProps = {
  user: AuthUser
  onLogout?: () => Promise<void> | void
}

const quickActions = flattenNavigation(postLoginNavigation)
  .filter(({ item }) => item.quickAction)
  .map(({ item }) => item)
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
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Buscar en tu espacio financiero"
          className="w-64"
          aria-label="Buscar"
        />
      </div>
      <div className="hidden items-center gap-2 lg:flex">
        {quickActions.map((action) => (
          <Button key={action.href} variant="ghost" size="sm" asChild>
            <Link href={action.href} className="flex items-center gap-2">
              <action.icon className="h-4 w-4" />
              <span>{action.title}</span>
            </Link>
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="icon" aria-label="Notificaciones">
        <Bell className="h-5 w-5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Avatar className="h-8 w-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col text-left leading-tight sm:flex">
              <span className="text-sm font-medium">{user.name}</span>
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
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              void handleLogout()
            }}
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
