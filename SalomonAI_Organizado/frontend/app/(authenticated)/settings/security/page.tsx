"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

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
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

const activeSessions = [
  {
    id: "session-1",
    device: "MacBook Pro",
    location: "Ciudad de México, MX",
    lastActive: "Hace 2 horas",
  },
  {
    id: "session-2",
    device: "iPhone 15",
    location: "Guadalajara, MX",
    lastActive: "Hace 1 día",
  },
]

export default function SettingsSecurityPage() {
  const [passwordStatus, setPasswordStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [mfaEnabled, setMfaEnabled] = React.useState(true)
  const [passkeyEnabled, setPasskeyEnabled] = React.useState(false)
  const [revokedSessions, setRevokedSessions] = React.useState<string[]>([])

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

  const handleSessionRevoke = (sessionId: string) => {
    setRevokedSessions((prev) => [...prev, sessionId])
    // TODO: Llamar API para revocar sesión específica.
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
              <Link className="font-medium text-primary underline" href="/(authenticated)/alerts">
                centro de alertas
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispositivos y sesiones activas</CardTitle>
            <CardDescription>
              Revoca accesos sospechosos o cierra sesiones que no reconozcas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {activeSessions.map((session) => {
                const isRevoked = revokedSessions.includes(session.id)
                return (
                  <AccordionItem key={session.id} value={session.id}>
                    <AccordionTrigger className="text-left">
                      {session.device} · {isRevoked ? "Sesión revocada" : session.location}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-4 text-sm">
                      <p>
                        <span className="font-medium">Ubicación estimada:</span> {session.location}
                      </p>
                      <p>
                        <span className="font-medium">Última actividad:</span> {session.lastActive}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isRevoked}
                          onClick={() => handleSessionRevoke(session.id)}
                        >
                          {isRevoked ? "Sesión revocada" : "Revocar acceso"}
                        </Button>
                        <Button type="button" variant="ghost">
                          Marcar como dispositivo de confianza
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
