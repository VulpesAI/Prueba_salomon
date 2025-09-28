"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, ApiError, getApiBaseUrl } from "@/lib/api-client";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  ServerCog,
  Shield,
} from "lucide-react";

const endpointGroups = [
  {
    title: "Autenticación",
    description:
      "Administra el ciclo de vida de las sesiones y obtén los tokens JWT que utiliza la plataforma.",
    endpoints: [
      { method: "POST", path: "/auth/register", label: "Crear cuenta" },
      { method: "POST", path: "/auth/login", label: "Iniciar sesión" },
      {
        method: "POST",
        path: "/auth/password-reset",
        label: "Solicitar restablecimiento",
      },
    ],
  },
  {
    title: "Perfil y conversaciones",
    description:
      "Obtén la información del usuario autenticado y realiza consultas conversacionales al asistente financiero.",
    endpoints: [
      { method: "GET", path: "/users/me", label: "Perfil autenticado" },
      { method: "PATCH", path: "/users/me", label: "Actualizar preferencias" },
      {
        method: "POST",
        path: "/users/me/query",
        label: "Consulta en lenguaje natural",
      },
    ],
  },
  {
    title: "Panel financiero",
    description:
      "Conecta tu frontend con los datos financieros agregados que se muestran en el dashboard.",
    endpoints: [
      { method: "GET", path: "/dashboard/summary", label: "Resumen financiero" },
      { method: "GET", path: "/dashboard/movements", label: "Últimos movimientos" },
      {
        method: "GET",
        path: "/transactions/categories",
        label: "Clasificación de gastos",
      },
    ],
  },
  {
    title: "Monitoreo",
    description:
      "Endpoints de observabilidad y estado que se utilizan en el proceso de despliegue.",
    endpoints: [
      { method: "GET", path: "/health", label: "Estado del servicio" },
      { method: "GET", path: "/health/classification", label: "Estado del motor NLP" },
    ],
  },
] as const;

const methodStyles: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  POST: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  PATCH: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  PUT: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  DELETE: "bg-rose-500/10 text-rose-500 border-rose-500/30",
};

const quickstartSteps = [
  "Crea una cuenta con /auth/register y almacena el token de respuesta.",
  "Envía el token en el header Authorization para acceder a los endpoints protegidos.",
  "Consulta /dashboard/summary y /dashboard/movements para poblar el panel.",
  "Utiliza /users/me/query para habilitar el asistente financiero en tiempo real.",
] as const;

export default function ApiPage() {
  const baseUrl = useMemo(() => getApiBaseUrl().replace(/\/$/, ""), []);
  const swaggerUrl = useMemo(() => {
    if (baseUrl.endsWith("/api/v1")) {
      return baseUrl.replace(/\/api\/v1$/, "/api/docs");
    }
    return `${baseUrl}/api/docs`;
  }, [baseUrl]);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [healthStatus, setHealthStatus] = useState<"unknown" | "healthy" | "degraded" | "error">("unknown");
  const [healthDetails, setHealthDetails] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const copyBaseUrl = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      toast({
        title: "URL copiada",
        description: "La URL base quedó lista para pegarla en tus variables de entorno.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error("No se pudo copiar la URL base", copyError);
      setCopied(false);
      toast({
        title: "No pudimos copiar la URL",
        description: "Cópiala manualmente si tu navegador no permite el portapapeles.",
        variant: "destructive",
      });
    }
  };

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const response = await apiRequest<{
        status?: string;
        description?: string;
        services?: Record<string, string>;
      }>("/health", { method: "GET" });

      const status = String(response.status || "unknown").toLowerCase();
      const nextStatus = status === "healthy" ? "healthy" : "degraded";
      setHealthStatus(nextStatus);

      if (response.services) {
        const details = Object.entries(response.services)
          .map(([service, serviceStatus]) => `• ${service}: ${serviceStatus}`)
          .join("\n");
        setHealthDetails(details);
      } else if (response.description) {
        setHealthDetails(response.description);
      } else {
        setHealthDetails(null);
      }

      toast({
        title: "Servicio en línea",
        description:
          nextStatus === "healthy"
            ? "La API respondió correctamente al health check."
            : "Recibimos la respuesta del health check con observaciones. Revisa el detalle inferior.",
      });
    } catch (error) {
      setHealthStatus("error");
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
          ? error.message
          : "No pudimos comunicarnos con la API";
      setHealthDetails(message);
      toast({
        title: "No pudimos consultar la API",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 pb-20">
        <section className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="secondary" className="bg-primary/20 text-primary mb-4">
              <ServerCog className="w-4 h-4 mr-2" />
              API SalomonAI
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Conecta tu frontend a los servicios inteligentes de SalomonAI
            </h1>
            <p className="text-lg text-muted-foreground">
              Esta guía reúne los endpoints que ya consume la aplicación y te ayuda a integrarlos en nuevos flujos o en tus
              pruebas automatizadas.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  URL base
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Todas las rutas se resuelven a partir de esta URL. En producción apunta al despliegue de la API en Vercel o en tu
                  infraestructura propia.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <code className="px-3 py-2 rounded-md bg-background/80 border border-primary/20 text-sm text-foreground text-left break-all">
                  {baseUrl}
                </code>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={copyBaseUrl} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={swaggerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Abrir Swagger
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20">
              <CardHeader className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Health check
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  El mismo endpoint que utiliza la plataforma de despliegue para validar que el backend esté listo para recibir
                  tráfico.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Estado actual</p>
                    <p className="text-sm text-muted-foreground capitalize">{healthStatus}</p>
                  </div>
                  <Button onClick={checkHealth} disabled={isCheckingHealth} className="bg-primary hover:bg-primary/90">
                    {isCheckingHealth ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Consultando...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        Ejecutar health
                      </>
                    )}
                  </Button>
                </div>
                {healthDetails && (
                  <pre className="text-xs whitespace-pre-wrap bg-background/80 border border-primary/20 rounded-md p-3 text-muted-foreground">
                    {healthDetails}
                  </pre>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Flujo recomendado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {quickstartSteps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 text-primary font-semibold">{index + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20 lg:col-span-2">
              <CardHeader>
                <CardTitle>Endpoints principales</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ya están conectados con los contextos y hooks del frontend. Puedes reutilizarlos en nuevas vistas o pruebas E2E.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {endpointGroups.map((group) => (
                  <div key={group.title} className="border border-primary/10 rounded-lg p-4 bg-background/40">
                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <div className="space-y-2">
                      {group.endpoints.map((endpoint) => (
                        <div
                          key={`${group.title}-${endpoint.path}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/5 bg-background/60 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`text-xs uppercase tracking-wide ${methodStyles[endpoint.method] || "bg-secondary/20 text-secondary-foreground border-secondary/30"}`}
                            >
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm text-foreground">{endpoint.path}</code>
                          </div>
                          <span className="text-xs text-muted-foreground">{endpoint.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-card border-primary/20">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">¿Listo para probarlo dentro de la app?</h2>
                <p className="text-sm text-muted-foreground">
                  Ingresa al dashboard para ver estos endpoints en acción con datos reales y la experiencia conversacional.
                </p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link href="/">Volver a inicio</Link>
                </Button>
                <Button asChild className="bg-gradient-primary hover:opacity-90">
                  <Link href="/dashboard">Ir al dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
