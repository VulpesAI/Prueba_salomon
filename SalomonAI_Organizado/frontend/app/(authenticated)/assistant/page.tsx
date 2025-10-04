'use client'

import * as React from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ListChecks,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  type AssistantAutomation,
  type AssistantConversation,
  type AssistantPlaybook,
  type AssistantResource,
  useAssistantMock,
} from "@/hooks/useAssistantMock"

export default function AssistantPage() {
  const { conversations, playbooks, resources, automations } = useAssistantMock()
  const [selectedConversationId, setSelectedConversationId] = React.useState(
    conversations[0]?.id ?? ""
  )

  const activeConversation = React.useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId
      ) ?? conversations[0],
    [conversations, selectedConversationId]
  )

  const pinnedConversations = React.useMemo(
    () => conversations.filter((conversation) => conversation.pinned),
    [conversations]
  )

  const recentConversations = React.useMemo(
    () => conversations.filter((conversation) => !conversation.pinned),
    [conversations]
  )

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Asistente financiero
          </h1>
          <p className="text-muted-foreground">
            Coordina a Salomón AI para obtener respuestas accionables, ejecutar
            playbooks y descubrir recursos recomendados para ti.
          </p>
        </div>
        <AutomationShortcuts automations={automations.slice(0, 2)} />
      </header>

      <Tabs defaultValue="conversacion" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="conversacion">Conversación</TabsTrigger>
          <TabsTrigger value="resumen">Resumen estratégico</TabsTrigger>
          <TabsTrigger value="automatizaciones">Automatizaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="conversacion" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
            <ChatPanel conversation={activeConversation} />
            <div className="space-y-6">
              <ConversationHistory
                pinned={pinnedConversations}
                conversations={recentConversations}
                selectedConversationId={activeConversation?.id ?? ""}
                onSelectConversation={setSelectedConversationId}
              />
              <PlaybookPanel playbooks={playbooks} />
              <SuggestedResources resources={resources} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resumen">
          <StrategyOverview conversation={activeConversation} />
        </TabsContent>

        <TabsContent value="automatizaciones">
          <AutomationsBoard automations={automations} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AutomationShortcuts({
  automations,
}: {
  automations: AssistantAutomation[]
}) {
  if (!automations.length) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-3">
      {automations.map((automation) => (
        <Button
          key={automation.id}
          asChild
          className="gap-2"
          variant="secondary"
        >
          <Link href={automation.href}>
            <Sparkles className="size-4" />
            {automation.title}
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      ))}
    </div>
  )
}

