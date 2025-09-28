"use client"

import * as React from "react"
import { toast as showToast } from "sonner"

type ToastVariant = "default" | "destructive"

interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  open?: boolean
  action?: React.ReactNode
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  action?: React.ReactNode
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastData[]>([])

  const toast = React.useCallback(
    ({ title = "", description, variant, action, duration = 5000, ...props }: ToastOptions) => {
      const id = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9)

      const toastData: ToastData = {
        id,
        title,
        description,
        variant,
        action,
        open: true,
        ...props,
      }

      setToasts((prev) => [...prev, toastData])

      const sonnerId = showToast(title, {
        description,
        action,
        ...(variant === "destructive" && {
          style: { background: "hsl(0 100% 97%)", color: "hsl(0 100% 40%)" },
        }),
        duration,
        ...props,
      })

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)

      return () => {
        clearTimeout(timer)
        showToast.dismiss(sonnerId)
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }
    },
    []
  )

  const dismiss = React.useCallback((toastId?: string) => {
    if (toastId) {
      setToasts((prev) => prev.filter((t) => t.id !== toastId))
    } else {
      setToasts([])
    }
    showToast.dismiss(toastId)
  }, [])

  return { toast, toasts, dismiss }
}

export const toast = showToast
