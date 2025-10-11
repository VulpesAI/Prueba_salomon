"use client"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react"
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion"

const DRAWER_WIDTH = 312

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[role="button"]:not([aria-disabled="true"])',
  "[tabindex]:not([tabindex='-1'])",
].join(",")

type SidebarDrawerProps = {
  id?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  labelledBy?: string
  triggerRef?:
    | RefObject<HTMLButtonElement>
    | MutableRefObject<HTMLButtonElement | null>
}

export function SidebarDrawer({
  id,
  open,
  onOpenChange,
  children,
  labelledBy,
  triggerRef,
}: SidebarDrawerProps) {
  const internalId = useId()
  const drawerId = id ?? internalId
  const drawerRef = useRef<HTMLElement>(null)
  const lastFocusedElement = useRef<HTMLElement | null>(null)
  const isEdgeDragging = useRef(false)
  const touchStartX = useRef(0)
  const skipAnimation = useRef(false)

  const motionX = useMotionValue(-DRAWER_WIDTH)
  const overlayOpacity = useTransform(motionX, [-DRAWER_WIDTH, 0], [0, 1])

  const [shouldRender, setShouldRender] = useState(open)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
    } else {
      const timeout = window.setTimeout(() => {
        setShouldRender(false)
        motionX.set(-DRAWER_WIDTH)
      }, 220)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [open, motionX])

  useEffect(() => {
    if (!open) {
      const target = triggerRef?.current ?? lastFocusedElement.current
      if (target) {
        const timeout = window.setTimeout(() => {
          target.focus({ preventScroll: true })
        }, 200)
        return () => window.clearTimeout(timeout)
      }
      return undefined
    }

    const previousActive = document.activeElement
    if (previousActive instanceof HTMLElement) {
      lastFocusedElement.current = previousActive
    }

    const drawerElement = drawerRef.current
    if (drawerElement) {
      const focusable = drawerElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      const first = focusable[0] ?? drawerElement
      window.requestAnimationFrame(() => {
        first.focus({ preventScroll: true })
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onOpenChange(false)
        return
      }

      if (event.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        if (!focusable.length) {
          event.preventDefault()
          drawerRef.current.focus({ preventScroll: true })
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const activeElement = document.activeElement as HTMLElement | null

        if (event.shiftKey) {
          if (activeElement === first) {
            event.preventDefault()
            last.focus({ preventScroll: true })
          }
        } else if (activeElement === last) {
          event.preventDefault()
          first.focus({ preventScroll: true })
        }
      }
    }

    const onFocus = (event: FocusEvent) => {
      if (open && drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        const first = focusable[0] ?? drawerRef.current
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("focusin", onFocus)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("focusin", onFocus)
    }
  }, [open, onOpenChange, triggerRef])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      animate(motionX, -DRAWER_WIDTH, {
        duration: 0.18,
        ease: [0.22, 0.61, 0.36, 1],
      })
      return
    }

    if (skipAnimation.current) {
      skipAnimation.current = false
      return
    }

    animate(motionX, 0, {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    })
  }, [open, motionX])

  const handleEdgeTouchEnd = useCallback(() => {
    const current = motionX.get()
    const progress = 1 + current / DRAWER_WIDTH
    const shouldRemainOpen = progress > 0.4
    if (shouldRemainOpen) {
      animate(motionX, 0, {
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1],
      })
    } else {
      animate(motionX, -DRAWER_WIDTH, {
        duration: 0.18,
        ease: [0.22, 0.61, 0.36, 1],
      }).then(() => {
        onOpenChange(false)
      })
    }
  }, [motionX, onOpenChange])

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      if (open || event.touches.length !== 1) return
      const touch = event.touches[0]
      const x = touch?.clientX ?? 0
      if (x > 16) return
      isEdgeDragging.current = true
      touchStartX.current = x
      skipAnimation.current = true
      onOpenChange(true)
      motionX.set(-DRAWER_WIDTH + x)
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!isEdgeDragging.current) return
      const touch = event.touches[0]
      const x = touch?.clientX ?? 0
      const delta = x - touchStartX.current
      const next = Math.min(0, -DRAWER_WIDTH + delta)
      motionX.set(next)
      if (Math.abs(delta) > 4) {
        event.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (!isEdgeDragging.current) return
      isEdgeDragging.current = false
      skipAnimation.current = false
      handleEdgeTouchEnd()
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleEdgeTouchEnd, motionX, onOpenChange, open])

  const dialogTitleId = useMemo(() => labelledBy ?? `${drawerId}-title`, [drawerId, labelledBy])

  const closeDrawer = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <AnimatePresence>
      {shouldRender ? (
        <>
          <motion.div
            key="sidebar-overlay"
            className="fixed inset-0 z-40 bg-[color:color-mix(in_srgb,var(--text)_16%,transparent)] backdrop-blur-[2px] md:hidden"
            style={{ opacity: overlayOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-hidden="true"
            onClick={closeDrawer}
          />
          <motion.aside
            key="sidebar-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            id={drawerId}
            className="glass-panel fixed left-0 top-0 z-50 flex h-dvh w-[min(320px,88vw)] flex-col gap-4 rounded-none p-4 safe-pb focus:outline-none md:hidden"
            style={{ x: motionX }}
            initial={{ x: -DRAWER_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -DRAWER_WIDTH }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            drag={open ? "x" : false}
            dragDirectionLock
            dragElastic={0}
            dragMomentum={false}
            dragConstraints={{ left: -DRAWER_WIDTH, right: 0 }}
            onDragEnd={(event, info) => {
              const current = motionX.get()
              if (info.offset.x < -DRAWER_WIDTH * 0.4 || current < -DRAWER_WIDTH * 0.4) {
                closeDrawer()
              } else {
                animate(motionX, 0, {
                  duration: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                })
              }
            }}
            tabIndex={-1}
          >
            <div className="glass-body safe-pt rounded-xl px-4 pb-4">
              <h2 id={dialogTitleId} className="h3">
                Navegación
              </h2>
            </div>
            <div className="glass-body flex-1 overflow-y-auto rounded-xl px-2 py-3">
              <nav aria-labelledby={dialogTitleId} className="space-y-1">
                {children}
              </nav>
            </div>
            <div className="glass-body rounded-xl p-3">
              <button
                type="button"
                onClick={closeDrawer}
                className="touch-target touch-feedback mt-auto w-full rounded-2xl border border-transparent bg-app-surface-subtle py-3 text-sm font-medium text-foreground hover:border-app-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              >
                Cerrar menú
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}
