"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Textarea } from "@/components/ui/textarea"

interface ChatPanelProps {
  open: boolean
  onClose: () => void
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKey)
    }

    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="Asistente financiero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="glass-panel pointer-events-auto fixed bottom-28 right-6 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3 p-3 md:p-4"
        >
          <header className="glass-body rounded-lg p-3 md:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="h3">Asistente SalomónAI</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pregunta sobre tus finanzas, pagos o proyecciones.
                </p>
              </div>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cerrar panel del asistente"
                onClick={onClose}
                className="rounded-full"
              >
                <Icon name="X" size="sm" />
              </Button>
            </div>
          </header>
          <div className="glass-body max-h-[50vh] flex-1 overflow-y-auto rounded-lg p-3 md:p-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-app-border-subtle bg-app-surface-subtle p-3 text-foreground">
                👋 Hola, soy tu asistente financiero. ¿En qué puedo ayudarte hoy?
              </div>
            </div>
          </div>
          <footer className="glass-body rounded-lg p-3 md:p-4">
            <form className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="assistant-message">
                Escribe tu mensaje
              </label>
              <Textarea
                id="assistant-message"
                name="assistant-message"
                rows={3}
                placeholder="Ej. ¿Cómo se ve mi flujo para el próximo mes?"
                className="resize-none border-app-border-subtle bg-app-card-subtle"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-full">
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-full">
                  Enviar
                </Button>
              </div>
            </form>
          </footer>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
