"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Download, Plus, Save, X } from "lucide-react"

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
import { formatCurrency, formatDate } from "@/lib/intl"

const t = esCL.transactions.advancedSearch

const mockResults = [
  {
    id: "res-001",
    description: "Pago arriendo departamento",
    date: "2024-03-12",
    amount: -550_000,
    category: "Arriendo",
  },
  {
    id: "res-002",
    description: "Compra supermercado Lider",
    date: "2024-03-10",
    amount: -86_500,
    category: "Supermercado",
  },
  {
    id: "res-003",
    description: "Suscripción streaming familiar",
    date: "2024-03-06",
    amount: -12_990,
    category: "Suscripciones",
  },
  {
    id: "res-004",
    description: "Recarga tarjeta Bip!",
    date: "2024-03-04",
    amount: -5_000,
    category: "Transporte",
  },
  {
    id: "res-005",
    description: "Depósito sueldo",
    date: "2024-03-01",
    amount: 1_650_000,
    category: "Ingresos",
  },
]

const savedSegments = t.segments.items

const conditionFields = t.conditions.fields
const operators = t.conditions.operators

export default function TransactionsAdvancedSearchPage() {
  const [conditions, setConditions] = useState([
    { id: "cond-1", field: "Monto", operator: ">", value: "5000" },
    { id: "cond-2", field: "Categoría", operator: "no contiene", value: "Ingresos" },
  ])
  const [logicOperator, setLogicOperator] = useState<"AND" | "OR">("AND")
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 3

  const filteredResults = useMemo(() => {
    const evaluateCondition = (
      result: (typeof mockResults)[number],
      condition: (typeof conditions)[number],
    ) => {
      const value = condition.value.trim()
      if (!value) {
        return true
      }

      switch (condition.field) {
        case "Monto": {
          const amount = result.amount
          if (condition.operator === "entre") {
            const [min, max] = value.split(",").map((item) => Number(item.trim()))
            if (Number.isNaN(min) || Number.isNaN(max)) {
              return true
            }
            return amount >= min && amount <= max
          }

          const parsedValue = Number(value)
          if (Number.isNaN(parsedValue)) {
            return true
          }

          if (condition.operator === ">") {
            return amount > parsedValue
          }
          if (condition.operator === "<") {
            return amount < parsedValue
          }

          return amount === parsedValue
        }
        case "Descripción": {
          const description = result.description.toLowerCase()
          if (condition.operator === "no contiene") {
            return !description.includes(value.toLowerCase())
          }
          return description.includes(value.toLowerCase())
        }
        case "Categoría": {
          const category = result.category.toLowerCase()
          if (condition.operator === "no contiene") {
            return !category.includes(value.toLowerCase())
          }
          return category.includes(value.toLowerCase())
        }
        case "Fecha": {
          if (condition.operator === "entre") {
            const [start, end] = value.split(",").map((item) => item.trim())
            if (!start || !end) {
              return true
            }
            const dateValue = new Date(result.date)
            return dateValue >= new Date(start) && dateValue <= new Date(end)
          }

          return result.date.includes(value)
        }
        default:
          return true
      }
    }

    const evaluator = logicOperator === "AND" ? "every" : "some"

    return mockResults.filter((result) => {
      if (conditions.length === 0) {
        return true
      }

      return conditions[evaluator]((condition) => evaluateCondition(result, condition))
    })
    // TODO: Sustituir este filtro mock por la llamada real al servicio de búsqueda avanzada
  }, [conditions, logicOperator])

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize))
  const paginatedResults = filteredResults.slice((page - 1) * pageSize, page * pageSize)

  const addCondition = () => {
    setConditions((previous) => [
      ...previous,
      { id: `cond-${previous.length + 1}`, field: "Descripción", operator: "contiene", value: "" },
    ])
  }

  const updateCondition = (id: string, key: "field" | "operator" | "value", value: string) => {
    setConditions((previous) =>
      previous.map((condition) =>
        condition.id === id
          ? {
              ...condition,
              [key]: value,
            }
          : condition,
      ),
    )
  }

  const removeCondition = (id: string) => {
    setConditions((previous) => previous.filter((condition) => condition.id !== id))
  }

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedRows((previous) => {
      if (checked) {
        return [...previous, id]
      }

      return previous.filter((rowId) => rowId !== id)
    })
  }

  const toggleAllRows = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedResults.map((result) => result.id))
      return
    }

    setSelectedRows([])
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
                  <SelectItem value="OR">{t.builder.logicOptions.or}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-2" onClick={addCondition}>
                <Plus className="h-4 w-4" /> {t.builder.addCondition}
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Save className="h-4 w-4" /> {t.builder.saveView}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {conditions.map((condition) => (
              <div
                key={condition.id}
                className="grid gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-[200px_200px_1fr_auto]"
              >
                <Select
                  value={condition.field}
                  onValueChange={(value) => updateCondition(condition.id, "field", value)}
                >
                  <SelectTrigger aria-label={t.builder.fieldPlaceholder} className="w-full">
                    <SelectValue placeholder={t.builder.fieldPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={condition.operator}
                  onValueChange={(value) => updateCondition(condition.id, "operator", value)}
                >
                  <SelectTrigger aria-label={t.builder.operatorPlaceholder} className="w-full">
                    <SelectValue placeholder={t.builder.operatorPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator} value={operator}>
                        {operator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={condition.value}
                  onChange={(event) => updateCondition(condition.id, "value", event.target.value)}
                  placeholder={t.builder.valuePlaceholder}
                  aria-label={t.builder.valuePlaceholder}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(condition.id)}
                  aria-label={t.builder.removeConditionAria}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Textarea
            rows={3}
            value={conditions.map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(` ${logicOperator} `)}
            onChange={() => {
              /* TODO: Mapear actualizaciones desde el editor textual hacia el servicio de construcción */
            }}
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
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {savedSegments.map((segment) => (
            <Card key={segment.id} className="border border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{segment.name}</CardTitle>
                <CardDescription>
                  {segment.note} · {segment.updatedAt}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <Button variant="ghost" className="gap-2 px-0" asChild>
                  <Link href="/transactions">
                    {t.segments.open}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="sm">
                  {t.segments.duplicate}
                </Button>
              </CardContent>
            </Card>
          ))}
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
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id="select-all-results"
              checked={paginatedResults.length > 0 && selectedRows.length === paginatedResults.length}
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
              {paginatedResults.map((result) => {
                const isSelected = selectedRows.includes(result.id)
                return (
                  <TableRow key={result.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(value) => toggleRowSelection(result.id, Boolean(value))}
                        aria-label={`Seleccionar ${result.description}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{result.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(result.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(result.amount)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {paginatedResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t.results.empty}
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
                  <PaginationItem key={`results-page-${pageNumber}`}>
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
              {t.results.paginationLabel({
                page,
                total: totalPages,
                count: filteredResults.length,
              })}
            </div>
          </Pagination>
        </CardContent>
      </Card>
    </div>
  )
}
