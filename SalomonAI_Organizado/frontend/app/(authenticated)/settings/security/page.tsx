"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useUserSessions } from "@/hooks/auth/use-user-sessions"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/intl"
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react"

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, "Ingresa tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "Debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Incluye al menos una mayúscula")
      .regex(/[0-9]/, "Incluye un número"),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function SettingsSecurityPage() {
  const [passwordStatus, setPasswordStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [mfaEnabled, setMfaEnabled] = React.useState(true)
  const [passkeyEnabled, setPasskeyEnabled] = React.useState(false)

  const { toast } = useToast()
  const {
    sessions,
    isLoading: isLoadingSessions,
    error: sessionsError,
    revoke: revokeSession,
    isRevoking: isRevokingSession,
    activeRevocation,
    refresh: refreshSessions,
    apiBaseUrl: sessionsApiBaseUrl,
  } = useUserSessions()

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordStatus("idle")
    try {
      // TODO: Conectar con API para actualizar la contraseña.
      void values.newPassword
      await new Promise((resolve) => setTimeout(resolve, 400))
      setPasswordStatus("success")
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Error al actualizar la contraseña", error)
      setPasswordStatus("error")
    }
  }

  const handleSessionRevoke = async (sessionId: string) => {
    try {
      await revokeSession(sessionId)
      toast({
        title: "Sesión revocada",
        description: "Cerramos la sesión seleccionada correctamente.",
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No pudimos revocar la sesión. Intenta nuevamente."
      toast({
        title: "Error al revocar la sesión",
        description: message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Contraseña y acceso</CardTitle>
          <CardDescription>
            Actualiza tu contraseña regularmente y mantén protegido tu acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-6"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña actual</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Necesaria para confirmar que eres tú.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Usa al menos 8 caracteres, un número y una mayúscula.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Debe coincidir exactamente con la nueva contraseña.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardFooter className="flex flex-col items-start gap-2 px-0">
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
                {passwordStatus === "success" && (
                  <p className="text-sm text-green-600">Tu contraseña se actualizó correctamente.</p>
                )}
                {passwordStatus === "error" && (
                  <p className="text-sm text-destructive">
                    Hubo un problema al actualizar. Revisa tu conexión e inténtalo de nuevo.
                  </p>
                )}
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Autenticación multifactor</CardTitle>
            <CardDescription>
              Agrega un segundo factor para reforzar tu seguridad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="font-medium">MFA con app autenticadora</p>
                <p className="text-sm text-muted-foreground">
                  Escanea un código QR con Google Authenticator, 1Password u otro gestor.
                </p>
              </div>
              <Switch
                checked={mfaEnabled}
                onCheckedChange={(checked) => {
                  setMfaEnabled(checked)
                  // TODO: Consumir API para activar/desactivar MFA TOTP.
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="font-medium">Llaves de seguridad / Passkeys</p>
                <p className="text-sm text-muted-foreground">
                  Usa Face ID, Touch ID o una llave física compatible con FIDO2.
                </p>
              </div>
              <Switch
                checked={passkeyEnabled}
                onCheckedChange={(checked) => {
                  setPasskeyEnabled(checked)
                  // TODO: Integrar registro de passkeys con WebAuthn.
                }}
              />
            </div>
            <Button variant="outline" className="w-full">
              Administrar métodos de recuperación
            </Button>
            <p className="text-sm text-muted-foreground">
              Encuentra alertas y eventos críticos en el{" "}
              <Link className="font-medium text-primary underline" href="/alerts">
                centro de alertas
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Dispositivos y sesiones activas</CardTitle>
              <CardDescription>
                Revoca accesos sospechosos o cierra sesiones que no reconozcas.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => refreshSessions()}
              disabled={isLoadingSessions}
            >
              <RefreshCcw className="h-4 w-4" /> Actualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionsError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No pudimos cargar tus sesiones</AlertTitle>
                <AlertDescription>
                  {sessionsError}. Verifica la conexión con {`${sessionsApiBaseUrl}/auth/sessions`} e
                  inténtalo nuevamente.
                </AlertDescription>
              </Alert>
            ) : null}

            {isLoadingSessions ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={`session-skeleton-${index}`} className="h-14 w-full" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
                No encontramos sesiones activas. Al iniciar sesión desde un nuevo dispositivo aparecerá{" "}
                en este listado.
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {sessions.map((session) => {
                  const locationParts = [session.city, session.country].filter(Boolean)
                  const locationLabel = locationParts.length
                    ? locationParts.join(", ")
                    : session.ipAddress ?? "Ubicación no disponible"
                  const lastActiveLabel = session.lastActiveAt
                    ? formatDateTime(session.lastActiveAt, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Sin registros"
                  const deviceLabel = session.device ?? "Dispositivo desconocido"
                  const isCurrent = session.isCurrent ?? false
                  const isPendingRevocation = isRevokingSession && activeRevocation === session.id

                  return (
                    <AccordionItem key={session.id} value={session.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{deviceLabel}</span>
                            {isCurrent ? <Badge variant="secondary">Sesión actual</Badge> : null}
                          </div>
                          <span className="text-sm text-muted-foreground">{locationLabel}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-4 text-sm">
                        <p>
                          <span className="font-medium">Ubicación estimada:</span> {locationLabel}
                        </p>
                        {session.ipAddress ? (
                          <p>
                            <span className="font-medium">IP de origen:</span> {session.ipAddress}
                          </p>
                        ) : null}
                        <p>
                          <span className="font-medium">Última actividad:</span> {lastActiveLabel}
                        </p>
                        {session.userAgent ? (
                          <p className="break-words text-muted-foreground">
                            <span className="font-medium text-foreground">Agente:</span> {session.userAgent}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isPendingRevocation}
                            onClick={() => handleSessionRevoke(session.id)}
                            className="gap-2"
                          >
                            {isPendingRevocation ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Revocando...
                              </>
                            ) : (
                              "Revocar acceso"
                            )}
                          </Button>
                          <Button type="button" variant="ghost" className="text-muted-foreground">
                            Marcar como dispositivo de confianza
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
