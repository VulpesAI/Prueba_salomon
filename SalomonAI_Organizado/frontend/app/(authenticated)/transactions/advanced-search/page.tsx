"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Download, Loader2, Plus, Save, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiMutation, useApiQuery } from "@/hooks/use-api"
import { useAuth } from "@/context/AuthContext"
import { queryKeys } from "@/config/query-keys"
import {
  createMovementPreset,
  getMovementPresets,
  searchMovements,
  type MovementsSearchParams,
} from "@/services/movements"
import type {
  MovementCondition,
  MovementConditionField,
  MovementConditionOperator,
  MovementPreset,
  MovementPresetsResponse,
  MovementsResponse,
} from "@/types/movements-legacy"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"

import { esCL } from "@/i18n/es-CL"
import { formatCurrency, formatDate } from "@/lib/intl"

const t = esCL.transactions.advancedSearch

type ConditionState = MovementCondition & { id: string }

const FIELD_CONFIG: Array<{
  value: MovementConditionField
  label: string
  operators: MovementConditionOperator[]
  placeholder: string
}> = [
  {
    value: "amount",
    label: "Monto",
    operators: ["gt", "lt", "eq", "between"],
    placeholder: "Ej: 50000 o 10000,50000",
  },
  {
    value: "description",
    label: "Descripción",
    operators: ["contains"],
    placeholder: "Ej: supermercado",
  },
  {
    value: "category",
    label: "Categoría",
    operators: ["contains"],
    placeholder: "Ej: Transporte",
  },
  {
    value: "merchant",
    label: "Comercio",
    operators: ["contains"],
    placeholder: "Ej: Starbucks",
  },
  {
    value: "postedAt",
    label: "Fecha",
    operators: ["between"],
    placeholder: "YYYY-MM-DD, YYYY-MM-DD",
  },
]

const OPERATOR_LABELS: Record<MovementConditionOperator, string> = {
  gt: ">",
  lt: "<",
  eq: "=",
  contains: "contiene",
  between: "entre",
}

const DEFAULT_PAGE_SIZE = 10

const createConditionId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `condition-${Math.random().toString(36).slice(2)}`

const buildSearchFilters = (conditions: ConditionState[]) => {
  const filters: Partial<MovementsSearchParams> = {}

  for (const condition of conditions) {
    const value = condition.value.trim()
    if (!value) {
      continue
    }

    if (condition.field === "amount") {
      if (condition.operator === "between") {
        const [min, max] = value.split(",").map((item) => Number(item.trim()))
        if (!Number.isNaN(min)) {
          filters.minAmount = min
        }
        if (!Number.isNaN(max)) {
          filters.maxAmount = max
        }
        continue
      }

      const numericValue = Number(value)
      if (Number.isNaN(numericValue)) {
        continue
      }

      if (condition.operator === "gt") {
        filters.minAmount = numericValue
      } else if (condition.operator === "lt") {
        filters.maxAmount = numericValue
      } else if (condition.operator === "eq") {
        filters.minAmount = numericValue
        filters.maxAmount = numericValue
      }
      continue
    }

    if (condition.field === "postedAt") {
      const [start, end] = value.split(",").map((item) => item.trim())
      if (start) {
        filters.startDate = start
      }
      if (end) {
        filters.endDate = end
      }
      continue
    }

    if (condition.field === "description") {
      filters.search = value
      continue
    }

    if (condition.field === "category") {
      filters.category = value
      continue
    }

    if (condition.field === "merchant") {
      filters.merchant = value
    }
  }

  return filters
}

export default function TransactionsAdvancedSearchPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [conditions, setConditions] = useState<ConditionState[]>([
    { id: createConditionId(), field: "amount", operator: "gt", value: "5000" },
    { id: createConditionId(), field: "category", operator: "contains", value: "Ingresos" },
  ])
  const [logicOperator, setLogicOperator] = useState<"AND" | "OR">("AND")
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = DEFAULT_PAGE_SIZE
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [presetDescription, setPresetDescription] = useState("")

  const conditionKey = useMemo(
    () =>
      JSON.stringify(
        conditions.map((condition) => {
          const { id: _conditionId, ...rest } = condition
          void _conditionId
          return rest
        })
      ),
    [conditions]
  )

  useEffect(() => {
    setPage(1)
  }, [conditionKey, userId])

  const searchFilters = useMemo(
    () => buildSearchFilters(conditions),
    [conditions]
  )

  const searchParams = useMemo(() => {
    if (!userId) {
      return null
    }

    return {
      userId,
      page,
      pageSize,
      sortBy: "postedAt" as MovementsSearchParams["sortBy"],
      sortDirection: "desc" as MovementsSearchParams["sortDirection"],
      ...searchFilters,
    }
  }, [userId, page, pageSize, searchFilters])

  const filtersKey = useMemo(() => {
    if (!searchParams) {
      return {}
    }

    const { userId: _userId, page: _page, pageSize: _pageSize, ...rest } = searchParams
    void _userId
    void _page
    void _pageSize
    return rest
  }, [searchParams])

  const movementsQuery = useApiQuery<MovementsResponse, Error>({
    queryKey: searchParams
      ? queryKeys.movements.search({
          userId: searchParams.userId,
          page: searchParams.page,
          pageSize: searchParams.pageSize,
          filters: filtersKey,
        })
      : ["movements", "search", "disabled"],
    queryFn: (_, context) =>
      searchMovements(searchParams!, { signal: context.signal }),
    enabled: Boolean(searchParams),
    keepPreviousData: true,
  })

  const presetsQuery = useApiQuery<
    MovementPresetsResponse,
    Error,
    MovementPresetsResponse | undefined
  >({
    queryKey: userId
      ? queryKeys.movements.presets(userId)
      : ["movements", "presets", "disabled"],
    queryFn: (_, context) =>
      userId
        ? getMovementPresets(userId, { signal: context.signal })
        : Promise.resolve({ presets: [] }),
    enabled: Boolean(userId),
  })

  const savePresetMutation = useApiMutation<
    MovementPreset,
    Error,
    { name: string; description?: string | null; conditions: MovementCondition[]; logicOperator: "AND" | "OR" }
  >({
    mutationFn: async (_, variables) => {
      if (!userId) {
        throw new Error("Debes iniciar sesión para guardar tus vistas.")
      }

      return createMovementPreset({
        userId,
        name: variables.name,
        description: variables.description ?? null,
        logicOperator: variables.logicOperator,
        conditions: variables.conditions,
      })
    },
    onSuccess: (preset) => {
      setIsSaveDialogOpen(false)
      setPresetName("")
      setPresetDescription("")
      toast({
        title: "Segmento guardado",
        description: `Registramos "${preset.name}" en tus vistas guardadas.`,
      })
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.movements.presets(userId),
        })
      }
    },
    onError: (error) => {
      toast({
        title: "No pudimos guardar el segmento",
        description: error.message || "Intenta nuevamente en unos segundos.",
        variant: "destructive",
      })
    },
  })

  const movements = useMemo(
    () => movementsQuery.data?.data ?? [],
    [movementsQuery.data]
  )
  const stats = movementsQuery.data?.stats ?? {
    count: 0,
    totalAmount: 0,
    inflow: 0,
    outflow: 0,
    averageAmount: 0,
  }
  const pagination = movementsQuery.data?.pagination ?? {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
  }
  const totalPages = pagination.totalPages

  useEffect(() => {
    setSelectedRows([])
  }, [pagination.page, conditionKey])

  const presets = presetsQuery.data?.presets ?? []
  const presetsError = presetsQuery.error
    ? presetsQuery.error.message || "No pudimos recuperar tus segmentos guardados."
    : null

  const movementsError = movementsQuery.error
    ? movementsQuery.error.message || "No pudimos obtener los movimientos."
    : null

  const handleAddCondition = useCallback(() => {
    setConditions((previous) => [
      ...previous,
      { id: createConditionId(), field: "description", operator: "contains", value: "" },
    ])
  }, [])

  const handleUpdateCondition = useCallback(
    (id: string, key: "field" | "operator" | "value", value: string) => {
      setConditions((previous) =>
        previous.map((condition) => {
          if (condition.id !== id) {
            return condition
          }

          if (key === "field") {
            const nextField = value as MovementConditionField
            const config = FIELD_CONFIG.find((item) => item.value === nextField)
            const nextOperator = config?.operators[0] ?? condition.operator
            return {
              ...condition,
              field: nextField,
              operator: nextOperator,
              value: "",
            }
          }

          if (key === "operator") {
            return {
              ...condition,
              operator: value as MovementConditionOperator,
            }
          }

          return {
            ...condition,
            value,
          }
        })
      )
    },
    []
  )

  const handleRemoveCondition = useCallback((id: string) => {
    setConditions((previous) => previous.filter((condition) => condition.id !== id))
  }, [])

  const toggleRowSelection = useCallback((id: string, checked: boolean) => {
    setSelectedRows((previous) => {
      if (checked) {
        return [...previous, id]
      }

      return previous.filter((rowId) => rowId !== id)
    })
  }, [])

  const toggleAllRows = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRows(movements.map((movement) => movement.id))
        return
      }

      setSelectedRows([])
    },
    [movements]
  )

  const conditionSummary = useMemo(() => {
    if (conditions.length === 0) {
      return ""
    }

    return conditions
      .map((condition) => {
        const fieldLabel = FIELD_CONFIG.find((item) => item.value === condition.field)?.label ?? condition.field
        const operatorLabel = OPERATOR_LABELS[condition.operator]
        return `${fieldLabel} ${operatorLabel} ${condition.value}`
      })
      .join(` ${logicOperator} `)
  }, [conditions, logicOperator])

  const handlePresetSubmit = async () => {
    if (!presetName.trim()) {
      toast({
        title: "Define un nombre",
        description: "Asigna un nombre al segmento para identificarlo fácilmente.",
        variant: "destructive",
      })
      return
    }

    await savePresetMutation.mutateAsync({
      name: presetName.trim(),
      description: presetDescription.trim() || null,
      conditions: conditions.map((condition) => {
        const { id: _conditionId, ...rest } = condition
        void _conditionId
        return rest
      }),
      logicOperator,
    })
  }

  const handleDuplicatePreset = async (preset: MovementPreset) => {
    await savePresetMutation.mutateAsync({
      name: `${preset.name} (copia)`,
      description: preset.description ?? null,
      conditions: preset.conditions,
      logicOperator: preset.logicOperator,
    })
  }

  const movementSummaryCards = [
    {
      title: "Movimientos encontrados",
      value: `${stats.count}`,
      helper: "Coincidencias con el filtro actual.",
    },
    {
      title: "Ingresos detectados",
      value: formatCurrency(stats.inflow),
      helper: "Montos positivos dentro del rango.",
    },
    {
      title: "Gastos detectados",
      value: formatCurrency(stats.outflow),
      helper: "Montos negativos dentro del rango.",
    },
    {
      title: "Balance neto",
      value: formatCurrency(stats.totalAmount),
      helper: "Resultado entre ingresos y gastos.",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions">{t.navigation.backToTransactions}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/classification">{t.navigation.goToClassification}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/summaries">{t.navigation.goToSummaries}</Link>
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" /> {t.navigation.export}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {movementSummaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.builder.title}</CardTitle>
              <CardDescription>{t.builder.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={logicOperator}
                onValueChange={(value: "AND" | "OR") => setLogicOperator(value)}
              >
                <SelectTrigger className="w-32" aria-label={t.builder.logicLabel}>
                  <SelectValue placeholder={t.builder.logicLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">{t.builder.logicOptions.and}</SelectItem>
                  <SelectItem value="OR" disabled>
                    {t.builder.logicOptions.or}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-2" onClick={handleAddCondition}>
                <Plus className="h-4 w-4" /> {t.builder.addCondition}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => setIsSaveDialogOpen(true)}
                disabled={!userId}
              >
                <Save className="h-4 w-4" /> {t.builder.saveView}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Por ahora combinamos todas las condiciones usando el operador lógico AND.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {conditions.map((condition) => {
              const fieldConfig = FIELD_CONFIG.find((item) => item.value === condition.field) ?? FIELD_CONFIG[0]
              return (
                <div
                  key={condition.id}
                  className="grid gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-[200px_200px_1fr_auto]"
                >
                  <Select
                    value={condition.field}
                    onValueChange={(value) => handleUpdateCondition(condition.id, "field", value)}
                  >
                    <SelectTrigger aria-label={t.builder.fieldPlaceholder} className="w-full">
                      <SelectValue placeholder={t.builder.fieldPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_CONFIG.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={condition.operator}
                    onValueChange={(value) => handleUpdateCondition(condition.id, "operator", value)}
                  >
                    <SelectTrigger aria-label={t.builder.operatorPlaceholder} className="w-full">
                      <SelectValue placeholder={t.builder.operatorPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldConfig.operators.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {OPERATOR_LABELS[operator]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={condition.value}
                    onChange={(event) => handleUpdateCondition(condition.id, "value", event.target.value)}
                    placeholder={fieldConfig.placeholder}
                    aria-label={t.builder.valuePlaceholder}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCondition(condition.id)}
                    aria-label={t.builder.removeConditionAria}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
          <Textarea
            rows={3}
            value={conditionSummary}
            readOnly
            aria-label={t.builder.textareaLabel}
          />
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>{t.segments.title}</CardTitle>
            <CardDescription>{t.segments.description}</CardDescription>
          </div>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/transactions/summaries">
              {t.navigation.goToSummaries}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {presetsError ? (
            <Alert variant="destructive">
              <AlertTitle>No pudimos cargar tus segmentos</AlertTitle>
              <AlertDescription>{presetsError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.length === 0 ? (
              <Card className="border border-dashed">
                <CardContent className="py-8 text-sm text-muted-foreground">
                  No tienes segmentos guardados todavía. Guarda una vista personalizada para reutilizarla.
                </CardContent>
              </Card>
            ) : (
              presets.map((preset) => (
                <Card key={preset.id} className="border border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">{preset.name}</CardTitle>
                    <CardDescription>
                      {preset.description ?? "Sin descripción"} · {new Date(preset.updatedAt).toLocaleDateString("es-CL")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      className="gap-2 px-0"
                      onClick={() => {
                        setConditions(
                          preset.conditions.map((condition) => ({
                            id: createConditionId(),
                            ...condition,
                          }))
                        )
                        setLogicOperator(preset.logicOperator)
                        setPage(1)
                      }}
                    >
                      {t.segments.open}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleDuplicatePreset(preset)}
                    >
                      {t.segments.duplicate}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.results.title}</CardTitle>
              <CardDescription>{t.results.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                {t.results.bulkActions.tag}
              </Button>
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                {t.results.bulkActions.markReviewed}
              </Button>
              <Button variant="default" size="sm" disabled={selectedRows.length === 0}>
                {t.results.bulkActions.export}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {movementsError ? (
            <Alert variant="destructive">
              <AlertTitle>No pudimos obtener los movimientos</AlertTitle>
              <AlertDescription>{movementsError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id="select-all-results"
              checked={movements.length > 0 && selectedRows.length === movements.length}
              onCheckedChange={(value) => toggleAllRows(Boolean(value))}
              aria-label="Seleccionar resultados"
            />
            <label htmlFor="select-all-results" className="text-muted-foreground">
              <span aria-live="polite">
                {selectedRows.length > 0
                  ? t.results.selectionLabel.selected(selectedRows.length)
                  : t.results.selectionLabel.default}
              </span>
            </label>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>{t.results.tableHeaders.description}</TableHead>
                <TableHead>{t.results.tableHeaders.date}</TableHead>
                <TableHead>{t.results.tableHeaders.category}</TableHead>
                <TableHead className="text-right">{t.results.tableHeaders.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsQuery.isPending ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`movement-skeleton-${index}`}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t.results.empty}
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => {
                  const isSelected = selectedRows.includes(movement.id)
                  const amount = movement.amount ?? 0
                  const categoryLabel = movement.category ?? "Sin categoría"
                  const movementDate = movement.postedAt
                    ? formatDate(movement.postedAt)
                    : "Sin fecha"
                  return (
                    <TableRow key={movement.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(value) => toggleRowSelection(movement.id, Boolean(value))}
                          aria-label={`Seleccionar ${movement.description ?? movement.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.description ?? "Sin descripción"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{movementDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(amount)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
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
                  <PaginationItem key={`results-page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === pagination.page}
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
              {t.results.paginationLabel({
                page: pagination.page,
                total: totalPages,
                count: pagination.total,
              })}
            </div>
          </Pagination>
        </CardContent>
      </Card>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar segmento</DialogTitle>
            <DialogDescription>
              Asigna un nombre para reutilizar esta combinación de filtros en el futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Nombre</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Ej: Gastos esenciales del mes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-description">Descripción</Label>
              <Input
                id="preset-description"
                value={presetDescription}
                onChange={(event) => setPresetDescription(event.target.value)}
                placeholder="Anota el objetivo del segmento"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePresetSubmit} disabled={savePresetMutation.isPending} className="gap-2">
              {savePresetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar segmento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
