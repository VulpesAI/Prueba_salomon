"use client"

import Link from "next/link"
import { ArrowUpRight, LineChart } from "lucide-react"

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
import { HistoricalSeries } from "@/components/accounts/HistoricalSeries"
import { ACCOUNT_COLOR_VARS, colorFromVar } from "@/lib/ui/account-colors"
import {
  getBalanceAlerts,
  getBalanceComparisons,
  getBalanceHistory,
  getAccountTypeSummary,
} from "@/services/accounts"

export default function AccountBalancesPage() {
  const balanceHistory = getBalanceHistory()
  const comparisons = getBalanceComparisons()
  const alerts = getBalanceAlerts()
  const typeSummary = getAccountTypeSummary()

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value)

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
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
            Evolución de saldos
          </h1>
          <p className="text-sm text-muted-foreground">
            Analiza tendencias de saldos y proyecciones por institución o cuenta.
          </p>
        </div>

        <Button asChild>
          <Link href="/accounts/synchronization">
            <LineChart className="mr-2 h-4 w-4" />
            Ajustar sincronización
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen histórico</CardTitle>
          <CardDescription>
            Serie temporal consolidada con intervalos personalizables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoricalSeries data={balanceHistory} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Comparativo entre cuentas</CardTitle>
              <CardDescription>
                Visualiza la participación porcentual de cada cuenta en tu patrimonio.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/accounts">
                Ver todas las cuentas
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Institución</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">
                    Variación 30d
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((account) => (
                  <TableRow key={account.accountId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/accounts/${encodeURIComponent(account.institutionId)}`}
                          className="font-medium hover:underline"
                        >
                          {account.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {account.institution}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {getAccountTypeLabel(account.type)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {account.institution}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(account.balance)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right">
                      <span
                        className={
                          account.change30d >= 0
                            ? "text-sm font-medium text-app-success"
                            : "text-sm font-medium text-app-danger"
                        }
                      >
                        {account.change30d >= 0 ? "+" : ""}
                        {(account.change30d * 100).toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución actual</CardTitle>
            <CardDescription>
              Composición del saldo total por tipo de cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeSummary.map((item) => {
              const colorVar = ACCOUNT_COLOR_VARS[item.type] ?? ACCOUNT_COLOR_VARS.checking
              const color = colorFromVar(colorVar)

              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between rounded-lg border border-dashed border-border/60 px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {item.label}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(item.balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.accounts} cuentas
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de variación</CardTitle>
          <CardDescription>
            Configura umbrales para detectar cambios abruptos en saldos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex flex-col justify-between rounded-lg border border-border/60 bg-muted/30 p-4"
            >
              <div className="space-y-2">
                <Badge variant={getSeverityVariant(alert.severity)}>
                  {alert.severity === "high"
                    ? "Alta"
                    : alert.severity === "medium"
                      ? "Media"
                      : "Baja"}
                </Badge>
                <h3 className="text-sm font-semibold">{alert.title}</h3>
                <p className="text-sm text-muted-foreground">{alert.description}</p>
              </div>
              <Button asChild variant="link" className="mt-3 h-auto justify-start px-0 text-sm">
                <Link href={alert.href}>
                  Revisar
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
