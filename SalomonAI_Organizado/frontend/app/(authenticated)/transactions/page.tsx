"use client"

import { useEffect, useMemo, useState } from "react"
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

const mockTransactions = [
  {
    id: "trx-001",
    date: "2024-03-12",
    description: "Pago plataforma anuncios",
    amount: -12450.75,
    category: "Marketing",
    status: "Conciliado",
    channel: "Tarjeta crédito",
  },
  {
    id: "trx-002",
    date: "2024-03-11",
    description: "Ingreso suscripción enterprise",
    amount: 28999.0,
    category: "Ventas",
    status: "Conciliado",
    channel: "Transferencia",
  },
  {
    id: "trx-003",
    date: "2024-03-10",
    description: "Factura proveedor logística",
    amount: -7890.22,
    category: "Operaciones",
    status: "En revisión",
    channel: "Débito automático",
  },
  {
    id: "trx-004",
    date: "2024-03-09",
    description: "Reembolso cliente premium",
    amount: -1599.0,
    category: "Ventas",
    status: "Conciliado",
    channel: "Tarjeta crédito",
  },
  {
    id: "trx-005",
    date: "2024-03-08",
    description: "Pago SaaS analítica",
    amount: -950.0,
    category: "Tecnología",
    status: "Pendiente",
    channel: "Tarjeta crédito",
  },
  {
    id: "trx-006",
    date: "2024-03-07",
    description: "Retiro de caja chica",
    amount: -3000.0,
    category: "Operaciones",
    status: "Conciliado",
    channel: "Efectivo",
  },
  {
    id: "trx-007",
    date: "2024-03-06",
    description: "Ingreso campaña referidos",
    amount: 5400.0,
    category: "Marketing",
    status: "Conciliado",
    channel: "Transferencia",
  },
  {
    id: "trx-008",
    date: "2024-03-05",
    description: "Pago póliza seguros",
    amount: -2200.0,
    category: "Administración",
    status: "Conciliado",
    channel: "Transferencia",
  },
  {
    id: "trx-009",
    date: "2024-03-04",
    description: "Ingreso marketplace",
    amount: 3350.0,
    category: "Ventas",
    status: "Conciliado",
    channel: "Pasarela digital",
  },
  {
    id: "trx-010",
    date: "2024-03-03",
    description: "Pago servicios nube",
    amount: -1800.0,
    category: "Tecnología",
    status: "Conciliado",
    channel: "Tarjeta crédito",
  },
]

const categories = ["Todas", "Ventas", "Marketing", "Operaciones", "Tecnología", "Administración"]
const statuses = ["Todos", "Conciliado", "En revisión", "Pendiente"]

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas")
  const [statusFilter, setStatusFilter] = useState<string>("Todos")
  const [page, setPage] = useState(1)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, categoryFilter, statusFilter])

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
  const pendingReview = mockTransactions.filter((transaction) => transaction.status !== "Conciliado")
    .length

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
          <h1 className="text-3xl font-semibold tracking-tight">Transacciones</h1>
          <p className="text-muted-foreground">
            Supervisa cada movimiento, activa reglas inteligentes y exporta los datos a tus
            herramientas de BI.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions/classification">Ir a Clasificación</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/summaries">Ver resúmenes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/advanced-search">Búsqueda avanzada</Link>
          </Button>
          <Button asChild>
            <Link href="/transactions/export">
              <Download className="mr-2 h-4 w-4" /> Nueva exportación
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos del periodo</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {totalIncome.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="gap-1">
              <ArrowUpRight className="h-3 w-3" /> +12.4% vs. mes anterior
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gastos del periodo</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {Math.abs(totalExpenses).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="gap-1 text-destructive">
              <Tag className="h-3 w-3" /> Etiqueta desviaciones
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registros revisados hoy</CardDescription>
            <CardTitle className="text-3xl font-semibold">36</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Incluye reglas automáticas y aprobación manual del equipo financiero.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes por validar</CardDescription>
            <CardTitle className="text-3xl font-semibold">{pendingReview}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="gap-2 px-0" asChild>
              <Link href="/transactions/classification">
                <ListChecks className="h-4 w-4" /> Abrir bandeja de revisión
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Listado principal</CardTitle>
              <CardDescription>
                Filtra por múltiples dimensiones, aplica reglas y exporta resultados en segundos.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCcw className="h-4 w-4" /> Sincronizar ahora
              </Button>
              <Button size="sm" className="gap-2">
                <ArrowUpRight className="h-4 w-4" /> Registrar movimiento
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por descripción, referencia o nota"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger aria-label="Filtrar por categoría">
                  <SelectValue placeholder="Categoría" />
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
                  <SelectValue placeholder="Estado" />
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
              <Filter className="h-4 w-4" /> Guardar vista
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
                {selectedRows.length > 0
                  ? `${selectedRows.length} transacciones seleccionadas`
                  : "Seleccionar página actual"}
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                Aplicar etiqueta
              </Button>
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                Ejecutar regla
              </Button>
              <Button variant="default" size="sm" disabled={selectedRows.length === 0}>
                Exportar selección
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Detalle</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Estado</TableHead>
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
                          {new Date(transaction.date).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{transaction.channel}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {transaction.amount.toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={transaction.status === "Conciliado" ? "secondary" : "outline"}
                        className={transaction.status !== "Conciliado" ? "text-amber-600" : undefined}
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
                    No encontramos transacciones con los filtros aplicados.
                    <Button
                      variant="link"
                      className="ml-2 px-0"
                      onClick={() => {
                        setSearchTerm("")
                        setCategoryFilter("Todas")
                        setStatusFilter("Todos")
                      }}
                    >
                      Limpiar filtros
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
              Página {page} de {totalPages} · {filteredTransactions.length} resultados totales
            </div>
          </Pagination>
        </CardContent>
      </Card>

      <Card className="border border-dashed">
        <CardHeader>
          <CardTitle>Integraciones y automatización</CardTitle>
          <CardDescription>
            Exporta resultados filtrados hacia data warehouses o dispara acciones en herramientas
            externas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Las integraciones con BigQuery, Snowflake y Sheets pueden orquestarse desde este panel.
            </p>
            <p>
              {/* TODO: Reemplazar estados mock con la respuesta real de los servicios de exportación */}
              Conecta aquí el servicio real de exportación para mostrar trabajos recientes y estado en
              tiempo real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-2">
              <Download className="h-4 w-4" /> Descargar CSV
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/transactions/summaries">
                <ArrowUpRight className="h-4 w-4" /> Ver resumen ejecutivo
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
