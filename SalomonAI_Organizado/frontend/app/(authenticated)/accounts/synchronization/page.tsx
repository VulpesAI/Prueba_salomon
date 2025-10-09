"use client"

import Link from "next/link"
import { ArrowUpRight, LinkIcon, RefreshCcw } from "lucide-react"

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
import {
  getLinkedInstitutions,
  getSyncDiagnostics,
  getSynchronizationJobs,
} from "@/services/accounts"

export default function AccountSynchronizationPage() {
  const institutions = getLinkedInstitutions()
  const jobs = getSynchronizationJobs()
  const diagnostics = getSyncDiagnostics()

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "healthy":
        return "Sincronizada"
      case "degraded":
        return "Requiere atención"
      case "syncing":
        return "Sincronizando"
      default:
        return status
    }
  }

  const getJobVariant = (status: string) => {
    switch (status) {
      case "success":
        return "default"
      case "error":
        return "destructive"
      case "running":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getJobLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Completa"
      case "error":
        return "Error"
      case "running":
        return "En progreso"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sincronización de cuentas
          </h1>
          <p className="text-sm text-app-dim">
            Monitorea el estado de cada enlace, los jobs ejecutados y los próximos pasos.
          </p>
        </div>

        <Button asChild>
          <Link href="/accounts?connect=new">
            <LinkIcon className="mr-2 h-4 w-4" />
            Conectar institución
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estados por institución</CardTitle>
          <CardDescription>
            Tabla con última actualización, latencia y token vigente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institución</TableHead>
                <TableHead className="hidden md:table-cell">Proveedor</TableHead>
                <TableHead className="hidden lg:table-cell">Próxima sync</TableHead>
                <TableHead>Última sync</TableHead>
                <TableHead className="text-right">Estado</TableHead>
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
                        {institution.accounts.length} cuentas
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-app-dim">
                      {institution.provider}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-app-dim">
                      {formatDateTime(institution.nextSyncAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-app-dim">
                      {formatDateTime(institution.lastSyncedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getStatusVariant(institution.status)}>
                      {getStatusLabel(institution.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Jobs recientes</CardTitle>
            <CardDescription>
              Detalle de sincronizaciones exitosas, fallidas y reintentos en cola.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/accounts">
              Ver cuentas vinculadas
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead className="hidden md:table-cell">Institución</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead className="hidden lg:table-cell">Duración</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{job.accountName}</span>
                      <span className="text-xs text-app-dim">
                        {job.message}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      href={`/accounts/${encodeURIComponent(job.institutionId)}`}
                      className="text-sm text-app-dim hover:text-app hover:underline"
                    >
                      {institutions.find((item) => item.id === job.institutionId)?.name ?? job.institutionId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-app-dim">
                      {formatDateTime(job.startedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {job.completedAt
                      ? `${job.durationSeconds} seg`
                      : "En curso"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getJobVariant(job.status)}>
                      {getJobLabel(job.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico y soporte</CardTitle>
          <CardDescription>
            Checklist de verificación, logs y contacto directo con soporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {diagnostics.map((item) => (
            <div
              key={item.id}
              className="surface-tile flex flex-col justify-between bg-app-card/85 p-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <Badge
                    variant={
                      item.status === "ok"
                        ? "default"
                        : item.status === "attention"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {item.status === "ok"
                      ? "OK"
                      : item.status === "attention"
                        ? "Atención"
                        : "Pendiente"}
                  </Badge>
                </div>
                <p className="text-sm text-app-dim">{item.description}</p>
              </div>
              {item.action && (
                <Button
                  asChild
                  variant="link"
                  className="mt-3 h-auto justify-start px-0 text-sm"
                >
                  <Link href="/accounts/synchronization">
                    {item.action}
                    <RefreshCcw className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
