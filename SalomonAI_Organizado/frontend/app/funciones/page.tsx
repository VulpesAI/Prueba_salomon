"use client";

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  MessageSquare, 
  Shield, 
  TrendingUp, 
  Smartphone, 
  Link,
  AlertTriangle,
  Target,
  BarChart3,
  Bell,
  FileText,
  Calendar,
  Users,
  Zap
} from "lucide-react";

export default function FuncionesPage() {
  const coreFeatures = [
    {
      icon: Brain,
      title: "IA Personalizada",
      description: "Aprende de tus hábitos únicos y se adapta a tu estilo de vida financiero",
      details: [
        "Categorización automática con 94% de precisión",
        "Detección de patrones de gasto personalizados",
        "Sugerencias contextuales inteligentes",
        "Mejora continua con el uso"
      ],
      badge: "Núcleo IA"
    },
    {
      icon: MessageSquare,
      title: "Consultas Naturales",
      description: "Pregunta en español: '¿Cuánto gasté en farmacias este mes?'",
      details: [
        "Procesamiento de lenguaje natural avanzado",
        "Comprensión de contexto financiero chileno",
        "Respuestas con visualizaciones automáticas",
        "Soporte para jerga financiera local"
      ],
      badge: "NLP"
    },
    {
      icon: Link,
      title: "Integración Bancaria",
      description: "Conecta con Banco de Chile, Santander, BCI y más vía Belvo",
      details: [
        "Conexión segura con 15+ bancos chilenos",
        "Sincronización automática en tiempo real",
        "Sin almacenamiento de credenciales",
        "Cumplimiento PSD2 y regulaciones locales"
      ],
      badge: "API Segura"
    },
    {
      icon: TrendingUp,
      title: "Análisis Predictivo",
      description: "Proyecta gastos futuros y identifica tendencias automáticamente",
      details: [
        "Predicción de gastos con ML avanzado",
        "Identificación de ciclos de gasto",
        "Alertas de gastos inusuales",
        "Análisis de estacionalidad"
      ],
      badge: "Predicción"
    }
  ];

  const advancedFeatures = [
    {
      icon: AlertTriangle,
      title: "Alertas Inteligentes",
      description: "Notificaciones contextuales sobre gastos inusuales o metas",
      examples: ["Gasto 40% mayor al promedio en restaurantes", "Meta de ahorro en riesgo", "Factura duplicada detectada"]
    },
    {
      icon: Target,
      title: "Metas Personalizadas",
      description: "Define objetivos de ahorro e inversión con seguimiento automático",
      examples: ["Ahorrar para vacaciones", "Fondo de emergencia", "Enganche de casa", "Inversión mensual"]
    },
    {
      icon: Shield,
      title: "Seguridad Bancaria",
      description: "Cifrado AES-256 y cumplimiento de estándares internacionales",
      examples: ["Certificación PCI DSS", "Auditorías trimestrales", "2FA obligatorio", "Monitoreo 24/7"]
    },
    {
      icon: BarChart3,
      title: "Reportes Avanzados",
      description: "Análisis detallados con visualizaciones interactivas",
      examples: ["Flujo de efectivo mensual", "Análisis por categorías", "Comparativas anuales", "Exportación PDF"]
    },
    {
      icon: Bell,
      title: "Notificaciones Smart",
      description: "Alertas personalizadas según tus patrones y preferencias",
      examples: ["Recordatorios de pagos", "Límites de categorías", "Oportunidades de ahorro", "Cambios en saldos"]
    },
    {
      icon: Smartphone,
      title: "App Móvil Nativa",
      description: "Experiencia completa en iOS y Android con sincronización",
      examples: ["Escaneo de boletas", "Control por voz", "Widgets de dashboard", "Modo offline"]
    }
  ];

  const businessFeatures = [
    {
      icon: Users,
      title: "Gestión Multi-Usuario",
      description: "Ideal para familias y equipos financieros",
      capabilities: ["Perfiles independientes", "Presupuestos compartidos", "Permisos granulares", "Vista consolidada"]
    },
    {
      icon: FileText,
      title: "Reportes de Gastos Personales",
      description: "Visualiza cómo se mueve tu dinero mes a mes",
      capabilities: ["Informe mensual automático", "Clasificación por categorías", "Comparativa vs presupuesto", "Exportación PDF o Excel"]
    },
    {
      icon: Calendar,
      title: "Planificación Financiera",
      description: "Herramientas de proyección a largo plazo",
      capabilities: ["Simuladores de inversión", "Planificación de jubilación", "Análisis de riesgo", "Escenarios múltiples"]
    }
  ];

  return (
    <main className="min-h-screen bg-app text-app">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 bg-section text-app">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge
              variant="secondary"
              className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-soft bg-[color:var(--bg-app)]/20 px-4 py-1 text-xs font-medium uppercase tracking-wide text-app"
            >
              <BarChart3 className="w-4 h-4" />
              Funciones
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Funciones <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>Inteligentes</span>
            </h1>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Descubre todas las herramientas que SalomonAI pone a tu disposición para revolucionar tu gestión financiera
            </p>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Funciones Principales</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              El corazón de SalomonAI: IA avanzada que comprende tus finanzas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {coreFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-3">
                      <IconComponent className="w-8 h-8 text-primary" />
                      <Badge variant="outline" className="text-xs">
                        {feature.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {feature.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Funciones Avanzadas</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Herramientas sofisticadas para usuarios que buscan el máximo control
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {advancedFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <IconComponent className="w-10 h-10 text-primary mb-4" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Ejemplos:</h4>
                      {feature.examples.map((example, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded">
                          {example}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Business Features */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Para Empresas y Familias</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Funciones especializadas para gestión financiera grupal y empresarial
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {businessFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20 text-center p-8">
                  <IconComponent className="w-16 h-16 text-primary mx-auto mb-6" />
                  <CardTitle className="text-xl mb-4">{feature.title}</CardTitle>
                  <p className="text-muted-foreground mb-6">{feature.description}</p>
                  <div className="space-y-2">
                    {feature.capabilities.map((capability, idx) => (
                      <div key={idx} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {capability}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Comparación de Planes</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Todas las funciones organizadas por nivel de acceso
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Básico</CardTitle>
                <p className="text-muted-foreground">Para comenzar</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Cuentas</span>
                    <span className="text-sm font-medium">2</span>
                  </div>
                  <Progress value={40} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">IA Categorización</span>
                    <span className="text-sm font-medium">Básica</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Reportes</span>
                    <span className="text-sm font-medium">Estándar</span>
                  </div>
                  <Progress value={50} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20 ring-2 ring-primary scale-105">
              <CardHeader className="text-center">
                <Badge className="mb-2">Más Popular</Badge>
                <CardTitle className="text-2xl">Inteligente</CardTitle>
                <p className="text-muted-foreground">Experiencia completa</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Cuentas</span>
                    <span className="text-sm font-medium">Ilimitadas</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">IA Categorización</span>
                    <span className="text-sm font-medium">Avanzada</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Reportes</span>
                    <span className="text-sm font-medium">Completos</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Premium</CardTitle>
                <p className="text-muted-foreground">Para empresas</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Usuarios</span>
                    <span className="text-sm font-medium">Ilimitados</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">API Access</span>
                    <span className="text-sm font-medium">Completo</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Soporte</span>
                    <span className="text-sm font-medium">24/7</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Prueba Todas las Funciones Gratis
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            30 días de acceso completo a todas las funciones. Sin compromisos.
          </p>
          <a
            href="https://prueba-salomon.vercel.app/signup"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-primary bg-background text-primary hover:bg-primary/10 h-11 rounded-md text-lg px-8 py-3"
            rel="noopener noreferrer"
          >
            <Zap className="w-5 h-5 mr-2" />
            Comenzar Prueba Gratuita
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
