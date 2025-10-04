"use client"

import { useEffect, useMemo, useState, type MouseEventHandler } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Download,
  Filter,
  ListChecks,
  RefreshCcw,
  Tag,
} from "lucide-react"

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

import { esCL } from "@/i18n/es-CL"
import { formatCurrency, formatCurrencyAbsolute, formatDate } from "@/lib/intl"
import { IS_DEMO_MODE, useDemoFinancialData } from "@/context/DemoFinancialDataContext"

const t = esCL.transactions.main

const mockTransactions = [
  {
    id: "trx-001",
    date: "2024-03-12",
    description: "Pago arriendo departamento",
    amount: -550_000,
    category: "Arriendo",
    status: "Confirmada",
    channel: "Transferencia bancaria",
  },
  {
    id: "trx-002",
    date: "2024-03-11",
    description: "Depósito sueldo",
    amount: 1_650_000,
    category: "Ingresos",
    status: "Confirmada",
    channel: "Depósito automático",
  },
  {
    id: "trx-003",
    date: "2024-03-10",
    description: "Compra supermercado Lider",
    amount: -86_500,
    category: "Supermercado",
    status: "Confirmada",
    channel: "Tarjeta de débito",
  },
  {
    id: "trx-004",
    date: "2024-03-09",
    description: "Aplicación transporte Didi",
    amount: -6_500,
    category: "Transporte",
    status: "Confirmada",
    channel: "Tarjeta de crédito",
  },
  {
    id: "trx-005",
    date: "2024-03-08",
    description: "Cena restaurante italiano",
    amount: -24_500,
    category: "Restaurantes",
    status: "Pendiente",
    channel: "Tarjeta de crédito",
  },
  {
    id: "trx-006",
    date: "2024-03-07",
    description: "Pago cuenta de luz",
    amount: -38_000,
    category: "Servicios",
    status: "Confirmada",
    channel: "Débito automático",
  },
  {
    id: "trx-007",
    date: "2024-03-06",
    description: "Suscripción streaming familiar",
    amount: -12_990,
    category: "Suscripciones",
    status: "Revisar",
    channel: "Tarjeta de crédito",
  },
  {
    id: "trx-008",
    date: "2024-03-05",
    description: "Reembolso seguro de salud",
    amount: 45_000,
    category: "Salud",
    status: "Confirmada",
    channel: "Transferencia bancaria",
  },
  {
    id: "trx-009",
    date: "2024-03-04",
    description: "Recarga tarjeta Bip!",
    amount: -5_000,
    category: "Transporte",
    status: "Confirmada",
    channel: "Efectivo",
  },
  {
    id: "trx-010",
    date: "2024-03-03",
    description: "Pago app de meditación",
    amount: -5_990,
    category: "Suscripciones",
    status: "Confirmada",
    channel: "Tarjeta de débito",
  },
]

const categories = t.filters.categories
const statuses = t.filters.statuses

type DemoExportState = "in_progress" | "ready" | "error"

