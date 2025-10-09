"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Separator } from "@/components/ui/separator"
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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto"
        >
          <Card
            role="dialog"
            aria-modal="true"
            aria-label="Asistente financiero"
            className="glass-panel fixed bottom-28 right-6 z-50 w-[min(360px,calc(100vw-2rem))] border-app-border-subtle"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Asistente SalomónAI</CardTitle>
                <p className="text-sm text-app-dim">
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
            </CardHeader>
            <Separator className="bg-app-border-subtle" />
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="rounded-2xl border border-app-border-subtle bg-app-surface-subtle p-3 text-sm text-app-dim">
                  👋 Hola, soy tu asistente financiero. ¿En qué puedo ayudarte hoy?
                </div>
              </div>
              <form className="space-y-3">
                <label className="text-sm font-medium text-app-dim" htmlFor="assistant-message">
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
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
