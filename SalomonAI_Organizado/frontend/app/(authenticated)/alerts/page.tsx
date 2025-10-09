"use client"

import Link from "next/link"
import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import { esCL } from "@/i18n/es-CL"
import { useDemoFinancialData } from "@/context/DemoFinancialDataContext"
import { formatDate, formatRelativeDate } from "@/lib/intl"

type Severity = "critical" | "high" | "medium" | "low"

const severityStyles: Record<Severity, { label: string; className: string }> = {
  critical: {
    label: esCL.alerts.severities.critical,
    className:
      "border-[color:color-mix(in_srgb,var(--danger)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_16%,transparent)] text-app-danger",
  },
  high: {
    label: esCL.alerts.severities.high,
    className:
      "border-[color:color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_16%,transparent)] text-app-warning",
  },
  medium: {
    label: esCL.alerts.severities.medium,
    className:
      "border-[color:color-mix(in_srgb,#06B6D4_45%,transparent)] bg-[color:color-mix(in_srgb,#06B6D4_14%,transparent)] text-[#06B6D4]",
  },
  low: {
    label: esCL.alerts.severities.low,
    className:
      "border-[color:color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--success)_14%,transparent)] text-app-success",
  },
}

type PersonalAlert = {
  id: string
  title: string
  helper: string
  severity: Severity
  forecastDate: string
  dueLabel: string
  progress: number
  primaryCta: string
  secondaryCta: string
}

export default function AlertsPage() {
  const { intelligence } = useDemoFinancialData()
  const templates = esCL.alerts.items

  const personalAlerts = useMemo<PersonalAlert[]>(() => {
    const predictiveAlerts = intelligence?.predictiveAlerts ?? []
    const fallbackProgress = [80, 55, 35]

    return templates.map((template, index) => {
      const source = predictiveAlerts[index] ?? predictiveAlerts[predictiveAlerts.length - 1]
      const defaultSeverity: Severity = index === 0 ? "high" : index === 1 ? "medium" : "low"
      const severity = (source?.severity as Severity | undefined) ?? defaultSeverity
      const forecastDate = source?.forecastDate ?? new Date(Date.now() + (index + 1) * 3 * 86_400_000).toISOString()

      return {
        id: source?.id ?? template.id,
        title: template.title,
        helper: template.helper,
        severity,
        forecastDate,
        dueLabel: `${formatRelativeDate(forecastDate)} · ${formatDate(forecastDate, {
          day: "2-digit",
          month: "short",
        })}`,
        progress: fallbackProgress[index] ?? 40,
        primaryCta: template.primaryCta,
        secondaryCta: template.secondaryCta,
      }
    })
  }, [intelligence?.predictiveAlerts, templates])

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {esCL.alerts.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {esCL.alerts.description}
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{esCL.alerts.list.title}</CardTitle>
              <CardDescription>{esCL.alerts.list.description}</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/notifications">{esCL.alerts.list.historyButton}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {personalAlerts.map((alert) => {
                const severity = severityStyles[alert.severity]

                return (
                  <div
                    key={alert.id}
                    className="rounded-lg border border-border/60 bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={`border ${severity.className}`}
                            variant="outline"
                          >
                            {severity.label}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            {alert.id}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold leading-tight">
                          {alert.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {alert.helper}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-3 text-sm lg:items-end">
                        <div className="text-right">
                          <p className="font-medium text-muted-foreground">
                            {alert.dueLabel}
                          </p>
                        </div>
                        <div className="w-40">
                          <Progress value={alert.progress} className="w-full" aria-hidden />
                          <span className="sr-only" aria-live="polite">
                            {`Avance estimado ${alert.progress}%`}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 lg:flex-row">
                          <Button
                            size="sm"
                            variant={alert.severity === "critical" || alert.severity === "high" ? "default" : "outline"}
                          >
                            {alert.primaryCta}
                          </Button>
                          <Button size="sm" variant="ghost" className="px-0 text-muted-foreground">
                            {alert.secondaryCta}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{esCL.alerts.response.title}</CardTitle>
            <CardDescription>{esCL.alerts.response.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-6 border-l border-dashed border-border pl-6">
              {esCL.alerts.response.steps.map((step, index) => (
                <li key={step.title} className="space-y-2">
                  <span className="absolute -left-[9px] mt-2 h-4 w-4 rounded-full border border-border bg-background" />
                  <p className="text-sm text-muted-foreground">
                    Paso {index + 1}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold leading-tight">
                      {step.title}
                    </h3>
                    <Badge variant="secondary">{step.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>{esCL.alerts.support.title}</CardTitle>
            <CardDescription>{esCL.alerts.support.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {esCL.alerts.support.items.map((resource) => (
              <div
                key={resource.title}
                className="rounded-lg border border-border/60 bg-muted/30 p-4"
              >
                <h3 className="text-base font-semibold">{resource.title}</h3>
                <p className="text-sm text-muted-foreground">{resource.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
