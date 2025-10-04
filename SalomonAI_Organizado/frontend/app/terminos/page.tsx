"use client";

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Mail,
  Users,
  Shield,
  Gavel,
  Globe
} from "lucide-react";

export default function TerminosPage() {
  const sections = [
    {
      title: "1. Definiciones",
      content: [
        "SalomonAI: La plataforma de gestión financiera inteligente",
        "Usuario: Persona que utiliza nuestros servicios",
        "Servicios: Todas las funcionalidades ofrecidas por la plataforma",
        "Datos Financieros: Información bancaria y transaccional del usuario"
      ]
    },
    {
      title: "2. Aceptación de Términos",
      content: [
        "Al registrarte aceptas estos términos en su totalidad",
        "Los términos pueden modificarse con 30 días de aviso previo",
        "El uso continuado implica aceptación de cambios",
        "Debes tener al menos 18 años para usar el servicio"
      ]
    },
    {
      title: "3. Uso Permitido",
      content: [
        "Uso personal y comercial legítimo únicamente",
        "Prohibido el uso para actividades ilegales",
        "No compartir credenciales de acceso",
        "Reportar inmediatamente uso no autorizado"
      ]
    },
    {
      title: "4. Privacidad y Datos",
      content: [
        "Protección de datos según estándares internacionales",
        "No vendemos información personal a terceros",
        "Uso de datos limitado a provisión de servicios",
        "Derecho a solicitar eliminación de datos"
      ]
    }
  ];

  const responsibilities = [
    {
      icon: Users,
      title: "Del Usuario",
      items: [
        "Proporcionar información veraz y actualizada",
        "Mantener la seguridad de su cuenta",
        "Cumplir con las leyes aplicables",
        "Reportar problemas o irregularidades"
      ]
    },
    {
      icon: Shield,
      title: "De SalomonAI",
      items: [
        "Proteger la información del usuario",
        "Proporcionar servicios de calidad",
        "Mantener la plataforma funcionando",
        "Comunicar cambios importantes"
      ]
    }
  ];

  const limitations = [
    {
      type: "Disponibilidad del Servicio",
      description: "Nos esforzamos por mantener 99.9% de disponibilidad, pero no garantizamos servicio ininterrumpido",
      coverage: "Mantenimiento programado notificado con 48h de anticipación"
    },
    {
      type: "Exactitud de Datos",
      description: "Los datos provienen de fuentes bancarias, pero pueden contener errores o demoras",
      coverage: "Verificación continua y corrección de inconsistencias detectadas"
    },
    {
      type: "Consejos Financieros",
      description: "Nuestros insights son informativos, no constituyen asesoría financiera profesional",
      coverage: "Recomendamos consultar con asesores certificados para decisiones importantes"
    },
    {
      type: "Pérdidas Indirectas",
      description: "No nos responsabilizamos por pérdidas indirectas o consecuenciales",
      coverage: "Responsabilidad limitada al valor de la suscripción anual"
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
              <FileText className="w-4 h-4 mr-2" />
              Términos y Condiciones
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Términos de <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>Servicio</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Condiciones claras y transparentes para el uso de SalomonAI
            </p>
            <div className="flex items-center justify-center gap-2 mt-6">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Última actualización: 15 de Diciembre, 2024</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Terms */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Términos Principales</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Los aspectos más importantes de nuestro acuerdo de servicio
            </p>
          </div>

          <div className="grid gap-8 max-w-4xl mx-auto">
            {sections.map((section, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {section.content.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Responsibilities */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Responsabilidades</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Derechos y obligaciones de cada parte en el acuerdo
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {responsibilities.map((resp, index) => {
              const IconComponent = resp.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-8 h-8 text-primary" />
                      <CardTitle className="text-xl">{resp.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {resp.items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-primary mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
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

      {/* Limitations */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Limitaciones y Responsabilidad</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Alcance y límites de nuestra responsabilidad
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {limitations.map((limitation, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <CardTitle className="text-lg">{limitation.type}</CardTitle>
                  </div>
                  <p className="text-muted-foreground text-sm">{limitation.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary/30 p-3 rounded">
                    <p className="text-sm font-medium text-primary">{limitation.coverage}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Legal Information */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Información Legal</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Jurisdicción, disputas y procedimientos legales
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-gradient-card border-primary/20 text-center p-8">
              <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Jurisdicción</h3>
              <p className="text-muted-foreground">
                Estos términos se rigen por las leyes de Chile. 
                Cualquier disputa será resuelta en los tribunales de Santiago.
              </p>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-8">
              <Gavel className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Resolución de Disputas</h3>
              <p className="text-muted-foreground">
                Preferimos resolver disputas mediante mediación antes 
                de proceder con acciones legales formales.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-card border-primary/20 text-center p-12 max-w-3xl mx-auto">
            <Mail className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">¿Preguntas sobre los Términos?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Nuestro equipo legal está disponible para aclarar cualquier duda
            </p>
            <div className="bg-secondary/30 p-4 rounded-lg mb-6">
              <p className="font-mono text-sm">legal@salomonai.com</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Contactar Equipo Legal
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  );
}
