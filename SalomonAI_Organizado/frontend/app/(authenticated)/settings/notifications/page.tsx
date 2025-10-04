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
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

const digestSchema = z.object({
  summaryName: z.string().min(3, "Escribe un nombre descriptivo"),
  frequency: z.string().min(1, "Define la frecuencia"),
  sendTime: z.string().min(1, "Selecciona un horario"),
  recipients: z.string().min(3, "Indica al menos un destinatario"),
})

const channelsSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  sms: z.boolean(),
  inApp: z.boolean(),
})

type DigestFormValues = z.infer<typeof digestSchema>
type ChannelsFormValues = z.infer<typeof channelsSchema>

const templateCatalogue = [
  {
    id: "weekly-overview",
    name: "Resumen semanal",
    helper: "Enviado cada lunes con KPI principales.",
  },
  {
    id: "cash-alert",
    name: "Alerta de flujo de caja",
    helper: "Dispara cuando el saldo cae por debajo del umbral.",
  },
  {
    id: "closing-reminder",
    name: "Recordatorio de cierre mensual",
    helper: "Enviado tres días antes del corte contable.",
  },
]

export default function SettingsNotificationsPage() {
  const [digestStatus, setDigestStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [channelsStatus, setChannelsStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [templateSubjects, setTemplateSubjects] = React.useState<Record<string, string>>({
    "weekly-overview": "Resumen semanal de SalomonAI",
    "cash-alert": "Alerta de flujo de caja",
    "closing-reminder": "Recordatorio de cierre mensual",
  })
  const [templateStatus, setTemplateStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")

  const digestForm = useForm<DigestFormValues>({
    resolver: zodResolver(digestSchema),
    defaultValues: {
      summaryName: "Resumen ejecutivo",
      frequency: "Semanal (lunes)",
      sendTime: "09:00",
      recipients: "finanzas@empresa.com",
    },
  })

  const channelsForm = useForm<ChannelsFormValues>({
    resolver: zodResolver(channelsSchema),
    defaultValues: {
      email: true,
      push: true,
      sms: false,
      inApp: true,
    },
  })

  const handleDigestSubmit = async (values: DigestFormValues) => {
    setDigestStatus("idle")
    try {
      // TODO: Conectar con API de programación de resúmenes.
      await new Promise((resolve) => setTimeout(resolve, 400))
      digestForm.reset(values)
      setDigestStatus("success")
    } catch (error) {
      console.error("Error al configurar el resumen", error)
      setDigestStatus("error")
    }
  }

  const handleChannelsSubmit = async (values: ChannelsFormValues) => {
    setChannelsStatus("idle")
    try {
      // TODO: Persistir canales activos contra preferencias del usuario.
      await new Promise((resolve) => setTimeout(resolve, 400))
      channelsForm.reset(values)
      setChannelsStatus("success")
    } catch (error) {
      console.error("Error al guardar canales", error)
      setChannelsStatus("error")
    }
  }

  const handleTemplateSave = async () => {
    setTemplateStatus("idle")
    try {
      // TODO: Enviar actualización de plantillas personalizadas a la API.
      await new Promise((resolve) => setTimeout(resolve, 400))
      setTemplateStatus("success")
    } catch (error) {
      console.error("Error al guardar plantillas", error)
      setTemplateStatus("error")
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Resúmenes programados</CardTitle>
          <CardDescription>
            Define la cadencia y destinatarios de tus reportes automáticos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...digestForm}>
            <form
              onSubmit={digestForm.handleSubmit(handleDigestSubmit)}
              className="space-y-6"
            >
              <FormField
                control={digestForm.control}
                name="summaryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del resumen</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Directorio semanal" {...field} />
                    </FormControl>
                    <FormDescription>
                      Aparecerá como título en los correos y notificaciones.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={digestForm.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Semanal, Diario" {...field} />
                    </FormControl>
                    <FormDescription>
                      Puedes indicar días específicos o periodos personalizados.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={digestForm.control}
                name="sendTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario de envío</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription>
                      Considera la zona horaria configurada en tu perfil.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={digestForm.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destinatarios</FormLabel>
                    <FormControl>
                      <Input placeholder="Correos separados por coma" {...field} />
                    </FormControl>
                    <FormDescription>
                      Puedes incluir listas de distribución o alias internos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardFooter className="flex flex-col items-start gap-2 px-0">
                <Button type="submit" disabled={digestForm.formState.isSubmitting}>
                  {digestForm.formState.isSubmitting
                    ? "Guardando..."
                    : "Configurar resumen"}
                </Button>
                {digestStatus === "success" && (
                  <p className="text-sm text-green-600">
                    Resumen programado actualizado correctamente.
                  </p>
                )}
                {digestStatus === "error" && (
                  <p className="text-sm text-destructive">
                    Ocurrió un problema al guardar la programación.
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
            <CardTitle>Canales de entrega</CardTitle>
            <CardDescription>
              Activa los canales donde deseas recibir alertas y resúmenes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...channelsForm}>
              <form
                onSubmit={channelsForm.handleSubmit(handleChannelsSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={channelsForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-base">Correo electrónico</FormLabel>
                        <FormDescription>
                          Ideal para reportes detallados y adjuntos.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={channelsForm.control}
                  name="push"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-base">Push móvil</FormLabel>
                        <FormDescription>
                          Recibe notificaciones inmediatas en tu app.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={channelsForm.control}
                  name="sms"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-base">SMS</FormLabel>
                        <FormDescription>
                          Útil para contingencias y notificaciones críticas.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={channelsForm.control}
                  name="inApp"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-base">Centro de notificaciones</FormLabel>
                        <FormDescription>
                          Conserva un historial completo dentro de la plataforma.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <CardFooter className="flex flex-col items-start gap-2 px-0">
                  <Button type="submit" disabled={channelsForm.formState.isSubmitting}>
                    {channelsForm.formState.isSubmitting ? "Guardando..." : "Guardar canales"}
                  </Button>
                  {channelsStatus === "success" && (
                    <p className="text-sm text-green-600">
                      Preferencias de canales actualizadas.
                    </p>
                  )}
                  {channelsStatus === "error" && (
                    <p className="text-sm text-destructive">
                      No pudimos guardar tus canales. Intenta nuevamente.
                    </p>
                  )}
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plantillas personalizadas</CardTitle>
            <CardDescription>
              Ajusta el asunto con el que llegan tus mensajes recurrentes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {templateCatalogue.map((template) => (
                <AccordionItem key={template.id} value={template.id}>
                  <AccordionTrigger>{template.name}</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">{template.helper}</p>
                    <Input
                      value={templateSubjects[template.id] ?? ""}
                      onChange={(event) =>
                        setTemplateSubjects((prev) => ({
                          ...prev,
                          [template.id]: event.target.value,
                        }))
                      }
                      placeholder="Asunto del mensaje"
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="flex flex-col items-start gap-2">
              <Button type="button" onClick={handleTemplateSave}>
                Guardar plantillas
              </Button>
              {templateStatus === "success" && (
                <p className="text-sm text-green-600">
                  Plantillas actualizadas correctamente.
                </p>
              )}
              {templateStatus === "error" && (
                <p className="text-sm text-destructive">
                  No se pudo guardar tu personalización, intenta de nuevo.
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Revisa el historial completo en el{" "}
              <Link className="font-medium text-primary underline" href="/(authenticated)/notifications">
                centro de notificaciones
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
