"use client";

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plug,
  CheckCircle,
  Shield,
  Activity,
  Lock,
  Clock
} from "lucide-react";

export default function IntegracionesPage() {
  const bankIntegrations = [
    {
      name: "Banco de Chile",
      logo: "🏦",
      status: "comingSoon",
      description: "Estamos diseñando una experiencia personal para conectar tus cuentas con calma y seguridad.",
      features: [
        "Consulta de saldos personales (en piloto)",
        "Alertas de movimientos planificadas",
        "Gestión de tarjetas en diseño",
        "Reportes descargables en pruebas"
      ],
      progress: 55,
      roadmapStage: "Piloto privado"
    },
    {
      name: "Banco Estado",
      logo: "🟢",
      status: "comingSoon",
      description: "Queremos sumar CuentaRUT y productos personales sin complicaciones. ¡Tu interés nos ayuda a priorizar!",
      features: [
        "Sincronización de CuentaRUT planificada",
        "Seguimiento de beneficios en evaluación",
        "Visualización de tarjetas de débito",
        "Recordatorios de pagos en exploración"
      ],
      progress: 45,
      roadmapStage: "Diseño de experiencia"
    },
    {
      name: "Santander Chile",
      logo: "🔴",
      status: "comingSoon",
      description: "Exploramos cómo ayudarte a ordenar tus productos Santander desde un solo panel personal.",
      features: [
        "Vista unificada de cuentas en investigación",
        "Metas de ahorro personales",
        "Control de tarjetas planificado",
        "Alertas inteligentes en pruebas"
      ],
      progress: 60,
      roadmapStage: "Investigación avanzada"
    },
    {
      name: "BCI",
      logo: "🔵",
      status: "comingSoon",
      description: "Estamos recopilando feedback para priorizar la integración personal con BCI.",
      features: [
        "Panel de inversiones en evaluación",
        "Resumen de créditos en diseño",
        "Notificaciones personalizadas",
        "Sincronización segura (en investigación)"
      ],
      progress: 40,
      roadmapStage: "Investigación"
    }
  ];

  const financeIntegrations = [
    {
      name: "Tenpo",
      type: "Billetera digital",
      description: "Queremos que puedas revisar y organizar tu Tenpo desde un solo lugar. Súmate para recibir novedades.",
      capabilities: [
        "Recargas rápidas planificadas",
        "Alertas de gastos personales",
        "Seguimiento de cashback",
        "Sincronización segura (en desarrollo)"
      ],
      status: "comingSoon"
    },
    {
      name: "Belvo",
      type: "Agregador financiero",
      description: "Estamos evaluando conectores personales con Belvo para importar tus cuentas favoritas de forma responsable.",
      capabilities: [
        "Integración con bancos chilenos",
        "Control granular de permisos",
        "Actualizaciones periódicas",
        "Cumplimiento de estándares internacionales"
      ],
      status: "comingSoon"
    },
    {
      name: "Fintoc",
      type: "Open Banking chileno",
      description: "Exploramos una conexión con Fintoc para traer tus datos financieros cuando esté listo.",
      capabilities: [
        "Importación de movimientos (en investigación)",
        "Conciliación automática planificada",
        "Insights de presupuesto",
        "Exportaciones seguras"
      ],
      status: "comingSoon"
    },
    {
      name: "Mercado Pago",
      type: "Pagos y billetera",
      description: "Planeamos ayudarte a monitorear tus cobros y pagos de Mercado Pago en una vista personal.",
      capabilities: [
        "Resumen de ventas (en diseño)",
        "Alertas de saldo",
        "Gestión de suscripciones",
        "Reportes descargables"
      ],
      status: "comingSoon"
    }
  ];

  const bankStatusConfig = {
    comingSoon: {
      label: "Próximamente",
      variant: "secondary"
    }
  } as const;

  const financeStatusConfig = {
    comingSoon: {
      label: "Próximamente",
      variant: "secondary",
      disabled: true
    }
  } as const;

  const securityFeatures = [
    {
      icon: Shield,
      title: "Cifrado de Extremo a Extremo",
      description: "Toda la comunicación utiliza TLS 1.3 y cifrado AES-256"
    },
    {
      icon: Lock,
      title: "OAuth 2.0 + PKCE",
      description: "Autenticación segura sin almacenar credenciales bancarias"
    },
    {
      icon: CheckCircle,
      title: "Certificación PCI DSS",
      description: "Cumplimiento de estándares internacionales de seguridad"
    },
    {
      icon: Activity,
      title: "Monitoreo 24/7",
      description: "Supervisión continua de todas las integraciones"
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
              <Plug className="w-4 h-4" />
              Integraciones
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Imagina tu <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>panel financiero</span> personal
            </h1>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Estamos construyendo prototipos para que personas como tú puedan centralizar su dinero cuando las conexiones estén listas.
            </p>
          </div>
        </div>
      </section>

      {/* Integration Process */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Así imaginamos el proceso</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Queremos que conectar tus cuentas personales sea simple. Estas son las etapas que estamos diseñando.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Elige tus servicios prioritarios</h3>
              <p className="text-sm text-muted-foreground">Cuéntanos qué bancos o billeteras te gustaría conectar primero.</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Confirma tu interés</h3>
              <p className="text-sm text-muted-foreground">Nos dejas tu correo para avisarte cuando abramos cada conexión.</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Recibe avances</h3>
              <p className="text-sm text-muted-foreground">Compartimos hitos y prototipos para que veas cómo progresa la integración.</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold mb-2">Activa tu panel</h3>
              <p className="text-sm text-muted-foreground">Te avisaremos cuando puedas sincronizar tu información personal con SalomonAI.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Bank Integrations */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Bancos en nuestra hoja de ruta</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Estamos priorizando estas entidades según el interés de personas que buscan controlar su dinero desde SalomonAI.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bankIntegrations.map((bank, index) => {
              const statusInfo = bankStatusConfig[bank.status as keyof typeof bankStatusConfig] ?? {
                label: "En exploración",
                variant: "outline"
              };

              return (
                <Card
                  key={index}
                  className="bg-gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300"
                  aria-disabled={bank.status !== "available"}
                  title={statusInfo.label}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-4xl">{bank.logo}</div>
                      <Badge
                        variant={statusInfo.variant}
                        className="text-primary-foreground"
                        title={statusInfo.label}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{bank.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{bank.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Avance:</span>
                          <div className="font-medium text-primary">{bank.progress}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Etapa:</span>
                          <div className="font-medium">{bank.roadmapStage}</div>
                        </div>
                      </div>
                      <Progress value={bank.progress} className="h-1" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Servicios planificados:</h4>
                        {bank.features.map((feature, idx) => (
                          <div key={idx} className="text-xs bg-secondary/30 px-2 py-1 rounded">
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Financial Services */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Servicios en preparación</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Estas son las billeteras y plataformas que priorizamos según el interés de nuestra comunidad.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {financeIntegrations.map((service, index) => {
              const statusInfo = financeStatusConfig[service.status as keyof typeof financeStatusConfig] ?? {
                label: "En exploración",
                variant: "outline",
                disabled: false
              };

              return (
                <Card
                  key={index}
                  className="bg-gradient-card border-primary/20"
                  aria-disabled={statusInfo.disabled}
                  title={statusInfo.label}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {service.type}
                      </Badge>
                      <Badge
                        variant={statusInfo.variant}
                        className="text-primary-foreground"
                        title={statusInfo.label}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <p className="text-muted-foreground">{service.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {service.capabilities.map((capability, idx) => (
                        <div key={idx} className="text-sm bg-primary/10 text-primary px-2 py-1 rounded text-center">
                          {capability}
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      disabled={statusInfo.disabled}
                      className="mt-4 w-full"
                      title={statusInfo.disabled ? "Próximamente" : undefined}
                    >
                      {statusInfo.disabled ? "Próximamente" : "Unirme a la lista"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Seguridad de Integraciones</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Diseñamos nuestras integraciones proyectadas con los más altos estándares de seguridad desde el primer día
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20 text-center p-6">
                  <IconComponent className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">
            ¿Tu Banco no Está en la Lista?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Estamos explorando nuevas integraciones constantemente. Cuéntanos cuál te interesa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Solicitar Integración
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary">
              Ver Catálogo
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
