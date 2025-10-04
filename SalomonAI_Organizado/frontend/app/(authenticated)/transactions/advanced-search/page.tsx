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

const mockResults = [
  {
    id: "res-001",
    description: "Factura proveedor logística",
    date: "2024-03-10",
    amount: -7890.22,
    category: "Operaciones",
  },
  {
    id: "res-002",
    description: "Pago SaaS analítica",
    date: "2024-03-08",
    amount: -950.0,
    category: "Tecnología",
  },
  {
    id: "res-003",
    description: "Retiro de caja chica",
    date: "2024-03-07",
    amount: -3000.0,
    category: "Operaciones",
  },
  {
    id: "res-004",
    description: "Pago póliza seguros",
    date: "2024-03-05",
    amount: -2200.0,
    category: "Administración",
  },
  {
    id: "res-005",
    description: "Pago servicios nube",
    date: "2024-03-03",
    amount: -1800.0,
    category: "Tecnología",
  },
]

const savedSegments = [
  { id: "seg-1", name: "Gastos mayores a 5k", owner: "Finanzas", updatedAt: "Hace 2 h" },
  { id: "seg-2", name: "Ingresos enterprise", owner: "Ventas", updatedAt: "Ayer" },
  { id: "seg-3", name: "Pagos recurrentes SaaS", owner: "Operaciones", updatedAt: "Hace 4 días" },
]

const conditionFields = ["Monto", "Descripción", "Categoría", "Canal", "Etiqueta", "Fecha"]
const operators = [">", "<", "=", "contiene", "no contiene", "entre"]

export default function TransactionsAdvancedSearchPage() {
  const [conditions, setConditions] = useState([
    { id: "cond-1", field: "Monto", operator: ">", value: "5000" },
    { id: "cond-2", field: "Categoría", operator: "no contiene", value: "Ventas" },
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
          <h1 className="text-3xl font-semibold tracking-tight">Búsqueda avanzada</h1>
          <p className="text-muted-foreground">
            Construye consultas complejas para analizar patrones y aplicar acciones masivas en tus
            movimientos.
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
            <Link href="/transactions/summaries">Ver resúmenes</Link>
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" /> Exportar resultados
          </Button>
        </div>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <CardTitle>Constructor visual</CardTitle>
              <CardDescription>
                Define condiciones con lógica combinada; guarda vistas reutilizables y compártelas con
                tu equipo.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={logicOperator}
                onValueChange={(value: "AND" | "OR") => setLogicOperator(value)}
              >
                <SelectTrigger className="w-32" aria-label="Operador lógico">
                  <SelectValue placeholder="Operador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">Cumplir todas</SelectItem>
                  <SelectItem value="OR">Cumplir alguna</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-2" onClick={addCondition}>
                <Plus className="h-4 w-4" /> Agregar condición
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Save className="h-4 w-4" /> Guardar vista
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
                  <SelectTrigger aria-label="Campo" className="w-full">
                    <SelectValue placeholder="Campo" />
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
                  <SelectTrigger aria-label="Operador" className="w-full">
                    <SelectValue placeholder="Operador" />
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
                  placeholder="Valor"
                />
                <Button variant="ghost" size="icon" onClick={() => removeCondition(condition.id)}>
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
          />
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Segmentos guardados</CardTitle>
            <CardDescription>
              Reactiva vistas frecuentes, comparte con áreas interesadas y controla sus permisos.
            </CardDescription>
          </div>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/transactions/summaries">
              Ver resumen asociado
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
                  Propietario: {segment.owner} · {segment.updatedAt}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <Button variant="ghost" className="gap-2 px-0" asChild>
                  <Link href="/transactions">
                    Abrir
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="sm">
                  Compartir
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
              <CardTitle>Resultados</CardTitle>
              <CardDescription>
                Aplica etiquetas, ejecuta reglas y exporta los hallazgos a tus herramientas analíticas.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                Aplicar etiqueta
              </Button>
              <Button variant="outline" size="sm" disabled={selectedRows.length === 0}>
                Ejecutar regla
              </Button>
              <Button variant="default" size="sm" disabled={selectedRows.length === 0}>
                Crear exportación
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
              {selectedRows.length > 0
                ? `${selectedRows.length} movimientos seleccionados`
                : "Seleccionar página actual"}
            </label>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Monto</TableHead>
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
                      {new Date(result.date).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {result.amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                    </TableCell>
                  </TableRow>
                )
              })}
              {paginatedResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Ajusta el constructor para obtener resultados.
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
              Página {page} de {totalPages} · {filteredResults.length} coincidencias
            </div>
          </Pagination>
        </CardContent>
      </Card>
    </div>
  )
}
