"use client"

import { AlertTriangle, RefreshCcw } from "lucide-react"

import { cn } from "@/lib/utils"

import { Alert, AlertDescription, AlertTitle } from "./alert"
import { Button } from "./button"

type ErrorBannerProps = {
  error: unknown
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

const getErrorMessage = (error: unknown) => {
  if (!error) {
    return "Ocurrió un error inesperado."
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  if (typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message
    return typeof value === "string" ? value : "Ocurrió un error inesperado."
  }

  return "Ocurrió un error inesperado."
}

export function ErrorBanner({
  error,
  title = "No pudimos cargar la información",
  description,
  onRetry,
  retryLabel = "Reintentar",
  className,
}: ErrorBannerProps) {
  const message = description ?? getErrorMessage(error)

  return (
    <Alert
      variant="destructive"
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5" aria-hidden />
        <div className="space-y-1">
          <AlertTitle className="font-semibold">{title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
      </div>
      {onRetry ? (
        <Button variant="destructive" onClick={onRetry} className="gap-2 self-start">
          <RefreshCcw className="h-4 w-4" aria-hidden />
          {retryLabel}
        </Button>
      ) : null}
    </Alert>
  )
}
