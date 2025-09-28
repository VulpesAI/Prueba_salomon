"use client";

import {
  Activity,
  BellRing,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Globe,
  Key,
  ListChecks,
  Lock,
  MapPin,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Target,
  User,
  Wallet,
} from "lucide-react";

import { FinancialDashboard } from "@/components/dashboard/financial-dashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const profile = {
  name: "Juan Pérez",
  email: "juan@email.com",
  plan: "Plan Avanzado",
  role: "Usuario Premium",
  location: "Santiago, Chile",
  memberSince: "Marzo 2023",
  lastLogin: "Hace 2 horas",
  avatar: "JP",
  tags: ["Finanzas Personales", "Inversión", "IA"],
};

const quickStats = [
  {
    title: "Balance Total",
    value: 2_847_650,
    change: "+12.5%",
    icon: DollarSign,
    format: "currency" as const,
  },
  {
    title: "Presupuesto Disponible",
    value: 620_000,
    change: "Quedan 12 días",
    icon: Wallet,
    format: "currency" as const,
  },
  {
    title: "Objetivos Activos",
    value: 4,
    change: "2 por completar",
    icon: Target,
    format: "count" as const,
  },
  {
    title: "Puntaje Salud Financiera",
    value: 86,
    change: "+4 puntos",
    icon: Activity,
    format: "score" as const,
  },
];

const goals = [
  {
    id: 1,
    name: "Fondo de Emergencia",
    progress: 72,
    target: 2_000_000,
    deadline: "Diciembre 2025",
  },
  {
    id: 2,
    name: "Viaje a Europa",
    progress: 45,
    target: 3_500_000,
    deadline: "Julio 2026",
  },
  {
    id: 3,
    name: "Inversión Anual",
    progress: 58,
    target: 5_000_000,
    deadline: "Abril 2026",
  },
];

const tasks = [
  {
    id: 1,
    title: "Actualizar presupuesto mensual",
    due: "Próximo lunes",
    description: "Revisar categorías y ajustar límites según gastos recientes.",
    priority: "Alta",
  },
  {
    id: 2,
    title: "Confirmar conexión bancaria",
    due: "Mañana",
    description: "Se detectó un nuevo inicio de sesión desde un dispositivo desconocido.",
    priority: "Media",
  },
  {
    id: 3,
    title: "Revisar recomendaciones de IA",
    due: "Esta semana",
    description: "Hay 5 sugerencias para optimizar tus inversiones.",
    priority: "Media",
  },
];

const notifications = [
  {
    id: 1,
    title: "Nuevo informe de gastos listo",
    description: "Tu resumen semanal está disponible para descargar.",
    time: "Hace 12 minutos",
    type: "info",
  },
  {
    id: 2,
    title: "Ahorro meta alcanzable",
    description: "Estás a $140,000 de lograr tu meta del fondo de emergencia.",
    time: "Hace 1 hora",
    type: "success",
  },
  {
    id: 3,
    title: "Actividad inusual detectada",
    description: "Verificamos un gasto fuera de patrón el viernes pasado.",
    time: "Hace 1 día",
    type: "warning",
  },
];

const securityChecklist = [
  {
    id: 1,
    title: "Autenticación de dos factores",
    status: "Activo",
    description: "Protege tu cuenta con códigos dinámicos.",
    icon: Shield,
  },
  {
    id: 2,
    title: "Dispositivos de confianza",
    status: "3 registrados",
    description: "Gestiona los dispositivos que pueden acceder a tu cuenta.",
    icon: Key,
  },
  {
    id: 3,
    title: "Alertas inteligentes",
    status: "Personalizadas",
    description: "Recibe notificaciones sobre cambios relevantes en tus finanzas.",
    icon: BellRing,
  },
  {
    id: 4,
    title: "Política de privacidad",
    status: "Actualizada",
    description: "Última revisión realizada hace 7 días.",
    icon: Lock,
  },
];

