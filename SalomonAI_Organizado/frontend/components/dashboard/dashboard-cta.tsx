"use client"

import Link from "next/link"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Icon, type IconName } from "@/components/ui/icon"

interface DashboardCtaProps {
  variant?: "connect" | "upload"
}

const CTA_COPY: Record<
  NonNullable<DashboardCtaProps["variant"]>,
  { title: string; description: string; action: string; icon: IconName }
> = {
  connect: {
    title: "Conecta tu banco",
    description: "Sincroniza tus cuentas para mantener el flujo actualizado automáticamente.",
    action: "Conectar banco",
    icon: "Link",
  },
  upload: {
    title: "Sube tu cartola",
    description: "Carga el archivo de tu banco para proyectar el próximo mes en segundos.",
    action: "Subir cartola",
    icon: "CloudUpload",
  },
}

export function DashboardCta({ variant = "connect" }: DashboardCtaProps) {
  const copy = CTA_COPY[variant]

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.4 }}>
      <Card className="overflow-hidden border-none bg-transparent">
        <CardContent className="relative overflow-hidden rounded-2xl border border-app-border bg-app-surface">
          <div className="absolute inset-0 -z-[1] rounded-2xl bg-app-accent/10" aria-hidden />
          <div className="flex flex-col gap-4 rounded-2xl bg-app-accent/90 p-6 text-app-accent-contrast md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-app-accent-contrast/15 px-3 py-1 text-sm font-medium text-app-accent-contrast">
                <Icon name={copy.icon} aria-hidden size="sm" />
                Acción recomendada
              </span>
              <h2 className="h3 text-app-accent-contrast md:text-2xl">{copy.title}</h2>
              <p className="max-w-xl text-sm text-app-accent-contrast/80 md:text-base">{copy.description}</p>
            </div>
            <Button asChild size="lg" className="rounded-full bg-app-accent-contrast text-app-accent hover:bg-app-accent-contrast/90">
              <Link href="/configuracion">
                {copy.action}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
