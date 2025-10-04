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

const mockRules = [
  {
    id: "rule-1",
    name: "Clasificar suscripciones recurrentes",
    conditions: ["Descripción contiene 'Stripe'", "Monto > 1000"],
    action: "Asignar categoría Ventas",
    accuracy: 98,
    status: "Activa",
    lastRun: "2024-03-12 09:45",
  },
  {
    id: "rule-2",
    name: "Viáticos en el extranjero",
    conditions: ["Canal es Tarjeta crédito", "Moneda != MXN"],
    action: "Agregar etiqueta 'Requiere comprobante'",
    accuracy: 82,
    status: "Borrador",
    lastRun: "2024-03-11 17:20",
  },
  {
    id: "rule-3",
    name: "Alertar gastos atípicos",
    conditions: ["Monto < -5000", "Categoría != Presupuestada"],
    action: "Enviar alerta al equipo financiero",
    accuracy: 71,
    status: "En prueba",
    lastRun: "2024-03-10 08:10",
  },
  {
    id: "rule-4",
    name: "Clasificar nómina",
    conditions: ["Descripción contiene 'Nómina'"],
    action: "Asignar categoría Nómina",
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
          <h1 className="text-3xl font-semibold tracking-tight">Clasificación inteligente</h1>
          <p className="text-muted-foreground">
            Automatiza el etiquetado de transacciones con reglas visuales y controla los resultados
            antes de publicarlos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions">Volver a transacciones</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/advanced-search">Búsqueda avanzada</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/transactions/summaries">Ver resúmenes</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reglas activas</CardDescription>
            <CardTitle className="text-3xl font-semibold">12</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Incluye modelos automáticos entrenados.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Movimientos automatizados</CardDescription>
            <CardTitle className="text-3xl font-semibold">2,430</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> 86% sin intervención manual
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasa de acierto</CardDescription>
            <CardTitle className="text-3xl font-semibold">93%</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="px-0" asChild>
              <Link href="/transactions/advanced-search">
                Revisa falsos positivos
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Última exportación</CardDescription>
            <CardTitle className="text-3xl font-semibold">Hace 3 h</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="gap-2">
              <Upload className="h-4 w-4" /> Exportar reglas
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <CardTitle>Constructor visual</CardTitle>
              <CardDescription>
                Diseña reglas arrastrando condiciones; guarda borradores y pruébalos sobre datos
                históricos.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nueva regla
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" /> Importar JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">Condiciones</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Descripción contiene</Badge>
                <Badge variant="outline">Monto mayor a</Badge>
                <Badge variant="outline">Canal de pago</Badge>
                <Badge variant="outline">Etiqueta existente</Badge>
              </div>
              <Textarea
                rows={4}
                value={"Descripción contiene 'Stripe'\nMonto mayor a 1000"}
                onChange={() => {
                  /* TODO: Reemplazar por actualización de la regla seleccionada desde el servicio real */
                }}
              />
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium text-muted-foreground">Acciones</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Categorizar</Badge>
                <Badge variant="secondary">Etiquetar</Badge>
                <Badge variant="secondary">Notificar</Badge>
              </div>
              <Input placeholder="Ej. Asignar categoría Ventas" defaultValue="Asignar categoría Ventas" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Probar contra últimos 30 días</Button>
            <Button variant="outline" size="sm">
              Guardar como borrador
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Motor de reglas</CardTitle>
              <CardDescription>
                Prioriza reglas, monitorea precisión y comparte configuraciones con tu equipo.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={searchTerm}
                onChange={(event) => {
                  setPage(1)
                  setSearchTerm(event.target.value)
                }}
                placeholder="Buscar por nombre de regla"
                className="w-full sm:w-60"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setPage(1)
                  setStatusFilter(value)
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
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
                {selectedRules.length > 0
                  ? `${selectedRules.length} reglas seleccionadas`
                  : "Seleccionar página actual"}
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={selectedRules.length === 0}>
                Publicar
              </Button>
              <Button variant="outline" size="sm" disabled={selectedRules.length === 0}>
                Duplicar
              </Button>
              <Button variant="default" size="sm" disabled={selectedRules.length === 0}>
                Ejecutar en lote
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Nombre</TableHead>
                <TableHead>Condiciones</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead className="text-right">Precisión</TableHead>
                <TableHead className="text-right">Última ejecución</TableHead>
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
                    Sin coincidencias para los filtros seleccionados.
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
              Página {page} de {totalPages} · {filteredRules.length} reglas
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
