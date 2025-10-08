"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import StatementUploader from "@/components/StatementUploader"
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
import { useTheme } from "@/lib/theme-provider"

const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, esCL.settings.profile.validation.fullName.min)
    .max(120, esCL.settings.profile.validation.fullName.max),
  email: z.string().email(esCL.settings.profile.validation.email),
  phone: z
    .string()
    .min(9, esCL.settings.profile.validation.phone.min)
    .max(20, esCL.settings.profile.validation.phone.max),
})

const preferencesSchema = z.object({
  language: z.string().min(2, esCL.settings.profile.validation.language),
  currency: z.string().min(1, esCL.settings.profile.validation.currency),
  timezone: z.string().min(2, esCL.settings.profile.validation.timezone),
  theme: z.enum(["dark", "light"]),
  weeklyDigest: z.boolean(),
  goalReminders: z.boolean(),
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PreferencesFormValues = z.infer<typeof preferencesSchema>

const profileCopy = esCL.settings.profile.forms.profile
const preferencesCopy = esCL.settings.profile.forms.preferences
const integrationsCopy = esCL.settings.profile.integrations
const defaults = esCL.settings.profile.defaults
const integrationsCatalogue = integrationsCopy.catalogue

export default function SettingsProfilePage() {
  const [profileStatus, setProfileStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [preferencesStatus, setPreferencesStatus] = React.useState<
    "idle" | "success" | "error"
  >("idle")
  const [connectedIntegrations, setConnectedIntegrations] = React.useState<
    Record<string, boolean>
  >({ ...defaults.integrations })
  const { theme, setTheme } = useTheme()

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: defaults.fullName,
      email: defaults.email,
      phone: defaults.phone,
    },
  })

  const preferencesForm = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: defaults.language,
      currency: defaults.currency,
      timezone: defaults.timezone,
      theme: defaults.theme,
      weeklyDigest: defaults.weeklyDigest,
      goalReminders: defaults.goalReminders,
    },
  })

  const resolvedTheme = theme ?? "dark"

  React.useEffect(() => {
    const currentTheme = resolvedTheme as PreferencesFormValues["theme"]
    if (preferencesForm.getValues("theme") !== currentTheme) {
      preferencesForm.setValue("theme", currentTheme, { shouldDirty: false })
    }
  }, [preferencesForm, resolvedTheme])

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
      setTheme(values.theme)
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
            <CardTitle>{profileCopy.title}</CardTitle>
            <CardDescription>{profileCopy.description}</CardDescription>
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
                      <FormLabel>{profileCopy.labels.fullName}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={profileCopy.placeholders.fullName}
                          {...field}
                          aria-label={profileCopy.labels.fullName}
                        />
                      </FormControl>
                      <FormDescription>
                        {profileCopy.descriptions.fullName}
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
                      <FormLabel>{profileCopy.labels.email}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={profileCopy.placeholders.email}
                          {...field}
                          aria-label={profileCopy.labels.email}
                        />
                      </FormControl>
                      <FormDescription>
                        {profileCopy.descriptions.email}
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
                      <FormLabel>{profileCopy.labels.phone}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={profileCopy.placeholders.phone}
                          {...field}
                          aria-label={profileCopy.labels.phone}
                        />
                      </FormControl>
                      <FormDescription>
                        {profileCopy.descriptions.phone}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <CardFooter className="flex flex-col items-start gap-2 px-0">
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting ? profileCopy.saving : profileCopy.submit}
                  </Button>
                  <div aria-live="polite">
                    {profileStatus === "success" && (
                      <p className="text-sm text-green-600" role="status">
                        {profileCopy.success}
                      </p>
                    )}
                    {profileStatus === "error" && (
                      <p className="text-sm text-destructive" role="status">
                        {profileCopy.error}
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
            <CardTitle>{preferencesCopy.title}</CardTitle>
            <CardDescription>{preferencesCopy.description}</CardDescription>
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
                      <FormLabel>{preferencesCopy.labels.language}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={preferencesCopy.placeholders.language}
                          {...field}
                          aria-label={preferencesCopy.labels.language}
                        />
                      </FormControl>
                      <FormDescription>
                        {preferencesCopy.descriptions.language}
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
                      <FormLabel>{preferencesCopy.labels.currency}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={preferencesCopy.placeholders.currency}
                          {...field}
                          aria-label={preferencesCopy.labels.currency}
                        />
                      </FormControl>
                      <FormDescription>
                        {preferencesCopy.descriptions.currency}
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
                      <FormLabel>{preferencesCopy.labels.timezone}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={preferencesCopy.placeholders.timezone}
                          {...field}
                          aria-label={preferencesCopy.labels.timezone}
                        />
                      </FormControl>
                      <FormDescription>
                        {preferencesCopy.descriptions.timezone}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <FormField
                    control={preferencesForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {preferencesCopy.toggles.theme.label}
                          </FormLabel>
                          <FormDescription>
                            {preferencesCopy.toggles.theme.description}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === "light"}
                            onCheckedChange={(checked) => {
                              const newTheme = checked ? "light" : "dark"
                              field.onChange(newTheme)
                              setTheme(newTheme)
                            }}
                            aria-label={preferencesCopy.toggles.theme.label}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={preferencesForm.control}
                    name="weeklyDigest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {preferencesCopy.toggles.weeklyDigest.label}
                          </FormLabel>
                          <FormDescription>
                            {preferencesCopy.toggles.weeklyDigest.description}
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
                    name="goalReminders"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            {preferencesCopy.toggles.goalReminders.label}
                          </FormLabel>
                          <FormDescription>
                            {preferencesCopy.toggles.goalReminders.description}
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
                      ? preferencesCopy.saving
                      : preferencesCopy.submit}
                  </Button>
                  <div aria-live="polite">
                    {preferencesStatus === "success" && (
                      <p className="text-sm text-green-600" role="status">
                        {preferencesCopy.success}
                      </p>
                    )}
                    {preferencesStatus === "error" && (
                      <p className="text-sm text-destructive" role="status">
                        {preferencesCopy.error}
                      </p>
                    )}
                  </div>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{integrationsCopy.title}</CardTitle>
          <CardDescription>{integrationsCopy.description}</CardDescription>
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
                          ? integrationsCopy.states.active
                          : integrationsCopy.states.inactive}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {connectedIntegrations[integration.id]
                          ? integrationsCopy.states.activeHelper
                          : integrationsCopy.states.inactiveHelper}
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

      <StatementUploader />
    </div>
  )
}