const connectedAccounts = [
  {
    id: 1,
    name: "Santander",
    type: "Cuenta Corriente",
    status: "Sincronizada",
    lastSync: "Hace 15 minutos",
  },
  {
    id: 2,
    name: "BCI",
    type: "Cuenta de Ahorro",
    status: "Sincronizada",
    lastSync: "Hace 2 horas",
  },
  {
    id: 3,
    name: "Tenpo",
    type: "Tarjeta Prepago",
    status: "Requiere acción",
    lastSync: "Hace 3 días",
  },
];

const documents = [
  { id: 1, name: "Estado financiero - Julio", category: "Informe", updatedAt: "Ayer" },
  { id: 2, name: "Declaración de impuestos", category: "Documentos", updatedAt: "Hace 3 días" },
  { id: 3, name: "Simulación de inversión", category: "Análisis", updatedAt: "Hace 1 semana" },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);

export default function UserProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-r from-primary/20 via-accent/20 to-purple-500/20 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarFallback className="text-2xl font-semibold bg-gradient-primary text-primary-foreground">
                  {profile.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  <Badge variant="outline" className="border-primary text-primary">
                    {profile.role}
                  </Badge>
                  <Badge className="bg-gradient-primary text-primary-foreground">
                    {profile.plan}
                  </Badge>
                </div>
                <p className="mt-3 text-muted-foreground">{profile.email}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {profile.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Miembro desde {profile.memberSince}
                  </span>
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Último acceso {profile.lastLogin}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" /> Configurar cuenta
              </Button>
              <Button className="bg-gradient-primary text-primary-foreground gap-2 hover:opacity-90">
                <Download className="h-4 w-4" /> Descargar resumen
              </Button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {profile.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-secondary/50 border border-secondary/40">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Panel Personal</h2>
              <p className="text-muted-foreground">Gestiona todo lo relacionado a tu perfil y finanzas en un solo lugar.</p>
            </div>
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="actividad">Actividad</TabsTrigger>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard">
            <Card className="border-primary/30">
              <CardHeader className="pb-0">
                <CardTitle>Dashboard financiero</CardTitle>
                <CardDescription>La misma vista completa del panel, integrada en tu perfil.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <FinancialDashboard hideNavigation />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actividad" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Actividad reciente</CardTitle>
                <CardDescription>Registro consolidado de movimientos y decisiones tomadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    id: 1,
                    title: "Objetivo actualizado",
                    description: "Aumentaste la meta del fondo de emergencia en $100,000.",
                    time: "Hace 3 horas",
                  },
                  {
                    id: 2,
                    title: "Nueva recomendación IA",
                    description: "SalomonAI identificó una oportunidad de inversión en renta fija.",
                    time: "Ayer",
                  },
                  {
                    id: 3,
                    title: "Revisión de gastos",
                    description: "Categorías ajustadas en base a tu presupuesto mensual.",
                    time: "Hace 2 días",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Próximas acciones sugeridas</CardTitle>
                <CardDescription>Pasos recomendados por el asistente para las siguientes semanas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    id: 1,
                    title: "Optimizar cartera de inversiones",
                    detail: "Diversifica un 10% hacia instrumentos de bajo riesgo.",
                  },
                  {
                    id: 2,
                    title: "Configurar alertas dinámicas",
                    detail: "Personaliza umbrales para gastos en transporte.",
                  },
                  {
                    id: 3,
                    title: "Revisar seguros asociados",
                    detail: "Hay 2 propuestas de alianzas disponibles para ti.",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4"
                  >
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resumen" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Información general</CardTitle>
                  <CardDescription>
                    Personaliza tu experiencia y mantén tu perfil actualizado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Nombre completo</p>
                      <p className="text-muted-foreground">{profile.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Zona horaria</p>
                      <p className="text-muted-foreground">GMT-3 (Chile)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Preferencias de contacto</p>
                      <p className="text-muted-foreground">Notificaciones por correo y WhatsApp</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Preferencias
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Recomendaciones basadas en IA activadas</p>
                      <p>• Alertas cuando el gasto supera el 80% del presupuesto</p>
                      <p>• Resúmenes semanales cada lunes</p>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full">
                    Actualizar datos
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {quickStats.map((stat) => (
                    <Card key={stat.title} className="bg-gradient-card border-primary/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                            <p className="mt-2 text-2xl font-semibold">
                              {stat.format === "currency"
                                ? formatCurrency(stat.value)
                                : stat.format === "score"
                                ? `${stat.value}/100`
                                : stat.value}
                            </p>
                          </div>
                          <div className="rounded-full bg-primary/10 p-3 text-primary">
                            <stat.icon className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                          {stat.change}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Accesos rápidos</CardTitle>
                      <CardDescription>Todo lo que necesitas para comenzar tu día financiero.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-2">
                        <Sparkles className="h-4 w-4" /> Pedir asesoría IA
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2">
                        <ListChecks className="h-4 w-4" /> Crear presupuesto
                      </Button>
                      <Button size="sm" className="bg-gradient-primary text-primary-foreground gap-2 hover:opacity-90">
                        <Download className="h-4 w-4" /> Descargar reporte
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-dashed border-primary/30 p-4">
                      <p className="text-sm font-medium">Simulador de inversión</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Proyecta escenarios con la asistencia de SalomonAI.
                      </p>
                    </div>
                    <div className="rounded-lg border border-dashed border-primary/30 p-4">
                      <p className="text-sm font-medium">Planificador de objetivos</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Define metas y recibe recordatorios personalizados.
                      </p>
                    </div>
                    <div className="rounded-lg border border-dashed border-primary/30 p-4">
                      <p className="text-sm font-medium">Conciliación bancaria</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sincroniza transacciones y detecta anomalías en minutos.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Objetivos financieros</CardTitle>
                      <CardDescription>Monitorea tu avance y ajusta tus estrategias.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {goals.map((goal) => (
                        <div key={goal.id} className="rounded-lg border border-primary/10 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{goal.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Meta: {formatCurrency(goal.target)} · {goal.deadline}
                              </p>
                            </div>
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              {goal.progress}%
                            </Badge>
                          </div>
                          <Progress value={goal.progress} className="mt-4" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Tareas pendientes</CardTitle>
                      <CardDescription>Sugerencias priorizadas por SalomonAI.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            </div>
                            <Badge variant="secondary">{task.priority}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> {task.due}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Centro de notificaciones</CardTitle>
                      <CardDescription>Actualizaciones y alertas que requieren tu atención.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{notification.title}</p>
                            <Badge variant="outline">{notification.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> {notification.time}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Seguridad y privacidad</CardTitle>
                      <CardDescription>Control total sobre el acceso y la protección de tu cuenta.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {securityChecklist.map((item) => (
                        <div key={item.id} className="flex items-start gap-4 rounded-lg border border-border p-4">
                          <div className="rounded-full bg-primary/10 p-2 text-primary">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{item.title}</p>
                              <Badge variant="secondary" className="bg-secondary/50">
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full gap-2">
                        <Shield className="h-4 w-4" /> Administrar controles de seguridad
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Cuentas conectadas</CardTitle>
                    <CardDescription>Gestiona los bancos y servicios vinculados a tu perfil.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {connectedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.type}</p>
                        </div>
                        <div className="flex flex-col sm:items-end">
                          <Badge
                            variant={account.status === "Sincronizada" ? "secondary" : "destructive"}
                            className={account.status === "Sincronizada" ? "bg-primary/10 text-primary" : undefined}
                          >
                            {account.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1">Última sincronización: {account.lastSync}</span>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="mt-4 gap-2">
                      <Wallet className="h-4 w-4" /> Conectar nuevo servicio
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Documentos y reportes</CardTitle>
                    <CardDescription>Organiza y descarga tus archivos más importantes.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-3">
                    {documents.map((document) => (
                      <div key={document.id} className="rounded-lg border border-dashed border-border p-4">
                        <p className="font-medium">{document.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{document.category}</p>
                        <p className="text-xs text-muted-foreground mt-2">Actualizado: {document.updatedAt}</p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full">
                          Descargar
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
