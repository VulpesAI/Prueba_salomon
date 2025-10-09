"use client"

import { useState } from "react"
import { motion } from "framer-motion"

import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

import { ChatPanel } from "./chat-panel"

export function ChatFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.button
        type="button"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-app-accent text-app-accent-contrast elevation-3 transition-shadow",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:color-mix(in_srgb,var(--accent)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
        )}
      >
        <Icon name={open ? "X" : "MessageSquare"} size="md" />
      </motion.button>
      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
