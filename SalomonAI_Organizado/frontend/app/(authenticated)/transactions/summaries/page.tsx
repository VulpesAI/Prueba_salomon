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
    category: "Ventas",
    current: 87500,
    previous: 81200,
    contribution: 0.48,
  },
  {
    id: "sum-2",
    category: "Marketing",
    current: -24500,
    previous: -19800,
    contribution: -0.22,
  },
  {
    id: "sum-3",
    category: "Operaciones",
    current: -18600,
    previous: -17200,
    contribution: -0.19,
  },
  {
    id: "sum-4",
    category: "Tecnología",
    current: -9200,
    previous: -10200,
    contribution: -0.09,
  },
  {
    id: "sum-5",
    category: "Administración",
    current: -6200,
    previous: -5800,
    contribution: -0.06,
  },
]

const periods = ["Últimos 30 días", "Trimestre actual", "Año completo"]
const channels = ["Todos", "Transferencia", "Tarjeta", "Efectivo", "Pasarelas digitales"]

export default function TransactionsSummariesPage() {
  const [period, setPeriod] = useState<string>(periods[0])
  const [channel, setChannel] = useState<string>(channels[0])
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Resúmenes de transacciones</h1>
          <p className="text-muted-foreground">
            Visualiza el rendimiento por categoría, detecta desviaciones y comparte insights con el
            resto del negocio.
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
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos acumulados</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {totalIngresos.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="gap-1">
              <BarChart3 className="h-3 w-3" /> +8.6% vs periodo anterior
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto operativo</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {Math.abs(totalGastos).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Incluye marketing, operaciones y TI.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Margen estimado</CardDescription>
            <CardTitle className="text-3xl font-semibold">36%</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="gap-2 px-0" asChild>
              <Link href="/transactions/advanced-search">
                Abrir vista detallada <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reportes compartidos</CardDescription>
            <CardTitle className="text-3xl font-semibold">18</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="gap-1">
              <PieChart className="h-3 w-3" /> 5 stakeholders activos
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <CardTitle>Resumen mensual</CardTitle>
              <CardDescription>
                Ajusta los filtros para alinear el reporte con tus periodos contables y canales de
                cobro.
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
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Seleccionar canal">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" className="gap-2">
                <CalendarRange className="h-4 w-4" /> Configurar periodo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="benchmark">Comparar contra</Label>
              <Input
                id="benchmark"
                placeholder="Ej. Presupuesto Q1"
                value={benchmark}
                onChange={(event) => {
                  setPage(1)
                  setBenchmark(event.target.value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Compartir</Label>
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
                <TableHead className="text-right">Actual ({period})</TableHead>
                <TableHead className="text-right">Periodo anterior</TableHead>
                <TableHead className="text-right">Participación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSummaries.map((summary) => (
                <TableRow key={summary.id}>
                  <TableCell className="font-medium">{summary.category}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {summary.current.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {summary.previous.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                  </TableCell>
                  <TableCell className="text-right">
                    {(summary.contribution * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              {paginatedSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No hay categorías que coincidan con el filtro indicado.
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
              Página {page} de {totalPages} · {filteredSummaries.length} filas
            </div>
          </Pagination>
        </CardContent>
      </Card>

      <Card className="border border-dashed">
        <CardHeader>
          <CardTitle>Compartir reportes</CardTitle>
          <CardDescription>
            Publica snapshots con contexto, define cadencias de entrega y registra confirmaciones de
            lectura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {/* TODO: Integrar con el servicio de reportes para obtener auditoría y destinatarios reales */}
            Conecta aquí la API de reportes para desplegar destinatarios, agendas y resultados de
            envíos.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="gap-2">
              <FileDown className="h-4 w-4" /> Descargar XLSX
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/transactions/classification">
                Revisar reglas relacionadas
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
