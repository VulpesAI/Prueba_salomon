"use client"

import Link from "next/link"
import { ArrowUpRight, Building2, CircleDollarSign } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AccountTypeMiniDonut } from "@/components/accounts/AccountTypeMiniDonut"
import { ACCOUNT_COLOR_VARS, colorFromVar } from "@/lib/ui/account-colors"
import {
  getAccountTypeSummary,
  getInstitutionsSummary,
  getLinkedInstitutions,
  getQuickAccountActions,
} from "@/services/accounts"

export default function AccountsPage() {
  const institutions = getLinkedInstitutions()
  const summary = getInstitutionsSummary()
  const accountTypeSummary = getAccountTypeSummary()
  const actions = getQuickAccountActions()

  const distributionData = accountTypeSummary.filter((item) => item.accounts > 0)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value)

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value))

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "healthy":
        return "default"
      case "degraded":
        return "destructive"
      case "syncing":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cuentas vinculadas
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra instituciones conectadas, estados y saldos agregados.
          </p>
        </div>

        <Button asChild>
          <Link href="/accounts/synchronization?view=connect">
            Conectar cuenta
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Instituciones conectadas
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {summary.totalInstitutions}
            </div>
            <p className="text-xs text-app-dim">
              Bancos, wallets y emisores gestionados desde el espacio financiero.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas activas</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.totalAccounts}</div>
            <p className="text-xs text-app-dim">
              Incluye cuentas corrientes, ahorro, crédito y productos de inversión.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance agregado</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatCurrency(summary.totalBalance)}
            </div>
            <p className="text-xs text-app-dim">
              Actualizado según la última sincronización registrada en cada institución.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Instituciones</CardTitle>
              <CardDescription>
                Listado de bancos, wallets y emisores conectados al espacio financiero.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/accounts/synchronization">Ver sincronización</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institución</TableHead>
                  <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                  <TableHead className="hidden sm:table-cell">Última sync</TableHead>
                  <TableHead className="hidden lg:table-cell">Próxima sync</TableHead>
                  <TableHead className="text-right">Cuentas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.map((institution) => (
                  <TableRow key={institution.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/accounts/${encodeURIComponent(institution.id)}`}
                          className="font-medium hover:underline"
                        >
                          {institution.name}
                        </Link>
                        <span className="text-xs text-app-dim">
                          {institution.institutionType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-app-dim">
                        {institution.provider}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-app-dim">
                        {formatDateTime(institution.lastSyncedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-app-dim">
                        {formatDateTime(institution.nextSyncAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={getStatusVariant(institution.status)}>
                          {institution.status === "healthy"
                            ? "Sincronizada"
                            : institution.status === "degraded"
                              ? "Atención"
                              : "En curso"}
                        </Badge>
                        <span className="text-sm text-app-dim">
                          {institution.accounts.length} cuentas
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen por tipo</CardTitle>
            <CardDescription>
              Vista agrupada por cuentas corrientes, ahorro, crédito y otros productos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {distributionData.length > 0 ? (
              <AccountTypeMiniDonut data={distributionData} />
            ) : (
              <p className="text-sm text-app-dim">
                Aún no hay datos suficientes para mostrar el resumen por tipo.
              </p>
            )}

            <div className="space-y-2 text-sm">
              {accountTypeSummary.map((item) => {
                const colorVar = ACCOUNT_COLOR_VARS[item.type] ?? ACCOUNT_COLOR_VARS.checking
                const color = colorFromVar(colorVar)

                return (
                  <div
                    key={item.type}
                    className="surface-tile border-dashed border-app-border-subtle/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{item.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.balance)}</div>
                      <p className="text-xs text-app-dim">
                        {item.accounts} cuentas
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
          <CardDescription>
            Sincronización, desvinculación y validación de tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="surface-tile flex flex-col justify-between bg-app-card/85 p-5"
            >
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{action.title}</h3>
                <p className="text-sm text-app-dim">
                  {action.description}
                </p>
              </div>
              <Button asChild variant="ghost" className="self-start px-0">
                <Link href={action.href} className="flex items-center gap-1">
                  Ir ahora
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
