"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Plus, Sparkles, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
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

import { esCL } from "@/i18n/es-CL"

const t = esCL.transactions.classification

const mockRules = [
  {
    id: "rule-1",
    name: "Clasificar compras de supermercado",
    conditions: ["Descripción contiene 'Jumbo'", "Monto > 40000"],
    action: "Asignar categoría Supermercado",
    accuracy: 96,
    status: "Activa",
    lastRun: "2024-03-12 08:45",
  },
  {
    id: "rule-2",
    name: "Detectar duplicados de suscripciones",
    conditions: ["Descripción contiene 'Spotify'", "Monto = 12990"],
    action: "Agregar etiqueta 'Revisar suscripción'",
    accuracy: 84,
    status: "Borrador",
    lastRun: "2024-03-11 18:10",
  },
  {
    id: "rule-3",
    name: "Avisar cuando sube el transporte",
    conditions: ["Categoría = Transporte", "Monto > 10000"],
    action: "Enviar recordatorio de presupuesto",
    accuracy: 73,
    status: "En prueba",
    lastRun: "2024-03-10 07:30",
  },
  {
    id: "rule-4",
    name: "Clasificar depósitos de sueldo",
    conditions: ["Descripción contiene 'Sueldo'"],
    action: "Asignar categoría Ingresos",
    accuracy: 99,
    status: "Activa",
    lastRun: "2024-03-09 19:05",
  },
]

const ruleStatuses = ["Todas", "Activa", "En prueba", "Borrador"]

export default function TransactionsClassificationPage() {
  const [statusFilter, setStatusFilter] = useState<string>("Todas")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 3

  const filteredRules = useMemo(() => {
    return mockRules.filter((rule) => {
      const matchesStatus = statusFilter === "Todas" || rule.status === statusFilter
      const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesStatus && matchesSearch
    })
  }, [statusFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize))
  const paginatedRules = filteredRules.slice((page - 1) * pageSize, page * pageSize)

  const toggleRuleSelection = (id: string, checked: boolean) => {
    setSelectedRules((previous) => {
      if (checked) {
        return [...previous, id]
      }

      return previous.filter((ruleId) => ruleId !== id)
    })
  }

  const toggleAllRules = (checked: boolean) => {
    if (checked) {
      setSelectedRules(paginatedRules.map((rule) => rule.id))
      return
    }

    setSelectedRules([])
  }

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
            <Link href="/transactions/advanced-search">{t.navigation.goToAdvancedSearch}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/summaries">{t.navigation.goToSummaries}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.activeRules.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">12</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t.stats.activeRules.helper}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.automatedMovements.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">2,430</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> 86% sin intervención manual
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">{t.stats.automatedMovements.helper}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.accuracy.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">93%</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="px-0" asChild>
              <Link href="/transactions/advanced-search">
                {t.stats.accuracy.button}
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">{t.stats.accuracy.helper}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.lastExport.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">Hace 3 h</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="gap-2">
              <Upload className="h-4 w-4" /> {t.stats.lastExport.button}
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">{t.stats.lastExport.helper}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.builder.title}</CardTitle>
              <CardDescription>{t.builder.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> {t.builder.newRule}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" /> {t.builder.import}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">{t.builder.conditionsTitle}</p>
              <div className="flex flex-wrap gap-2">
                {t.builder.conditionBadges.map((badge) => (
                  <Badge key={badge} variant="outline">
                    {badge}
                  </Badge>
                ))}
              </div>
              <Textarea
                rows={4}
                value={t.builder.textareaValue}
                onChange={() => {
                  /* TODO: Reemplazar por actualización de la regla seleccionada desde el servicio real */
                }}
                aria-label={t.builder.conditionsTitle}
              />
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">{t.builder.actionsTitle}</p>
              <div className="flex flex-wrap gap-2">
                {t.builder.actionBadges.map((badge) => (
                  <Badge key={badge} variant="secondary">
                    {badge}
                  </Badge>
                ))}
              </div>
              <Input
                placeholder={t.builder.actionPlaceholder}
                defaultValue={t.builder.actionPlaceholder}
                aria-label={t.builder.actionPlaceholder}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">{t.builder.testButton}</Button>
            <Button variant="outline" size="sm">
              {t.builder.draftButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.engine.title}</CardTitle>
              <CardDescription>{t.engine.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={searchTerm}
                onChange={(event) => {
                  setPage(1)
                  setSearchTerm(event.target.value)
                }}
                placeholder={t.engine.searchPlaceholder}
                className="w-full sm:w-60"
                aria-label={t.engine.searchPlaceholder}
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setPage(1)
                  setStatusFilter(value)
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t.engine.statusPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {ruleStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id="select-all-rules"
                checked={paginatedRules.length > 0 && selectedRules.length === paginatedRules.length}
                onCheckedChange={(value) => toggleAllRules(Boolean(value))}
                aria-label="Seleccionar reglas"
              />
              <label htmlFor="select-all-rules" className="text-muted-foreground">
                <span aria-live="polite">
                  {selectedRules.length > 0
                    ? t.engine.selectionLabel.selected(selectedRules.length)
                    : t.engine.selectionLabel.default}
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={selectedRules.length === 0}>
                {t.engine.bulkActions.apply}
              </Button>
              <Button variant="outline" size="sm" disabled={selectedRules.length === 0}>
                {t.engine.bulkActions.duplicate}
              </Button>
              <Button variant="default" size="sm" disabled={selectedRules.length === 0}>
                {t.engine.bulkActions.run}
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>{t.engine.tableHeaders.name}</TableHead>
                <TableHead>{t.engine.tableHeaders.conditions}</TableHead>
                <TableHead>{t.engine.tableHeaders.action}</TableHead>
                <TableHead className="text-right">{t.engine.tableHeaders.accuracy}</TableHead>
                <TableHead className="text-right">{t.engine.tableHeaders.lastRun}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRules.map((rule) => {
                const isSelected = selectedRules.includes(rule.id)

                return (
                  <TableRow key={rule.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(value) => toggleRuleSelection(rule.id, Boolean(value))}
                        aria-label={`Seleccionar regla ${rule.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rule.conditions.map((condition) => (
                          <Badge key={`${rule.id}-${condition}`} variant="outline">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{rule.action}</TableCell>
                    <TableCell className="text-right font-semibold">{rule.accuracy}%</TableCell>
                    <TableCell className="text-right text-muted-foreground">{rule.lastRun}</TableCell>
                  </TableRow>
                )
              })}
              {paginatedRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t.engine.empty}
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
                  <PaginationItem key={`rules-page-${pageNumber}`}>
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
              {t.engine.paginationLabel({
                page,
                total: totalPages,
                count: filteredRules.length,
              })}
            </div>
          </Pagination>
        </CardContent>
      </Card>

      <Card className="border border-dashed">
        <CardHeader>
          <CardTitle>Historial de cambios</CardTitle>
          <CardDescription>
            Audita ajustes realizados y restaura versiones previas cuando sea necesario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {/* TODO: Conectar con el servicio real de auditoría de reglas para mostrar eventos */}
            Integra aquí la fuente de auditoría para mostrar qué usuario modificó cada regla y sus
            resultados.
          </p>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/transactions/summaries">
              Revisar impacto en resúmenes
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