const demoStatusCopy: Record<DemoExportState, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  in_progress: {
    label: "Procesando demo",
    variant: "outline",
  },
  ready: {
    label: "Descarga demo lista",
    variant: "secondary",
  },
  error: {
    label: "Error en datos demo",
    variant: "destructive",
  },
}

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas")
  const [statusFilter, setStatusFilter] = useState<string>("Todos")
  const [page, setPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const { statement } = useDemoFinancialData()
  const [demoExportStatus, setDemoExportStatus] = useState<DemoExportState>(() =>
    IS_DEMO_MODE ? "in_progress" : "ready"
  )

  useEffect(() => {
    setPage(1)
  }, [searchTerm, categoryFilter, statusFilter])

  useEffect(() => {
    if (!IS_DEMO_MODE) {
      return
    }

    if (!statement) {
      setDemoExportStatus("in_progress")
      return
    }

    if (statement.transactions.length === 0) {
      setDemoExportStatus("error")
      return
    }

    setDemoExportStatus("ready")
  }, [statement])

  const pageSize = 5

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter((transaction) => {
      const matchesSearch = transaction.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesCategory =
        categoryFilter === "Todas" || transaction.category === categoryFilter
      const matchesStatus = statusFilter === "Todos" || transaction.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [searchTerm, categoryFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize))
  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  )

  const totalIncome = mockTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((acc, transaction) => acc + transaction.amount, 0)
  const totalExpenses = mockTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((acc, transaction) => acc + transaction.amount, 0)
  const pendingReview = mockTransactions.filter((transaction) => transaction.status !== "Confirmada")
    .length

  const preventDemoNavigation: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (!IS_DEMO_MODE) {
      return
    }

    if (demoExportStatus !== "ready") {
      event.preventDefault()
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedTransactions.map((transaction) => transaction.id))
      return
    }

    setSelectedRows([])
  }

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedRows((previous) => {
      if (checked) {
        return [...previous, id]
      }

      return previous.filter((rowId) => rowId !== id)
    })
  }

  const handleChangePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) {
      return
    }

    setSelectedRows([])
    setPage(nextPage)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions/classification">{t.navigation.classification}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/summaries">{t.navigation.summaries}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/advanced-search">{t.navigation.advancedSearch}</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button asChild disabled={IS_DEMO_MODE && demoExportStatus !== "ready"}>
              <Link
                href="/transactions/export"
                aria-disabled={IS_DEMO_MODE && demoExportStatus !== "ready"}
                onClick={preventDemoNavigation}
              >
                <Download className="mr-2 h-4 w-4" /> {t.navigation.export}
              </Link>
            </Button>
            {IS_DEMO_MODE ? (
              <Badge variant={demoStatusCopy[demoExportStatus].variant} aria-live="polite">
                {demoStatusCopy[demoExportStatus].label}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.income.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">{formatCurrency(totalIncome)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="gap-1">
              <ArrowUpRight className="h-3 w-3" /> {t.stats.income.badge}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">{t.stats.income.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.expenses.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {formatCurrencyAbsolute(totalExpenses)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="gap-1 text-destructive">
              <Tag className="h-3 w-3" /> {t.stats.expenses.badge}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">{t.stats.expenses.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.reviews.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">{mockTransactions.length - pendingReview}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t.stats.reviews.helper}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.stats.pending.label}</CardDescription>
            <CardTitle className="text-3xl font-semibold">{pendingReview}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="gap-2 px-0" asChild>
              <Link href="/transactions/classification">
                <ListChecks className="h-4 w-4" /> {t.stats.pending.cta}
              </Link>
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">{t.stats.pending.helper}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.tableCard.title}</CardTitle>
              <CardDescription>{t.tableCard.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                aria-label={t.tableCard.refreshAria}
              >
                <RefreshCcw className="h-4 w-4" /> {t.tableCard.refresh}
              </Button>
              <Button size="sm" className="gap-2">
                <ArrowUpRight className="h-4 w-4" /> {t.tableCard.add}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t.tableCard.searchPlaceholder}
              aria-label={t.tableCard.searchPlaceholder}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger aria-label="Filtrar por categoría">
                  <SelectValue placeholder={t.tableCard.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Filtrar por estado">
                  <SelectValue placeholder={t.tableCard.statusPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" className="gap-2" size="sm">
              <Filter className="h-4 w-4" /> {t.tableCard.saveView}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id="select-all"
                checked={
                  paginatedTransactions.length > 0 &&
                  selectedRows.length === paginatedTransactions.length
                }
                onCheckedChange={(value) => toggleSelectAll(Boolean(value))}
                aria-label="Seleccionar todas las transacciones de la página"
              />
              <label htmlFor="select-all" className="text-muted-foreground">
                <span aria-live="polite">
                  {selectedRows.length > 0
                    ? t.tableCard.selectionLabel.selected(selectedRows.length)
                    : t.tableCard.selectionLabel.default}
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                {t.tableCard.bulkActions.tag}
              </Button>
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                {t.tableCard.bulkActions.markReviewed}
              </Button>
              <Button variant="default" size="sm" disabled={selectedRows.length === 0}>
                {t.tableCard.bulkActions.export}
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>{t.tableCard.tableHeaders.detail}</TableHead>
                <TableHead>{t.tableCard.tableHeaders.category}</TableHead>
                <TableHead>{t.tableCard.tableHeaders.channel}</TableHead>
                <TableHead className="text-right">{t.tableCard.tableHeaders.amount}</TableHead>
                <TableHead className="text-right">{t.tableCard.tableHeaders.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction) => {
                const isSelected = selectedRows.includes(transaction.id)

                return (
                  <TableRow key={transaction.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(value) => toggleRowSelection(transaction.id, Boolean(value))}
                        aria-label={`Seleccionar transacción ${transaction.description}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{transaction.channel}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={transaction.status === "Confirmada" ? "secondary" : "outline"}
                        className={transaction.status !== "Confirmada" ? "text-amber-600" : undefined}
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t.tableCard.empty}
                    <Button
                      variant="link"
                      className="ml-2 px-0"
                      onClick={() => {
                        setSearchTerm("")
                        setCategoryFilter("Todas")
                        setStatusFilter("Todos")
                      }}
                    >
                      {t.tableCard.clearFilters}
                    </Button>
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
                    handleChangePage(page - 1)
                  }}
                  className="sm:w-auto"
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                return (
                  <PaginationItem key={`page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault()
                        handleChangePage(pageNumber)
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
                    handleChangePage(page + 1)
                  }}
                  className="sm:w-auto"
                />
              </PaginationItem>
            </PaginationContent>
            <div className="text-sm text-muted-foreground">
              {t.tableCard.paginationLabel({
                page,
                total: totalPages,
                count: filteredTransactions.length,
              })}
            </div>
          </Pagination>
        </CardContent>
      </Card>

      <Card className="border border-dashed">
        <CardHeader>
          <CardTitle>{t.tableCard.downloadCard.title}</CardTitle>
          <CardDescription>{t.tableCard.downloadCard.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{t.tableCard.downloadCard.helper}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="gap-2"
              disabled={IS_DEMO_MODE && demoExportStatus !== "ready"}
            >
              <Download className="h-4 w-4" /> {t.tableCard.downloadCard.download}
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/transactions/summaries">
                <ArrowUpRight className="h-4 w-4" /> {t.tableCard.downloadCard.summary}
              </Link>
            </Button>
            {IS_DEMO_MODE ? (
              <Badge variant={demoStatusCopy[demoExportStatus].variant} aria-live="polite">
                {demoStatusCopy[demoExportStatus].label}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
