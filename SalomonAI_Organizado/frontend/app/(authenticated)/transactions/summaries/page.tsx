"use client"

import { useMemo, useState } from "react"
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

const mockSummaries = [
  {
    id: "sum-1",
    category: "Salario",
    current: 1250000,
    previous: 1190000,
    contribution: 0.62,
  },
  {
    id: "sum-2",
    category: "Restaurantes",
    current: -185000,
    previous: -162000,
    contribution: -0.12,
  },
  {
    id: "sum-3",
    category: "Transporte",
    current: -90000,
    previous: -82000,
    contribution: -0.07,
  },
  {
    id: "sum-4",
    category: "Servicios del hogar",
    current: -65000,
    previous: -72000,
    contribution: -0.06,
  },
  {
    id: "sum-5",
    category: "Compras personales",
    current: -42000,
    previous: -51000,
    contribution: -0.05,
  },
]

const periods = ["Este mes", "Últimos 3 meses", "Este año"]
const accounts = [
  "Todas tus cuentas",
  "Cuenta corriente",
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Cuenta de ahorros",
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value)

export default function TransactionsSummariesPage() {
  const [period, setPeriod] = useState<string>(periods[0])
  const [account, setAccount] = useState<string>(accounts[0])
  const [benchmark, setBenchmark] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 4

  const filteredSummaries = useMemo(() => {
    return mockSummaries.filter((summary) => {
      if (!benchmark) {
        return true
      }

      return summary.category.toLowerCase().includes(benchmark.toLowerCase())
    })
  }, [benchmark])

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / pageSize))
  const paginatedSummaries = filteredSummaries.slice((page - 1) * pageSize, page * pageSize)

  const totalIngresos = mockSummaries
    .filter((summary) => summary.current > 0)
    .reduce((acc, summary) => acc + summary.current, 0)
  const totalGastos = mockSummaries
    .filter((summary) => summary.current < 0)
    .reduce((acc, summary) => acc + summary.current, 0)
  const ahorroEstimado = totalIngresos + totalGastos
  const totalAnterior = mockSummaries.reduce((acc, summary) => acc + summary.previous, 0)
  const variacion = totalAnterior !== 0 ? ((ahorroEstimado - totalAnterior) / Math.abs(totalAnterior)) * 100 : 0
  const variacionLabel = `${variacion > 0 ? "+" : ""}${variacion.toFixed(1)}%`

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
              {formatCurrency(totalIngresos)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="gap-1">
              <BarChart3 className="h-3 w-3" /> +8.6% vs tu mes anterior
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gastos del mes</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {formatCurrency(Math.abs(totalGastos))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Incluye tus consumos diarios y servicios.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ahorro estimado</CardDescription>
            <CardTitle className="text-3xl font-semibold">{formatCurrency(ahorroEstimado)}</CardTitle>
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
            <CardTitle className="text-3xl font-semibold">{variacionLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="gap-1">
              <PieChart className="h-3 w-3" /> Tu balance mensual cambió respecto al mes pasado
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
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Seleccionar periodo">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Seleccionar cuenta">
                  <SelectValue placeholder="Tu cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
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
                <TableHead>Comercio/Entidad</TableHead>
                <TableHead className="text-right">Tu cuenta ({period})</TableHead>
                <TableHead className="text-right">Mes anterior</TableHead>
                <TableHead className="text-right">Participación en tu balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSummaries.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell className="font-medium">{summary.category}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(summary.current)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(summary.previous)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(summary.contribution * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {paginatedSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No encontramos movimientos que coincidan con lo que buscas.
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
              Página {page} de {totalPages} · {filteredSummaries.length} movimientos
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
    </div>
  )
}
