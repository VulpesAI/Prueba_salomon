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

export default function SettingsNotificationsPage() {
  const [digestStatus, setDigestStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [channelsStatus, setChannelsStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [templateSubjects, setTemplateSubjects] = React.useState<Record<string, string>>({
    "weekly-overview": templatesCopy.items[0]?.defaultSubject ?? "",
    "cash-alert": templatesCopy.items[1]?.defaultSubject ?? "",
    "closing-reminder": templatesCopy.items[2]?.defaultSubject ?? "",
  })
  const [templateStatus, setTemplateStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")

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
                <Button type="submit" disabled={digestForm.formState.isSubmitting}>
                  {digestForm.formState.isSubmitting ? digestCopy.saving : digestCopy.submit}
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
                  <Button type="submit" disabled={channelsForm.formState.isSubmitting}>
                    {channelsForm.formState.isSubmitting ? channelsCopy.saving : channelsCopy.submit}
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
