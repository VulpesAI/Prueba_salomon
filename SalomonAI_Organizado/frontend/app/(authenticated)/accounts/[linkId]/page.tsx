import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, FileDown, Repeat } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getInstitutionById,
  getLinkedInstitutions,
  getRulesForInstitution,
  getSyncHistoryForInstitution,
} from "@/services/accounts"

type AccountDetailPageProps = {
  params: Promise<{ linkId: string }>
}

export function generateStaticParams() {
  return getLinkedInstitutions().map((institution) => ({
    linkId: encodeURIComponent(institution.id),
  }))
}

export default async function AccountDetailPage({
  params,
}: AccountDetailPageProps) {
  const { linkId } = await params
  const accountId = decodeURIComponent(linkId)
  const institution = getInstitutionById(accountId)

  if (!institution) {
    notFound()
  }

  const syncHistory = getSyncHistoryForInstitution(institution.id)
  const rules = getRulesForInstitution(institution.id)
  const totalBalance = institution.accounts.reduce(
    (acc, account) => acc + account.balance,
    0
  )

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value)

  const formatDateTime = (value?: string) =>
    value
      ? new Intl.DateTimeFormat("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value))
      : "-"

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Exitosa"
      case "error":
        return "Error"
      case "running":
        return "En progreso"
      default:
        return status
    }
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "checking":
        return "Corriente"
      case "savings":
        return "Ahorro"
      case "credit":
        return "Crédito"
      case "investment":
        return "Inversión"
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {institution.name}
          </h1>
          <p className="text-sm text-app-dim">
            Consulta información granular, conexiones y métricas históricas del enlace seleccionado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/accounts/balances">
              <FileDown className="mr-2 h-4 w-4" />
              Descargar cartola
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/accounts/synchronization">
              <Repeat className="mr-2 h-4 w-4" />
              Sincronizar ahora
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información principal</CardTitle>
            <CardDescription>
              Datos generales, institución, alias y estado de sincronización.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {institution.accounts.map((account) => (
                <div
                  key={account.id}
                  className="surface-tile bg-app-card/88 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{account.name}</h3>
                      <p className="text-xs text-app-dim">
                        {account.alias ?? "Sin alias"}
                      </p>
                    </div>
                    <Badge variant="outline">{getAccountTypeLabel(account.type)}</Badge>
                  </div>
                  <dl className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-app-dim">Número</dt>
                      <dd>{account.number}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-app-dim">Balance</dt>
                      <dd>{formatCurrency(account.balance)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-app-dim">Disponible</dt>
                      <dd>{formatCurrency(account.availableBalance)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-app-dim">Última sync</dt>
                      <dd>{formatDateTime(account.lastSyncedAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-app-dim">Actualizado</dt>
                      <dd>{formatDateTime(account.updatedAt)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen del enlace</CardTitle>
            <CardDescription>
              Estado general y próximos pasos para la institución.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="surface-tile border-dashed border-app-border-subtle/80 bg-app-card/85 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-app-dim">Estado</span>
                <Badge
                  variant={
                    institution.status === "degraded"
                      ? "destructive"
                      : institution.status === "syncing"
                        ? "outline"
                        : "default"
                  }
                >
                  {institution.status === "healthy"
                    ? "Sincronizada"
                    : institution.status === "degraded"
                      ? "Requiere atención"
                      : "Sincronizando"}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-app-dim">Última sync</span>
                <span>{formatDateTime(institution.lastSyncedAt)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-app-dim">Próxima ejecución</span>
                <span>{formatDateTime(institution.nextSyncAt)}</span>
              </div>
            </div>
            <div className="surface-tile border-dashed border-app-border-subtle/80 bg-app-card/85 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-app-dim">Cuentas</span>
                <span className="font-semibold">
                  {institution.accounts.length}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-app-dim">Balance agregado</span>
                <span className="font-semibold">
                  {formatCurrency(totalBalance)}
                </span>
              </div>
              <Button
                asChild
                variant="link"
                className="mt-3 h-auto justify-start px-0 text-sm"
              >
                <Link href="/accounts/balances">
                  Revisar evolución de saldos
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de sincronizaciones</CardTitle>
          <CardDescription>
            Eventos recientes, duración y mensajes de la API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead className="hidden md:table-cell">Duración</TableHead>
                <TableHead className="hidden lg:table-cell">Origen</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncHistory.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Badge
                      variant={
                        event.status === "success"
                          ? "default"
                          : event.status === "error"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {getStatusLabel(event.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(event.startedAt)}</TableCell>
                  <TableCell>{formatDateTime(event.completedAt)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {event.durationSeconds} seg
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-app-dim">{event.source}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-app-dim">{event.details}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas aplicadas</CardTitle>
          <CardDescription>
            Automatizaciones, etiquetas y límites configurados para esta cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="surface-tile bg-app-card/85 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{rule.name}</h3>
                    <p className="text-xs text-app-dim">{rule.target}</p>
                  </div>
                  <Badge variant={rule.status === "active" ? "default" : "outline"}>
                    {rule.status === "active" ? "Activa" : "Pausada"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-app-dim">
                  {rule.description}
                </p>
              </div>
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-app-dim">
                Aún no se han configurado reglas para esta institución.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
