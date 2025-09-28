"use client";

import {
  Activity,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Code2,
  Cog,
  Database,
  FileCode,
  GitBranch,
  Layers,
  Network,
  ServerCog,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

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

const adminProfile = {
  name: "María Gómez",
  email: "maria@salomonai.com",
  role: "Super Administradora",
  lastLogin: "Hoy 08:45",
  environment: "Producción",
  timezone: "GMT-3",
  squads: ["Platform", "IA"],
};

const systemMetrics = [
  {
    title: "Servicios activos",
    value: 24,
    change: "+3 vs semana pasada",
    icon: ServerCog,
  },
  {
    title: "Jobs programados",
    value: 68,
    change: "12 en espera",
    icon: Calendar,
  },
  {
    title: "Alertas críticas",
    value: 2,
    change: "1 nueva",
    icon: ShieldAlert,
  },
];

const projectModules = [
  {
    name: "Frontend",
    status: "Operativo",
    description: "Next.js 14 · Deploy estable",
    owner: "Equipo Web",
  },
  {
    name: "Backend Core",
    status: "Operativo",
    description: "NestJS · Servicios REST y Webhooks",
    owner: "Equipo Platform",
  },
  {
    name: "Motor de IA",
    status: "Monitoreo",
    description: "Modelos personalizados en Vertex AI",
    owner: "Squad IA",
  },
  {
    name: "Pipelines ETL",
    status: "Atención",
    description: "Fallas intermitentes en sync bancario",
    owner: "DataOps",
  },
];

const maintenanceTasks = [
  {
    id: 1,
    title: "Actualizar diagramas de arquitectura",
    owner: "Equipo Platform",
    progress: 80,
  },
  {
    id: 2,
    title: "Revisar políticas de retención de datos",
    owner: "Legal & Seguridad",
    progress: 45,
  },
  {
    id: 3,
    title: "Optimizar costos en AWS",
    owner: "FinOps",
    progress: 60,
  },
];

const deploymentHistory = [
  {
    id: 1,
    description: "Deploy frontend v2.4.1",
    environment: "Producción",
    time: "Hace 4 horas",
    status: "Exitoso",
  },
  {
    id: 2,
    description: "Actualización motor IA",
    environment: "Staging",
    time: "Ayer",
    status: "En validación",
  },
  {
    id: 3,
    description: "Hotfix API webhooks",
    environment: "Producción",
    time: "Hace 2 días",
    status: "Atención",
  },
];

const securityPolicies = [
  {
    id: 1,
    title: "Autenticación y acceso",
    detail: "SAML + Magic Links para clientes internos",
    status: "Cumple",
  },
  {
    id: 2,
    title: "Cifrado de datos",
    detail: "Reposo y tránsito · KMS administrado",
    status: "Revisión",
  },
  {
    id: 3,
    title: "Auditoría",
    detail: "Logs centralizados en DataDog + SIEM",
    status: "Cumple",
  },
];

const teamMembers = [
  {
    id: 1,
    name: "Carlos Ortega",
    role: "Líder DevOps",
    access: "Total",
    lastAction: "Hoy 10:12",
  },
  {
    id: 2,
    name: "Ana Beltrán",
    role: "Arquitecta de Datos",
    access: "Limitado",
    lastAction: "Ayer",
  },
  {
    id: 3,
    name: "Esteban Díaz",
    role: "Security Officer",
    access: "Total",
    lastAction: "Hace 2 días",
  },
];

const pendingApprovals = [
  {
    id: 1,
    title: "Solicitud de rol: Analista regional",
    requester: "Laura Rivas",
    area: "Alianzas",
  },
  {
    id: 2,
    title: "Integración con CRM externo",
    requester: "Equipo Comercial",
    area: "Integraciones",
  },
];

const integrations = [
  {
    id: 1,
    name: "AWS",
    status: "Activo",
    description: "Infraestructura principal desplegada en ECS + RDS",
    icon: Cloud,
  },
  {
    id: 2,
    name: "Firebase",
    status: "Activo",
    description: "Notificaciones en tiempo real y autenticación móvil",
    icon: Zap,
  },
  {
    id: 3,
    name: "Belvo",
    status: "Monitoreo",
    description: "Conector financiero para sincronización bancaria",
    icon: Network,
  },
  {
    id: 4,
    name: "DataDog",
    status: "Activo",
    description: "Observabilidad end-to-end y alertas",
    icon: Activity,
  },
];

const architectureHighlights = [
  {
    title: "Aplicaciones",
    description: "Frontend (Next.js) · Backend (NestJS) · Worker ETL",
    icon: Layers,
  },
  {
    title: "Bases de datos",
    description: "PostgreSQL principal · Redis cache · Data Lake en S3",
    icon: Database,
  },
  {
    title: "Automatizaciones",
    description: "Pipelines CI/CD con GitHub Actions y Terraform",
    icon: GitBranch,
  },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-600/20 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">Centro de Control</h1>
                <Badge variant="outline" className="border-primary text-primary">
                  {adminProfile.role}
                </Badge>
                <Badge className="bg-gradient-primary text-primary-foreground">{adminProfile.environment}</Badge>
              </div>
              <p className="text-muted-foreground">
                Configura la estructura del proyecto, gestiona accesos y supervisa la salud de SalomonAI.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Último inicio de sesión: {adminProfile.lastLogin}
                </span>
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Zona horaria {adminProfile.timezone}
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Squads: {adminProfile.squads.join(", ")}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="gap-2">
                <ClipboardCheck className="h-4 w-4" /> Revisar aprobaciones
              </Button>
              <Button className="bg-gradient-primary text-primary-foreground gap-2 hover:opacity-90">
                <Sparkles className="h-4 w-4" /> Ejecutar automatización
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <Tabs defaultValue="general" className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Panel de administración</h2>
              <p className="text-muted-foreground">
                Control completo de la configuración estructural y operativa de la plataforma.
              </p>
            </div>
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
              <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Información del entorno</CardTitle>
                  <CardDescription>Resumen ejecutivo del estado del proyecto.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Health check global</p>
                      <p className="text-muted-foreground">99.3% uptime últimos 30 días</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Code2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">Versiones desplegadas</p>
                      <p className="text-muted-foreground">frontend@2.4.1 · backend@1.18.0 · workers@0.9.5</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Acciones rápidas
                    </h3>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <GitBranch className="h-4 w-4" /> Abrir pipeline de despliegue
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Database className="h-4 w-4" /> Gestionar migraciones
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <FileCode className="h-4 w-4" /> Editar manifiesto de infraestructura
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {systemMetrics.map((metric) => (
                    <Card key={metric.title} className="bg-gradient-card border-primary/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{metric.title}</p>
                            <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
                          </div>
                          <div className="rounded-full bg-primary/10 p-3 text-primary">
                            <metric.icon className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                          {metric.change}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Arquitectura del proyecto</CardTitle>
                    <CardDescription>Estructura principal y componentes críticos.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    {architectureHighlights.map((item) => (
                      <div key={item.title} className="rounded-lg border border-dashed border-primary/20 p-4">
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">{item.title}</h3>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Componentes y ownership</CardTitle>
                    <CardDescription>Seguimiento del estado operativo de cada módulo.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {projectModules.map((module) => (
                      <div key={module.name} className="rounded-lg border border-border p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{module.name}</h3>
                          <Badge
                            variant={module.status === "Operativo" ? "secondary" : "destructive"}
                            className={module.status === "Operativo" ? "bg-primary/10 text-primary" : undefined}
                          >
                            {module.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">Responsable: {module.owner}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Flujos clave</CardTitle>
                      <CardDescription>Procesos automatizados que sostienen el negocio.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-dashed border-primary/20 p-4">
                        <div className="flex items-center gap-3">
                          <ServerCog className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Onboarding de usuarios</p>
                            <p className="text-sm text-muted-foreground">Sincronización con CRM y orquestación de permisos.</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-dashed border-primary/20 p-4">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Integración bancaria</p>
                            <p className="text-sm text-muted-foreground">ETL diaria + normalización de categorías.</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-dashed border-primary/20 p-4">
                        <div className="flex items-center gap-3">
                          <Zap className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Motor de recomendaciones</p>
                            <p className="text-sm text-muted-foreground">Entrenamientos programados y despliegue canario.</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Tareas de mantenimiento</CardTitle>
                      <CardDescription>Seguimiento de iniciativas claves para el trimestre.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {maintenanceTasks.map((task) => (
                        <div key={task.id} className="rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">Responsable: {task.owner}</p>
                            </div>
                            <Badge variant="secondary" className="bg-secondary/50">
                              {task.progress}%
                            </Badge>
                          </div>
                          <Progress value={task.progress} className="mt-3" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Historial de despliegues</CardTitle>
                    <CardDescription>Últimos cambios aplicados sobre la plataforma.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {deploymentHistory.map((deploy) => (
                      <div
                        key={deploy.id}
                        className="flex flex-col gap-2 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-medium">{deploy.description}</p>
                          <p className="text-sm text-muted-foreground">{deploy.environment}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{deploy.status}</Badge>
                          <span className="text-xs text-muted-foreground">{deploy.time}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seguridad" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Políticas y controles</CardTitle>
                <CardDescription>Supervisa los pilares de seguridad de la plataforma.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                {securityPolicies.map((policy) => (
                  <div key={policy.id} className="rounded-lg border border-dashed border-primary/20 p-4">
                    <h3 className="font-medium">{policy.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{policy.detail}</p>
                    <Badge variant="secondary" className="mt-3 bg-primary/10 text-primary">
                      {policy.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Equipo con acceso</CardTitle>
                  <CardDescription>Gestión granular de permisos y últimas acciones.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <Badge variant="outline">Acceso {member.access}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Última acción: {member.lastAction}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Solicitudes pendientes</CardTitle>
                  <CardDescription>Aprueba cambios estructurales antes de su despliegue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingApprovals.map((item) => (
                    <div key={item.id} className="rounded-lg border border-dashed border-primary/20 p-4">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.requester} · {item.area}</p>
                      <Button variant="outline" size="sm" className="mt-3 gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Revisar detalle
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integraciones" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Servicios conectados</CardTitle>
                <CardDescription>Estado y propósito de las integraciones clave.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {integrations.map((integration) => (
                  <div key={integration.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <integration.icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-sm text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      <Badge
                        variant={integration.status === "Activo" ? "secondary" : "destructive"}
                        className={integration.status === "Activo" ? "bg-primary/10 text-primary" : undefined}
                      >
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Checklist técnico</CardTitle>
                <CardDescription>Valida conexiones entre entornos y servicios auxiliares.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-dashed border-primary/20 p-4">
                  <div className="flex items-center gap-3">
                    <Cog className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Infraestructura sincronizada</p>
                      <p className="text-sm text-muted-foreground">Terraform y GitHub Actions alineados con la rama main.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-primary/20 p-4">
                  <div className="flex items-center gap-3">
                    <Network className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Redes y accesos</p>
                      <p className="text-sm text-muted-foreground">VPN corporativa + acceso restringido por IP para panel admin.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-primary/20 p-4">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Copias de seguridad</p>
                      <p className="text-sm text-muted-foreground">Backups automáticos cada 6 horas replicados en región secundaria.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
