import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  Lock,
  Radar,
  Sparkles,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SalomonAI API | Plataforma financiera programable",
  description:
    "Integra las capacidades financieras de SalomonAI en tus productos con una API segura, escalable y fácil de usar.",
};

const features = [
  {
    title: "Procesamiento inteligente",
    description:
      "Clasificación automática de transacciones y detección de patrones financieros usando nuestros modelos de IA.",
    icon: Sparkles,
  },
  {
    title: "Datos bancarios normalizados",
    description:
      "Conectores con bancos latinoamericanos y esquemas unificados para simplificar la conciliación contable.",
    icon: Database,
  },
  {
    title: "Seguridad de nivel bancario",
    description:
      "Encriptación AES-256, cumplimiento de la Ley 19.628 y monitoreo continuo para proteger la información sensible.",
    icon: Lock,
  },
];

const quickstart = [
  {
    step: "1",
    title: "Crea tu organización",
    description:
      "Genera un proyecto desde el panel de SalomonAI y obtén tus credenciales de producción o sandbox.",
  },
  {
    step: "2",
    title: "Solicita un token",
    description:
      "Realiza una petición `POST /auth/token` con tu `client_id` y `client_secret` para recibir un JWT válido por 60 minutos.",
  },
  {
    step: "3",
    title: "Sincroniza cuentas",
    description:
      "Conecta instituciones financieras y comienza a recibir movimientos normalizados en tiempo real mediante webhooks o polling.",
  },
];

const endpoints = [
  {
    name: "POST /auth/token",
    description: "Autentica tus integraciones mediante OAuth 2.0 client credentials.",
  },
  {
    name: "GET /accounts",
    description:
      "Obtén el listado completo de cuentas bancarias y tarjetas con saldos actualizados y metadatos de conexión.",
  },
  {
    name: "GET /transactions",
    description:
      "Consulta transacciones categorizadas con etiquetas de IA, geolocalización y nivel de confianza.",
  },
  {
    name: "POST /webhooks",
    description:
      "Registra endpoints para recibir notificaciones cuando detectemos nuevas transacciones o alertas de gasto.",
  },
];

export default function ApiPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="pt-28 pb-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-900 via-slate-900 to-black" />
          <div className="container mx-auto px-6 py-20 text-center">
            <Badge className="mx-auto mb-6 bg-primary/20 text-primary border-primary/30" variant="outline">
              API Financiera Empresarial
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gradient">
              Construye experiencias financieras con SalomonAI
            </h1>
            <p className="mx-auto max-w-3xl text-lg md:text-xl text-muted-foreground">
              Accede a categorización automática de gastos, alertas inteligentes y datos bancarios normalizados con una API
              lista para producción.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-primary px-10 py-6 text-base">
                  Obtener credenciales
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="px-10 py-6 text-base border-primary/40">
                  Ver demo en vivo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full bg-gradient-card border-primary/20">
                <CardHeader className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-muted/10 py-20">
          <div className="container mx-auto px-6">
            <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
              <div>
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                  Guía rápida
                </Badge>
                <h2 className="text-3xl font-bold mb-4 text-gradient">
                  Integra la API en minutos
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                  Nuestra documentación incluye SDKs para TypeScript, Python y Go, ejemplos de Postman y ambientes sandbox con
                  datos de prueba realistas.
                </p>

                <div className="mt-10 space-y-6">
                  {quickstart.map((item) => (
                    <div
                      key={item.step}
                      className="flex items-start gap-4 rounded-lg border border-primary/20 bg-background/60 p-6"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="h-fit border-primary/20 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    Ejemplo de autenticación
                  </CardTitle>
                  <CardDescription>
                    Solicita un token JWT utilizando el flujo client credentials. Reutiliza el token hasta que expire.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="rounded-lg bg-black/70 p-6 text-left text-sm leading-relaxed text-primary-foreground shadow-inner">
                    <code>{`curl -X POST https://api.salomonai.com/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "tu_client_id",
    "client_secret": "tu_client_secret"
  }'`}</code>
                  </pre>
                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Recibirás una respuesta con el token y la fecha de expiración.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Endpoints principales
            </Badge>
            <h2 className="text-3xl font-bold text-gradient">Cobertura completa para tus casos de uso</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Diseñada para fintechs, bancos digitales y plataformas contables que necesitan datos confiables y eventos en
              tiempo real.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {endpoints.map((endpoint) => (
              <Card key={endpoint.name} className="border-primary/15 bg-background/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    {endpoint.name}
                  </CardTitle>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-br from-primary/10 via-background to-background py-20">
          <div className="container mx-auto px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <Card className="border-primary/15 bg-background/80">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Radar className="h-5 w-5 text-primary" />
                    Monitoreo proactivo
                  </CardTitle>
                  <CardDescription>
                    Detecta anomalías en gastos, movimientos inusuales y riesgos de fraude con alertas configurables.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Configura umbrales dinámicos, recibe notificaciones por Webhook y habilita respuestas automáticas como bloqueo
                  temporal de tarjetas o avisos dentro de tu aplicación.
                </CardContent>
              </Card>

              <Card className="border-primary/15 bg-background/80">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Cumplimiento continuo
                  </CardTitle>
                  <CardDescription>
                    Auditorías trimestrales, registros inmutables y herramientas para gestionar consentimientos de usuarios.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Registramos cada acceso a datos sensibles, mantenemos históricos cifrados y facilitamos reportes regulatorios
                  para tu equipo legal.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">
            ¿Listo para construir sobre SalomonAI?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Nuestro equipo de soluciones te acompaña en la integración, pruebas de seguridad y migración desde sistemas
            legados.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contacto" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-gradient-primary px-8 py-6 text-base">
                Hablar con el equipo técnico
              </Button>
            </Link>
            <Link href="/seguridad" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-primary/40 px-8 py-6 text-base text-primary hover:bg-primary/10"
              >
                Revisar políticas de seguridad
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
