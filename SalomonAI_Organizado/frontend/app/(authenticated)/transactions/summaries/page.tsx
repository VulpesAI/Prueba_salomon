"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, BarChart3, CalendarRange, FileDown, PieChart } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/AuthContext"
import { useDashboardSummary } from "@/hooks/dashboard/use-dashboard-summary"
import { formatCurrency } from "@/lib/intl"

type PeriodOption = {
  value: string
  label: string
  startDate?: string
  endDate?: string
}

type AccountOption = {
  value: string
  label: string
}

const ALL_PERIODS_VALUE = "__all__"
const ALL_ACCOUNTS_VALUE = "__all_accounts__"

const createCapitalizedLabel = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value

const parseTimelinePeriod = (period: string) => {
  if (!period) {
    return null
  }

  const direct = new Date(period)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  const fallback = new Date(`${period}-01`)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback
  }

  return null
}

const createPeriodOption = (
  period: string,
  granularity: "day" | "week" | "month" | undefined,
): PeriodOption => {
  if (!granularity) {
    return { value: period, label: period }
  }

  const parsed = parseTimelinePeriod(period)
  if (!parsed) {
    return { value: period, label: period }
  }

  if (granularity === "month") {
    const startDate = new Date(parsed)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1, 0)
    endDate.setHours(23, 59, 59, 999)

    const label = new Intl.DateTimeFormat("es-CL", {
      month: "long",
      year: "numeric",
    }).format(startDate)

    return {
      value: period,
      label: createCapitalizedLabel(label),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }

  if (granularity === "week") {
    const startDate = new Date(parsed)
    const day = startDate.getDay()
    const daysSinceMonday = (day + 6) % 7
    startDate.setDate(startDate.getDate() - daysSinceMonday)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    endDate.setHours(23, 59, 59, 999)

    const formatter = new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "short",
    })

    return {
      value: period,
      label: `Semana del ${formatter.format(startDate)} al ${formatter.format(endDate)}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }

  const startDate = new Date(parsed)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(startDate)
  endDate.setHours(23, 59, 59, 999)

  const label = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(startDate)

  return {
    value: period,
    label,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}

export default function TransactionsSummariesPage() {
  const [granularity, setGranularity] = useState<"day" | "week" | "month" | undefined>(undefined)
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([
    { value: ALL_PERIODS_VALUE, label: "Todos los periodos" },
  ])
  const [selectedPeriod, setSelectedPeriod] = useState<string>(ALL_PERIODS_VALUE)
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([
    { value: ALL_ACCOUNTS_VALUE, label: "Todas tus cuentas" },
  ])
  const [account, setAccount] = useState<string>(ALL_ACCOUNTS_VALUE)
  const [benchmark, setBenchmark] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 4

  const selectedPeriodOption = useMemo(() => {
    return (
      periodOptions.find((option) => option.value === selectedPeriod) ?? periodOptions[0]
    )
  }, [periodOptions, selectedPeriod])

  const { user } = useAuth()
  const { summary, isLoading, error, refresh } = useDashboardSummary({
    userId: user?.id ?? null,
    accountId: account === ALL_ACCOUNTS_VALUE ? undefined : account,
    startDate:
      selectedPeriodOption?.value === ALL_PERIODS_VALUE
        ? undefined
        : selectedPeriodOption?.startDate,
    endDate:
      selectedPeriodOption?.value === ALL_PERIODS_VALUE
        ? undefined
        : selectedPeriodOption?.endDate,
    granularity,
  })

  useEffect(() => {
    if (!summary?.granularity || summary.granularity === granularity) {
      return
    }

    setGranularity(summary.granularity)
  }, [granularity, summary?.granularity])

  useEffect(() => {
    if (!summary?.timeline?.length) {
      return
    }

    const timelineOptions = summary.timeline.map((point) =>
      createPeriodOption(point.period, summary.granularity)
    )

    setPeriodOptions([
      { value: ALL_PERIODS_VALUE, label: "Todos los periodos" },
      ...timelineOptions,
    ])
  }, [summary?.granularity, summary?.timeline])

  useEffect(() => {
    if (!summary?.accounts?.length) {
      return
    }

    setAccountOptions((current) => {
      const existing = new Map(current.map((option) => [option.value, option]))

      summary.accounts.forEach((accountSummary) => {
        const value = accountSummary.accountId
        const label =
          accountSummary.name ??
          accountSummary.institution ??
          `Cuenta sin nombre (${accountSummary.accountId})`

        existing.set(value, { value, label })
      })

      const merged = Array.from(existing.values()).filter(
        (option) => option.value !== ALL_ACCOUNTS_VALUE,
      )

      return [
        { value: ALL_ACCOUNTS_VALUE, label: "Todas tus cuentas" },
        ...merged.sort((a, b) => a.label.localeCompare(b.label, "es")),
      ]
    })
  }, [summary?.accounts])

  useEffect(() => {
    if (!periodOptions.some((option) => option.value === selectedPeriod)) {
      setSelectedPeriod(periodOptions[0]?.value ?? ALL_PERIODS_VALUE)
    }
  }, [periodOptions, selectedPeriod])

  useEffect(() => {
    if (!accountOptions.some((option) => option.value === account)) {
      setAccount(ALL_ACCOUNTS_VALUE)
    }
  }, [account, accountOptions])

  const categories = useMemo(
    () => summary?.categories ?? [],
    [summary?.categories]
  )

  const filteredSummaries = useMemo(() => {
    if (!benchmark) {
      return categories
    }

    return categories.filter((summaryCategory) =>
      summaryCategory.category.toLowerCase().includes(benchmark.toLowerCase()),
    )
  }, [benchmark, categories])

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / pageSize))
  const paginatedSummaries = filteredSummaries.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [account, selectedPeriod, categories])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const totalIngresos = summary?.totals.inflow ?? 0
  const totalGastos = summary?.totals.outflow ?? 0
  const ahorroEstimado = summary?.totals.net ?? 0

  const timeline = summary?.timeline ?? []
  const latestPoint = timeline.at(-1)
  const previousPoint = timeline.length > 1 ? timeline.at(-2) : undefined

  const incomeChange =
    latestPoint && previousPoint && previousPoint.inflow !== 0
      ? ((latestPoint.inflow - previousPoint.inflow) / Math.abs(previousPoint.inflow)) * 100
      : null

  const variation =
    latestPoint && previousPoint && previousPoint.net !== 0
      ? ((latestPoint.net - previousPoint.net) / Math.abs(previousPoint.net)) * 100
      : null

  const incomeChangeLabel =
    incomeChange !== null
      ? `${incomeChange > 0 ? "+" : ""}${incomeChange.toFixed(1)}% vs periodo anterior`
      : "Sin datos comparables"

  const variationLabel =
    variation !== null
      ? `${variation > 0 ? "+" : ""}${variation.toFixed(1)}%`
      : "Sin datos comparables"

  const currentPeriodLabel = selectedPeriodOption?.label ?? "Todos los periodos"
  const currentAccountLabel =
    accountOptions.find((option) => option.value === account)?.label ?? "Todas tus cuentas"
  const currencyCode = summary?.totals.currency ?? "CLP"
  const isInitialLoading = isLoading && !summary

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Resumen de transacciones</h1>
          <p className="text-muted-foreground">
            Revisa tus movimientos por categoría, detecta cambios a tiempo y comparte resúmenes con
            quien tú decidas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions">Volver a transacciones</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/classification">Ir a clasificación</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/advanced-search">Búsqueda avanzada</Link>
          </Button>
          <Button className="gap-2">
            <FileDown className="h-4 w-4" /> Exportar tus transacciones (CSV/JSON)
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos del mes</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : summary ? (
                formatCurrency(totalIngresos)
              ) : (
                <span className="text-base font-normal text-muted-foreground">Sin datos</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="gap-1">
              <BarChart3 className="h-3 w-3" /> {incomeChangeLabel}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gastos del mes</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : summary ? (
                formatCurrency(Math.abs(totalGastos))
              ) : (
                <span className="text-base font-normal text-muted-foreground">Sin datos</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Incluye tus consumos diarios y servicios.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ahorro estimado</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : summary ? (
                formatCurrency(ahorroEstimado)
              ) : (
                <span className="text-base font-normal text-muted-foreground">Sin datos</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="gap-2 px-0" asChild>
              <Link href="/transactions/advanced-search">
                Revisa el detalle de tus movimientos <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Variación vs. mes anterior</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : summary ? (
                variation !== null ? (
                  variationLabel
                ) : (
                  <span className="text-base font-normal text-muted-foreground">
                    Sin datos comparables
                  </span>
                )
              ) : (
                <span className="text-base font-normal text-muted-foreground">Sin datos</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="gap-1">
              <PieChart className="h-3 w-3" /> Tu balance mensual cambió respecto al periodo anterior
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <CardTitle>Tu resumen mensual</CardTitle>
              <CardDescription>
                Ajusta los filtros para adaptar el resumen a las fechas y cuentas que prefieras.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={selectedPeriod}
                onValueChange={(value) => {
                  setSelectedPeriod(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-48" aria-label="Seleccionar periodo">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={account}
                onValueChange={(value) => {
                  setAccount(value)
                  setSelectedPeriod(ALL_PERIODS_VALUE)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-48" aria-label="Seleccionar cuenta">
                  <SelectValue placeholder="Tu cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" className="gap-2">
                <CalendarRange className="h-4 w-4" /> Elegir fechas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="benchmark">Comparar con</Label>
              <Input
                id="benchmark"
                placeholder="Ej. tu presupuesto mensual"
                value={benchmark}
                onChange={(event) => {
                  setPage(1)
                  setBenchmark(event.target.value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Opciones para compartir</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  Copiar enlace
                </Button>
                <Button variant="outline" size="sm">
                  Programar envío
                </Button>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">
                  {currentAccountLabel} · {currentPeriodLabel}
                </TableHead>
                <TableHead className="text-right">Tipo</TableHead>
                <TableHead className="text-right">Participación en tu balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInitialLoading
                ? Array.from({ length: pageSize }).map((_, index) => (
                    <TableRow key={`summary-loading-${index}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-5 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-5 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-5 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                : paginatedSummaries.map((summaryCategory) => {
                    const contribution = summaryCategory.percentage
                    const typeLabel = summaryCategory.total >= 0 ? "Ingreso" : "Gasto"

                    return (
                      <TableRow key={summaryCategory.category}>
                        <TableCell className="font-medium">{summaryCategory.category}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(summaryCategory.total)} {currencyCode}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {typeLabel}
                        </TableCell>
                        <TableCell className="text-right">
                          {contribution.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
              {!isInitialLoading && summary && paginatedSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No encontramos categorías que coincidan con lo que buscas.
                  </TableCell>
                </TableRow>
              ) : null}
              {!isInitialLoading && !summary ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No pudimos cargar información de tu resumen.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <Pagination className="justify-between gap-4 md:flex">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.max(1, current - 1))
                  }}
                  className="sm:w-auto"
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                return (
                  <PaginationItem key={`summary-page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(pageNumber)
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.min(totalPages, current + 1))
                  }}
                  className="sm:w-auto"
                />
              </PaginationItem>
            </PaginationContent>
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages} · {filteredSummaries.length} categorías
            </div>
          </Pagination>
        </CardContent>
      </Card>

      <Card className="border border-dashed">
        <CardHeader>
          <CardTitle>Comparte tus reportes</CardTitle>
          <CardDescription>
            Envía resúmenes a quienes elijas y guarda recordatorios personales para tus envíos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {/* TODO: Conectar con tus preferencias reales de contactos y recordatorios */}
            Aquí podrás anotar a tus contactos frecuentes, definir recordatorios y llevar control de
            los envíos que compartas.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-2">
              <FileDown className="h-4 w-4" /> Descargar copia (XLSX)
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/transactions/classification">
                Ajustar reglas relacionadas
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar tu resumen</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}. Intenta nuevamente en unos minutos o actualiza la página.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refresh()
                }}
                disabled={isLoading}
              >
                Reintentar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
