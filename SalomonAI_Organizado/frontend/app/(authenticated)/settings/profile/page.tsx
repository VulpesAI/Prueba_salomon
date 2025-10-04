"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { ManualStatementUploadCard } from "@/components/authenticated/manual-statement-upload-card"
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
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Ingresa al menos 2 caracteres")
    .max(120, "Nombre demasiado largo"),
  email: z.string().email("Ingresa un correo válido"),
  phone: z
    .string()
    .min(8, "El teléfono debe tener al menos 8 dígitos")
    .max(20, "Verifica el teléfono"),
  taxId: z.string().optional(),
})

const preferencesSchema = z.object({
  language: z.string().min(2, "Selecciona un idioma"),
  currency: z.string().min(1, "Selecciona una moneda"),
  timezone: z.string().min(2, "Selecciona una zona horaria"),
  weeklyDigest: z.boolean().default(true),
  betaAccess: z.boolean().default(false),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PreferencesFormValues = z.infer<typeof preferencesSchema>

const integrationsCatalogue = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincroniza eventos financieros con tu agenda personal.",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Envía resúmenes diarios a tu espacio de trabajo.",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Comparte actividades relevantes con tu CRM.",
  },
]

export default function SettingsProfilePage() {
  const [profileStatus, setProfileStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [preferencesStatus, setPreferencesStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [connectedIntegrations, setConnectedIntegrations] = React.useState<
    Record<string, boolean>
  >({
    "google-calendar": true,
    notion: false,
    hubspot: false,
  })

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "María González",
      email: "maria@empresa.com",
      phone: "+52 55 1234 5678",
      taxId: "MAGO850101XX1",
    },
  })

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: "Español (Latam)",
      currency: "MXN",
      timezone: "GMT-6 Ciudad de México",
      weeklyDigest: true,
      betaAccess: false,
    },
  })

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    setProfileStatus("idle")
    try {
      // TODO: Conectar con el endpoint real para actualizar el perfil.
      await new Promise((resolve) => setTimeout(resolve, 400))
      profileForm.reset(values)
      setProfileStatus("success")
    } catch (error) {
      console.error("Error al actualizar el perfil", error)
      setProfileStatus("error")
    }
  }

  const handlePreferencesSubmit = async (values: PreferencesFormValues) => {
    setPreferencesStatus("idle")
    try {
      // TODO: Conectar con el endpoint real para guardar preferencias.
      await new Promise((resolve) => setTimeout(resolve, 400))
      preferencesForm.reset(values)
      setPreferencesStatus("success")
    } catch (error) {
      console.error("Error al guardar preferencias", error)
      setPreferencesStatus("error")
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
            <CardDescription>
              Actualiza los datos que se utilizan en documentos y resúmenes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={profileForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Como aparecerá en los reportes" {...field} />
                      </FormControl>
                      <FormDescription>
                        Usa tu nombre legal para facturación.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="nombre@empresa.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lo utilizaremos para enviarte confirmaciones y alertas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. +52 55 0000 0000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Usado para verificaciones críticas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RFC / ID fiscal (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresa tu RFC si necesitas facturas" {...field} />
                      </FormControl>
                      <FormDescription>
                        Se incluirá en CFDIs y reportes fiscales.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <CardFooter className="flex flex-col items-start gap-2 px-0">
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
                  </Button>
                  {profileStatus === "success" && (
                    <p className="text-sm text-green-600">Perfil actualizado correctamente.</p>
                  )}
                  {profileStatus === "error" && (
                    <p className="text-sm text-destructive">
                      No pudimos guardar los cambios. Intenta nuevamente.
                    </p>
                  )}
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferencias de producto</CardTitle>
            <CardDescription>
              Define cómo quieres que mostremos saldos, fechas y novedades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...preferencesForm}>
              <form
                onSubmit={preferencesForm.handleSubmit(handlePreferencesSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={preferencesForm.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idioma</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Español" {...field} />
                      </FormControl>
                      <FormDescription>
                        Afecta a reportes, correos y asistentes en pantalla.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={preferencesForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda predeterminada</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. MXN, USD" {...field} />
                      </FormControl>
                      <FormDescription>
                        Se usa para normalizar saldos multi-moneda.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={preferencesForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zona horaria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. GMT-6" {...field} />
                      </FormControl>
                      <FormDescription>
                        Determina el corte de tus reportes diarios.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <FormField
                    control={preferencesForm.control}
                    name="weeklyDigest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Resúmenes semanales</FormLabel>
                          <FormDescription>
                            Recibe un resumen consolidado de resultados cada lunes.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={preferencesForm.control}
                    name="betaAccess"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Acceso a funciones beta</FormLabel>
                          <FormDescription>
                            Prueba integraciones y reportes antes de su lanzamiento.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <CardFooter className="flex flex-col items-start gap-2 px-0">
                  <Button type="submit" disabled={preferencesForm.formState.isSubmitting}>
                    {preferencesForm.formState.isSubmitting
                      ? "Guardando..."
                      : "Actualizar preferencias"}
                  </Button>
                  {preferencesStatus === "success" && (
                    <p className="text-sm text-green-600">
                      Preferencias actualizadas correctamente.
                    </p>
                  )}
                  {preferencesStatus === "error" && (
                    <p className="text-sm text-destructive">
                      Ocurrió un error al guardar. Intenta nuevamente más tarde.
                    </p>
                  )}
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integraciones personales</CardTitle>
          <CardDescription>
            Controla qué herramientas externas pueden acceder a tu información.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="multiple" className="w-full">
            {integrationsCatalogue.map((integration) => (
              <AccordionItem key={integration.id} value={integration.id}>
                <AccordionTrigger>{integration.name}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {connectedIntegrations[integration.id]
                          ? "Integración activa"
                          : "Integración desactivada"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {connectedIntegrations[integration.id]
                          ? "Tus datos se sincronizan automáticamente."
                          : "Actívala para comenzar a compartir datos."}
                      </p>
                    </div>
                    <Switch
                      checked={connectedIntegrations[integration.id]}
                      onCheckedChange={(checked) => {
                        setConnectedIntegrations((prev) => ({
                          ...prev,
                          [integration.id]: checked,
                        }))
                        // TODO: Conectar con API para activar/desactivar integraciones.
                      }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <ManualStatementUploadCard />
    </div>
  )
}
