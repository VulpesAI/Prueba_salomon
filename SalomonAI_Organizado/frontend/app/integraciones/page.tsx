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
  Lock
} from "lucide-react";

export default function IntegracionesPage() {
  const bankIntegrations = [
    {
      name: "Banco de Chile",
      logo: "🏦",
      status: "active",
      description: "Integración completa con API Open Banking",
      features: ["Cuentas Corrientes", "Tarjetas de Crédito", "Inversiones", "Histórico 2 años"],
      uptime: 99.9,
      responseTime: "120ms"
    },
    {
      name: "Santander Chile",
      logo: "🔴",
      status: "active",
      description: "Conexión directa con servicios Santander",
      features: ["Cuentas Vista", "Créditos", "Seguros", "SuperCuenta"],
      uptime: 99.7,
      responseTime: "95ms"
    },
    {
      name: "BCI",
      logo: "🔵",
      status: "active",
      description: "API certificada BCI para máxima seguridad",
      features: ["Cuentas Corrientes", "Tarjetas", "Créditos Hipotecarios", "Inversiones"],
      uptime: 99.8,
      responseTime: "110ms"
    },
    {
      name: "Banco Estado",
      logo: "🟢",
      status: "active",
      description: "Integración con el banco público más grande de Chile",
      features: ["CuentaRUT", "Tarjetas de Débito", "Créditos", "Beneficios Estatales"],
      uptime: 99.5,
      responseTime: "140ms"
    },
    {
      name: "Banco Security",
      logo: "🟡",
      status: "active",
      description: "Conexión especializada para banca privada",
      features: ["Cuentas Premium", "Inversiones", "Banca Privada", "Mesa de Dinero"],
      uptime: 99.6,
      responseTime: "105ms"
    },
    {
      name: "Banco Falabella",
      logo: "🟠",
      status: "active",
      description: "Integración retail banking y CMR",
      features: ["Cuenta Fan", "CMR Puntos", "Créditos", "Seguros"],
      uptime: 99.4,
      responseTime: "130ms"
    }
  ];

  const financeIntegrations = [
    {
      name: "Belvo",
      type: "Agregador Financiero",
      description: "Conexión oficial certificada para Open Banking en Chile",
      capabilities: ["15+ Bancos", "Datos en Tiempo Real", "Certificación PCI", "Cumplimiento PSD2"],
      status: "primary"
    },
    {
      name: "Tenpo",
      type: "Cuenta Digital",
      description: "Conecta tu billetera digital para sincronizar saldos y movimientos",
      capabilities: ["Pagos QR", "Tarjeta Prepago", "Transferencias Instantáneas", "Cashback"],
      status: "active"
    },
    {
      name: "Mach",
      type: "Wallet Personal",
      description: "Administra tus gastos diarios y tarjetas virtuales en un mismo lugar",
      capabilities: ["Tarjetas Virtuales", "Control de Suscripciones", "División de Gastos", "Recargas en línea"],
      status: "primary"
    },
    {
      name: "Fintual",
      type: "Inversión Personal",
      description: "Integra tus fondos de inversión para monitorear objetivos y rentabilidad",
      capabilities: ["Seguimiento de Metas", "Portafolios Diversificados", "Proyección de Rentabilidad", "Alertas de Desvíos"],
      status: "beta"
    }
  ];

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
    <main className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary">
              <Plug className="w-4 h-4 mr-2" />
              Integraciones
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Conecta con <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>Todo tu Ecosistema</span> Financiero
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              SalomonAI se integra con todos los principales bancos, servicios financieros y plataformas tecnológicas de Chile
            </p>
          </div>
        </div>
      </section>

      {/* Integration Process */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Proceso de Integración</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Conecta tus cuentas en minutos con nuestro proceso simplificado
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Selecciona tu Banco</h3>
              <p className="text-sm text-muted-foreground">Elige de nuestra lista de bancos integrados</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Autoriza Conexión</h3>
              <p className="text-sm text-muted-foreground">Autoriza de forma segura sin compartir credenciales</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Sincronización</h3>
              <p className="text-sm text-muted-foreground">Importamos automáticamente tu historial financiero</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold mb-2">¡Listo!</h3>
              <p className="text-sm text-muted-foreground">Comienza a usar SalomonAI inmediatamente</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Bank Integrations */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Bancos Integrados</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Conexión directa y segura con todos los principales bancos chilenos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bankIntegrations.map((bank, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="text-4xl">{bank.logo}</div>
                    <Badge variant={bank.status === "active" ? "default" : "secondary"} className="bg-primary text-primary-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Activo
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{bank.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{bank.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Uptime:</span>
                        <div className="font-medium text-primary">{bank.uptime}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latencia:</span>
                        <div className="font-medium">{bank.responseTime}</div>
                      </div>
                    </div>
                    <Progress value={bank.uptime} className="h-1" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Servicios Disponibles:</h4>
                      {bank.features.map((feature, idx) => (
                        <div key={idx} className="text-xs bg-secondary/30 px-2 py-1 rounded">
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Financial Services */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Servicios Financieros</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Integración con instituciones clave del sistema financiero chileno
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {financeIntegrations.map((service, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {service.type}
                    </Badge>
                    <Badge variant={
                      service.status === "primary" ? "default" : 
                      service.status === "active" ? "secondary" : "outline"
                    }>
                      {service.status === "primary" ? "Principal" : 
                       service.status === "active" ? "Activo" : "Beta"}
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Seguridad de Integraciones</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Todas nuestras integraciones cumplen con los más altos estándares de seguridad
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
            Estamos agregando nuevas integraciones constantemente. Solicita la tuya.
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