function ChatPanel({
  conversation,
}: {
  conversation?: AssistantConversation
}) {
  if (!conversation) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Selecciona una conversación</CardTitle>
          <CardDescription>
            Escoge un hilo para continuar donde lo dejaste o iniciar uno nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            El asistente conserva el contexto y sugiere la siguiente mejor acción
            según los datos que tengas conectados.
          </div>
        </CardContent>
      </Card>
    )
  }

  const isResponding = conversation.messages.some(
    (message) => message.status === "loading"
  )

  const hasError = conversation.messages.some(
    (message) => message.status === "error"
  )

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{conversation.title}</CardTitle>
            <CardDescription>
              {conversation.updatedAt} · {conversation.preview}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
            {isResponding && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Loader2 className="size-3 animate-spin" />
                Generando respuesta
              </span>
            )}
            {hasError && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircle className="size-3" />
                Revisión requerida
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="flex flex-col gap-4 py-6">
            {conversation.messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>
        <div className="border-t p-6">
          <div className="space-y-3">
            <Textarea
              placeholder="Escribe tu instrucción o pega un prompt."
              className="min-h-[96px] resize-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                El copiloto puede automatizar conciliaciones, forecasts y tareas
                de control con tu aprobación.
              </span>
              <Button className="gap-2">
                Enviar
                <Play className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatMessageBubble({
  message,
}: {
  message: AssistantConversation["messages"][number]
}) {
  const isAssistant = message.role === "assistant"
  const isError = message.status === "error"
  const isLoading = message.status === "loading"

  return (
    <div
      className={cn("flex", isAssistant ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-xl rounded-lg border px-4 py-3 text-sm shadow-sm",
          isAssistant
            ? "bg-background text-foreground"
            : "bg-primary text-primary-foreground",
          isError && "border-destructive/70 bg-destructive/10 text-destructive",
          isLoading && "border-primary/40 bg-primary/5"
        )}
      >
        <div className="flex items-start gap-2">
          {isAssistant && (
            <Sparkles className="mt-1 size-4 text-primary" />
          )}
          <div className="space-y-2">
            <p className="whitespace-pre-line leading-relaxed">
              {message.content}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{message.timestamp}</span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Loader2 className="size-3 animate-spin" />
                  Calculando escenarios
                </span>
              )}
              {isError && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertCircle className="size-3" /> Error temporal
                </span>
              )}
              {message.note && !isLoading && !isError && (
                <span className="text-muted-foreground">{message.note}</span>
              )}
            </div>
            {message.note && (isLoading || isError) && (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-xs",
                  isError
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-primary/40 bg-primary/5 text-primary"
                )}
              >
                {message.note}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConversationHistory({
  pinned,
  conversations,
  selectedConversationId,
  onSelectConversation,
}: {
  pinned: AssistantConversation[]
  conversations: AssistantConversation[]
  selectedConversationId: string
  onSelectConversation: (conversationId: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de chats</CardTitle>
        <CardDescription>
          Revisa tus hilos anteriores y retoma pendientes cuando lo necesites.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent">Recientes</TabsTrigger>
            <TabsTrigger value="pinned">Fijados</TabsTrigger>
          </TabsList>
          <TabsContent value="recent">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={onSelectConversation}
            />
          </TabsContent>
          <TabsContent value="pinned">
            <ConversationList
              conversations={pinned}
              selectedConversationId={selectedConversationId}
              onSelectConversation={onSelectConversation}
              emptyLabel="Aún no has fijado ningún chat."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  emptyLabel = "Sin conversaciones disponibles.",
}: {
  conversations: AssistantConversation[]
  selectedConversationId: string
  onSelectConversation: (conversationId: string) => void
  emptyLabel?: string
}) {
  if (!conversations.length) {
    return (
      <div className="mt-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <ScrollArea className="mt-4 h-64 pr-4">
      <div className="space-y-3">
        {conversations.map((conversation) => {
          const isActive = conversation.id === selectedConversationId
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                "w-full rounded-lg border bg-background p-4 text-left transition hover:border-primary/40 hover:bg-accent",
                isActive && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{conversation.title}</span>
                <span className="text-xs text-muted-foreground">
                  {conversation.updatedAt}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {conversation.preview}
              </p>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function PlaybookPanel({ playbooks }: { playbooks: AssistantPlaybook[] }) {
  const statusConfig: Record<AssistantPlaybook["status"], { label: string; variant: "default" | "secondary" | "destructive" }> =
    {
      running: { label: "En progreso", variant: "default" },
      scheduled: { label: "Programado", variant: "secondary" },
      ready: { label: "Listo", variant: "secondary" },
      error: { label: "Atención", variant: "destructive" },
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playbooks activos</CardTitle>
        <CardDescription>
          Supervisa la ejecución de automatizaciones y desbloquéate con
          acciones sugeridas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {playbooks.map((playbook) => {
          const status = statusConfig[playbook.status]
          return (
            <div
              key={playbook.id}
              className="rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{playbook.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Actualizado {playbook.updatedAt} · Responsable {playbook.owner}
                  </p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {playbook.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Éxito histórico {(playbook.successRate * 100).toFixed(0)}%
                </span>
                {playbook.nextRun ? (
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="size-3" /> Próxima ejecución {playbook.nextRun}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <AlertCircle className="size-3" /> Requiere intervención
                  </span>
                )}
              </div>
            </div>
          )
        })}
        <Button asChild variant="ghost" className="w-full justify-start gap-2">
          <Link href="/(authenticated)/analytics/recommendations">
            <ArrowUpRight className="size-4" />
            Ver catálogo completo de playbooks
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function SuggestedResources({
  resources,
}: {
  resources: AssistantResource[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recursos sugeridos</CardTitle>
        <CardDescription>
          Documentación y reportes que el asistente considera relevantes para
          esta conversación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {resources.map((resource) => (
          <div key={resource.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{resource.title}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {resource.type}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link href={resource.href}>
                  {resource.cta}
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {resource.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function StrategyOverview({
  conversation,
}: {
  conversation?: AssistantConversation
}) {
  if (!conversation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin datos disponibles</CardTitle>
          <CardDescription>
            Selecciona una conversación para visualizar el resumen estratégico.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de {conversation.title.toLowerCase()}</CardTitle>
        <CardDescription>
          Puntos clave y próximos pasos que el asistente sugiere para tus
          decisiones financieras.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="size-4" /> Hallazgos
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {conversation.summary.highlights.map((highlight, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-primary" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="size-4" /> Próximos pasos
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {conversation.summary.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-secondary" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
        {conversation.summary.blockers?.length ? (
          <div className="md:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <AlertCircle className="size-4" /> Bloqueos
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {conversation.summary.blockers.map((blocker, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-destructive" />
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function AutomationsBoard({
  automations,
}: {
  automations: AssistantAutomation[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones recomendadas</CardTitle>
        <CardDescription>
          El asistente identifica automatizaciones de alto impacto que puedes
          lanzar con un clic.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {automations.map((automation) => (
          <div
            key={automation.id}
            className="flex h-full flex-col justify-between rounded-lg border p-4"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold">{automation.title}</p>
              <p className="text-sm text-muted-foreground">
                {automation.description}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{automation.impact}</span>
              <Button asChild size="sm" className="gap-2">
                <Link href={automation.href}>
                  Ejecutar
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
