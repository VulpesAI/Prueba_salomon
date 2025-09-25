"use client";

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Lock, 
  Eye,
  CheckCircle,
  AlertTriangle,
  Key,
  Database,
  Award,
  Clock,
  Users
} from "lucide-react";

export default function SeguridadPage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "Cifrado de Extremo a Extremo",
      description: "Todos los datos se cifran usando AES-256 antes de ser transmitidos o almacenados",
      details: ["TLS 1.3 para transmisión", "AES-256 para almacenamiento", "Claves rotadas automáticamente"]
    },
    {
      icon: Shield,
      title: "Autenticación Multi-Factor",
      description: "Protección adicional con 2FA obligatorio para todas las cuentas",
      details: ["SMS y Apps autenticadoras", "Tokens de hardware compatibles", "Backup codes seguros"]
    },
    {
      icon: Key,
      title: "OAuth 2.0 + PKCE",
      description: "Nunca almacenamos tus credenciales bancarias, solo tokens seguros",
      details: ["Sin almacenamiento de passwords", "Tokens con expiración", "Revocación instantánea"]
    },
    {
      icon: Database,
      title: "Infraestructura Segura",
      description: "Servidores en data centers certificados con monitoreo 24/7",
      details: ["ISO 27001 certificado", "Redundancia geográfica", "Backups encriptados"]
    },
    {
      icon: Eye,
      title: "Auditorías Continuas",
      description: "Pruebas de penetración regulares y auditorías de seguridad independientes",
      details: ["Penetration testing mensual", "Auditorías anuales externas", "Bug bounty program"]
    },
    {
      icon: Users,
      title: "Control de Acceso",
      description: "Principio de menor privilegio y segregación de roles estricta",
      details: ["RBAC implementado", "Logs de acceso completos", "Revisión de permisos automática"]
    }
  ];

  const certifications = [
    {
      name: "SOC 2 Type II",
      description: "Certificación de controles de seguridad organizacionales",
      status: "Vigente",
      validUntil: "2024-12-31"
    },
    {
      name: "ISO 27001",
      description: "Estándar internacional de gestión de seguridad de la información",
      status: "Vigente",
      validUntil: "2025-03-15"
    },
    {
      name: "PCI DSS Level 1",
      description: "Cumplimiento para manejo seguro de datos de tarjetas",
      status: "Vigente",
      validUntil: "2024-11-20"
    },
    {
      name: "GDPR Compliant",
      description: "Cumplimiento del Reglamento General de Protección de Datos",
      status: "Vigente",
      validUntil: "Permanente"
    }
  ];

  const incidentResponse = [
    {
      step: "1",
      title: "Detección",
      description: "Sistemas automatizados de monitoreo 24/7 detectan anomalías",
      timeframe: "< 1 minuto"
    },
    {
      step: "2",
      title: "Análisis",
      description: "Equipo de seguridad evalúa la naturaleza y alcance del incidente",
      timeframe: "< 5 minutos"
    },
    {
      step: "3",
      title: "Contención",
      description: "Aislamiento inmediato del problema para prevenir propagación",
      timeframe: "< 15 minutos"
    },
    {
      step: "4",
      title: "Notificación",
      description: "Comunicación a usuarios afectados y autoridades según corresponda",
      timeframe: "< 24 horas"
    },
    {
      step: "5",
      title: "Resolución",
      description: "Eliminación completa de la amenaza y restauración de servicios",
      timeframe: "< 72 horas"
    },
    {
      step: "6",
      title: "Post-Mortem",
      description: "Análisis completo y mejoras para prevenir futuros incidentes",
      timeframe: "< 1 semana"
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
              <Shield className="w-4 h-4 mr-2" />
              Seguridad
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Seguridad de <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>Nivel Bancario</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Protegemos tu información financiera con los más altos estándares de seguridad de la industria
            </p>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Características de Seguridad</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Múltiples capas de protección para garantizar la máxima seguridad de tus datos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {securityFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20 h-full">
                  <CardHeader>
                    <IconComponent className="w-12 h-12 text-primary mb-4" />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Certificaciones y Cumplimiento</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cumplimos con los estándares más estrictos de la industria financiera
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20 text-center p-6">
                <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-lg mb-2">{cert.name}</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">{cert.description}</p>
                <Badge variant="default" className="mb-2">
                  {cert.status}
                </Badge>
                <div className="text-xs text-muted-foreground flex items-center justify-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Válido hasta {cert.validUntil}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Incident Response */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Plan de Respuesta a Incidentes</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Protocolo estructurado para manejar cualquier situación de seguridad de manera efectiva
            </p>
          </div>

          <div className="grid gap-6">
            {incidentResponse.map((step, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {step.timeframe}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Monitoring */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Monitoreo y Detección</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Supervisión continua con tecnología de última generación
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-card border-primary/20 text-center p-8">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <h3 className="text-lg font-semibold mb-2">Monitoreo Continuo</h3>
              <p className="text-muted-foreground">Vigilancia ininterrumpida de todos los sistemas</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-8">
              <div className="text-4xl font-bold text-primary mb-2">AI</div>
              <h3 className="text-lg font-semibold mb-2">Detección Inteligente</h3>
              <p className="text-muted-foreground">Machine learning para identificar anomalías</p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-8">
              <div className="text-4xl font-bold text-primary mb-2">&lt;1s</div>
              <h3 className="text-lg font-semibold mb-2">Respuesta Inmediata</h3>
              <p className="text-muted-foreground">Alertas y respuesta automática instantánea</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Contact */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-card border-primary/20 text-center p-12 max-w-3xl mx-auto">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">¿Encontraste una Vulnerabilidad?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Reporta responsablemente cualquier problema de seguridad a nuestro equipo especializado
            </p>
            <div className="bg-secondary/30 p-4 rounded-lg mb-6">
              <p className="font-mono text-sm">security@salomonai.com</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Todos los reportes son investigados dentro de 24 horas. Ofrecemos recompensas por vulnerabilidades válidas.
            </p>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  );
}
