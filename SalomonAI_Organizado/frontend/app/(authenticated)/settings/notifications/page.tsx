"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useNotificationSettings } from "@/hooks/dashboard/use-notification-settings"
import { useToast } from "@/hooks/use-toast"

import { esCL } from "@/i18n/es-CL"

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

const notificationsCopy = esCL.settings.notifications
const digestCopy = notificationsCopy.digests
const channelsCopy = notificationsCopy.channels
const templatesCopy = notificationsCopy.templates
const templateCatalogue = templatesCopy.items
const templateDefaults = Object.fromEntries(
  templateCatalogue.map((template) => [template.id, template.defaultSubject ?? ""])
) as Record<string, string>

export default function SettingsNotificationsPage() {
  const [digestStatus, setDigestStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [channelsStatus, setChannelsStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [templateSubjects, setTemplateSubjects] = React.useState<Record<string, string>>(templateDefaults)
  const [templateStatus, setTemplateStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")

  const { toast } = useToast()
  const {
    settings,
    isLoading: isLoadingSettings,
    error: settingsError,
    updateDigest,
    updateChannels,
    updateTemplates,
    apiBaseUrl,
    isSavingDigest,
    isSavingChannels,
    isSavingTemplates,
  } = useNotificationSettings()

  const digestForm = useForm<DigestFormValues>({
    resolver: zodResolver(digestSchema),
    defaultValues: {
      summaryName: digestCopy.defaults.name,
      frequency: digestCopy.defaults.frequency,
      sendTime: digestCopy.defaults.time,
      recipients: digestCopy.defaults.recipients,
    },
  })

  const channelsForm = useForm<ChannelsFormValues>({
    resolver: zodResolver(channelsSchema),
    defaultValues: {
      email: channelsCopy.defaults.email,
      push: channelsCopy.defaults.push,
      sms: channelsCopy.defaults.sms,
      inApp: channelsCopy.defaults.inApp,
    },
  })

  const resolvedTemplates = React.useMemo(() => {
    if (settings?.templates) {
      return settings.templates.map((template) => {
        const fallback = templateCatalogue.find((item) => item.id === template.id)
        return {
          id: template.id,
          name: template.name ?? fallback?.name ?? template.id,
          helper: fallback?.helper ?? templatesCopy.description,
        }
      })
    }

    return templateCatalogue.map((template) => ({
      id: template.id,
      name: template.name,
      helper: template.helper,
    }))
  }, [settings?.templates])

  React.useEffect(() => {
    if (!settings?.digest) {
      return
    }

    const recipients = settings.digest.recipients.join(", ")
    digestForm.reset({
      summaryName: settings.digest.summaryName,
      frequency: settings.digest.frequency,
      sendTime: settings.digest.sendTime,
      recipients,
    })
    setDigestStatus("idle")
  }, [settings?.digest, digestForm])

  React.useEffect(() => {
    if (!settings?.channels) {
      return
    }

    channelsForm.reset({
      email: settings.channels.email,
      push: settings.channels.push,
      sms: settings.channels.sms,
      inApp: settings.channels.inApp,
    })
    setChannelsStatus("idle")
  }, [settings?.channels, channelsForm])

  React.useEffect(() => {
    if (!settings?.templates) {
      return
    }

    setTemplateSubjects(() => {
      const nextSubjects: Record<string, string> = { ...templateDefaults }
      for (const template of settings.templates) {
        nextSubjects[template.id] = template.subject
      }
      return nextSubjects
    })
    setTemplateStatus("idle")
  }, [settings?.templates])

  const handleDigestSubmit = async (values: DigestFormValues) => {
    setDigestStatus("idle")
    try {
      const recipients = values.recipients
        .split(",")
        .map((recipient) => recipient.trim())
        .filter(Boolean)

      await updateDigest({
        summaryName: values.summaryName,
        frequency: values.frequency,
        sendTime: values.sendTime,
        recipients,
      })

      digestForm.reset({ ...values, recipients: recipients.join(", ") })
      setDigestStatus("success")
      toast({
        title: "Resumen actualizado",
        description: "Guardamos tu programación de notificaciones por correo.",
      })
    } catch (error) {
      console.error("Error al configurar el resumen", error)
      setDigestStatus("error")
      const message =
        error instanceof Error
          ? error.message
          : `No pudimos sincronizar con ${apiBaseUrl}/dashboard/notifications/digest.`
      toast({
        title: "No pudimos guardar el resumen",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleChannelsSubmit = async (values: ChannelsFormValues) => {
    setChannelsStatus("idle")
    try {
      await updateChannels(values)
      channelsForm.reset(values)
      setChannelsStatus("success")
      toast({
        title: "Preferencias actualizadas",
        description: "Aplicamos tus canales de notificación preferidos.",
      })
    } catch (error) {
      console.error("Error al guardar canales", error)
      setChannelsStatus("error")
      const message =
        error instanceof Error
          ? error.message
          : `No pudimos sincronizar con ${apiBaseUrl}/dashboard/notifications/channels.`
      toast({
        title: "No pudimos guardar los canales",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleTemplateSave = async () => {
    setTemplateStatus("idle")
    try {
      const payload = Object.entries(templateSubjects).map(([id, subject]) => ({
        id,
        subject: subject.trim(),
      }))

      await updateTemplates(payload)
      setTemplateStatus("success")
      toast({
        title: "Plantillas personalizadas",
        description: "Sincronizamos los asuntos sugeridos para tus mensajes.",
      })
    } catch (error) {
      console.error("Error al guardar plantillas", error)
      setTemplateStatus("error")
      const message =
        error instanceof Error
          ? error.message
          : `No pudimos sincronizar con ${apiBaseUrl}/dashboard/notifications/templates.`
      toast({
        title: "No pudimos guardar las plantillas",
        description: message,
        variant: "destructive",
      })
    }
  }

  if (isLoadingSettings) {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`digest-skeleton-${index}`} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`channels-skeleton-${index}`} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-60" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`templates-skeleton-${index}`} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {settingsError ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar tus preferencias</AlertTitle>
          <AlertDescription>
            {settingsError}. Revisa la conexión con {`${apiBaseUrl}/dashboard/notifications/settings`} e intenta nuevamente.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{digestCopy.title}</CardTitle>
          <CardDescription>{digestCopy.description}</CardDescription>
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
                    <FormLabel>{digestCopy.labels.name}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={digestCopy.placeholders.name}
                        {...field}
                        aria-label={digestCopy.labels.name}
                      />
                    </FormControl>
                    <FormDescription>
                      {digestCopy.descriptions.name}
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
                    <FormLabel>{digestCopy.labels.frequency}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={digestCopy.placeholders.frequency}
                        {...field}
                        aria-label={digestCopy.labels.frequency}
                      />
                    </FormControl>
                    <FormDescription>
                      {digestCopy.descriptions.frequency}
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
                    <FormLabel>{digestCopy.labels.time}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} aria-label={digestCopy.labels.time} />
                    </FormControl>
                    <FormDescription>
                      {digestCopy.descriptions.time}
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
                    <FormLabel>{digestCopy.labels.recipients}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={digestCopy.placeholders.recipients}
                        {...field}
                        aria-label={digestCopy.labels.recipients}
                      />
                    </FormControl>
                    <FormDescription>
                      {digestCopy.descriptions.recipients}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardFooter className="flex flex-col items-start gap-2 px-0">
                <Button
                  type="submit"
                  disabled={digestForm.formState.isSubmitting || isSavingDigest}
                >
                  {digestForm.formState.isSubmitting || isSavingDigest
                    ? digestCopy.saving
                    : digestCopy.submit}
                </Button>
                <div aria-live="polite">
                  {digestStatus === "success" && (
                    <p className="text-sm text-green-600" role="status">
                      {digestCopy.success}
                    </p>
                  )}
                  {digestStatus === "error" && (
                    <p className="text-sm text-destructive" role="status">
                      {digestCopy.error}
                    </p>
                  )}
                </div>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{channelsCopy.title}</CardTitle>
            <CardDescription>{channelsCopy.description}</CardDescription>
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
                        <FormLabel className="text-base">{channelsCopy.options.email.label}</FormLabel>
                        <FormDescription>
                          {channelsCopy.options.email.description}
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
                        <FormLabel className="text-base">{channelsCopy.options.push.label}</FormLabel>
                        <FormDescription>
                          {channelsCopy.options.push.description}
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
                        <FormLabel className="text-base">{channelsCopy.options.sms.label}</FormLabel>
                        <FormDescription>
                          {channelsCopy.options.sms.description}
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
                        <FormLabel className="text-base">{channelsCopy.options.inApp.label}</FormLabel>
                        <FormDescription>
                          {channelsCopy.options.inApp.description}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <CardFooter className="flex flex-col items-start gap-2 px-0">
                  <Button
                    type="submit"
                    disabled={channelsForm.formState.isSubmitting || isSavingChannels}
                  >
                    {channelsForm.formState.isSubmitting || isSavingChannels
                      ? channelsCopy.saving
                      : channelsCopy.submit}
                  </Button>
                  <div aria-live="polite">
                    {channelsStatus === "success" && (
                      <p className="text-sm text-green-600" role="status">
                        {channelsCopy.success}
                      </p>
                    )}
                    {channelsStatus === "error" && (
                      <p className="text-sm text-destructive" role="status">
                        {channelsCopy.error}
                      </p>
                    )}
                  </div>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{templatesCopy.title}</CardTitle>
            <CardDescription>{templatesCopy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {resolvedTemplates.map((template) => (
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
              <Button type="button" onClick={handleTemplateSave} disabled={isSavingTemplates}>
                {templatesCopy.submit}
              </Button>
              <div aria-live="polite">
                {templateStatus === "success" && (
                  <p className="text-sm text-green-600" role="status">
                    {templatesCopy.success}
                  </p>
                )}
                {templateStatus === "error" && (
                  <p className="text-sm text-destructive" role="status">
                    {templatesCopy.error}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Revisa el historial completo en el{" "}
              <Link className="font-medium text-primary underline" href="/(authenticated)/notifications">
                {templatesCopy.linkText}
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
