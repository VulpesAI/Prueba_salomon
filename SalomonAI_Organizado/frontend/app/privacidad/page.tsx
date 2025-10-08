"use client";

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Eye, 
  Lock,
  UserCheck,
  Database,
  Download,
  Mail,
  Calendar,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export default function PrivacidadPage() {
  const dataTypes = [
    {
      icon: UserCheck,
      category: "Datos Personales",
      description: "Información básica de identificación",
      items: ["Nombre completo", "Email", "Teléfono", "Dirección"],
      retention: "Mientras la cuenta esté activa"
    },
    {
      icon: Database,
      category: "Datos Financieros",
      description: "Información de cuentas y transacciones",
      items: ["Balances", "Transacciones", "Categorías", "Presupuestos"],
      retention: "2 años después del cierre de cuenta"
    },
    {
      icon: Settings,
      category: "Datos de Uso",
      description: "Información sobre el uso de la plataforma",
      items: ["Logs de actividad", "Preferencias", "Configuraciones", "Métricas"],
      retention: "1 año desde la última actividad"
    }
  ];

  const rights = [
    {
      title: "Derecho de Acceso",
      description: "Solicita una copia completa de todos tus datos personales que tenemos almacenados",
      action: "Descargar mis datos"
    },
    {
      title: "Derecho de Rectificación",
      description: "Corrige cualquier información personal inexacta o incompleta",
      action: "Actualizar información"
    },
    {
      title: "Derecho de Portabilidad",
      description: "Recibe tus datos en un formato estructurado y legible por máquina",
      action: "Exportar datos"
    },
    {
      title: "Derecho al Olvido",
      description: "Solicita la eliminación de tus datos personales de nuestros sistemas",
      action: "Eliminar cuenta"
    },
    {
      title: "Derecho de Oposición",
      description: "Oponte al procesamiento de tus datos para fines específicos",
      action: "Gestionar consentimientos"
    },
    {
      title: "Derecho de Limitación",
      description: "Solicita la restricción del procesamiento de tus datos",
      action: "Limitar procesamiento"
    }
  ];

  const cookieTypes = [
    {
      type: "Estrictamente Necesarias",
      description: "Esenciales para el funcionamiento del sitio web",
      examples: ["Sesión de usuario", "Preferencias de idioma", "Configuración de seguridad"],
      required: true
    },
    {
      type: "Funcionales",
      description: "Mejoran la funcionalidad y personalización",
      examples: ["Recordar configuraciones", "Historial de navegación", "Preferencias UI"],
      required: false
    },
    {
      type: "Analíticas",
      description: "Nos ayudan a entender cómo usas la plataforma",
      examples: ["Google Analytics", "Métricas de uso", "Rendimiento del sitio"],
      required: false
    },
    {
      type: "Marketing",
      description: "Utilizadas para publicidad y marketing dirigido",
      examples: ["Seguimiento de conversiones", "Retargeting", "Personalización de anuncios"],
      required: false
    }
  ];

  const principles = [
    {
      icon: Lock,
      title: "Minimización de Datos",
      description: "Solo recopilamos los datos estrictamente necesarios para proporcionar nuestros servicios"
    },
    {
      icon: Shield,
      title: "Propósito Limitado",
      description: "Utilizamos tus datos únicamente para los fines declarados explícitamente"
    },
    {
      icon: Eye,
      title: "Transparencia Total",
      description: "Siempre serás informado sobre qué datos recopilamos y por qué"
    },
    {
      icon: CheckCircle,
      title: "Consentimiento Informado",
      description: "Obtenemos tu consentimiento explícito antes de procesar datos sensibles"
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
              <Shield className="w-4 h-4 mr-2" />
              Privacidad
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Tu Privacidad es <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>Nuestra Prioridad</span>
            </h1>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Comprometidos con la protección y el respeto de tu información personal
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Principles */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Nuestros Principios de Privacidad</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Fundamentos que guían nuestra política de protección de datos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((principle, index) => {
              const IconComponent = principle.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20 text-center p-6">
                  <IconComponent className="w-12 h-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-lg mb-2">{principle.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{principle.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data Types */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">¿Qué Datos Recopilamos?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Detalle completo de los tipos de información que manejamos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {dataTypes.map((dataType, index) => {
              const IconComponent = dataType.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20">
                  <CardHeader>
                    <IconComponent className="w-12 h-12 text-primary mb-4" />
                    <CardTitle className="text-xl">{dataType.category}</CardTitle>
                    <p className="text-muted-foreground">{dataType.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Incluye:</h4>
                        <ul className="space-y-1">
                          {dataType.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-center">
                              <CheckCircle className="w-3 h-3 text-primary mr-2" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-2 border-t">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {dataType.retention}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* User Rights */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Tus Derechos</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Control total sobre tu información personal
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rights.map((right, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">{right.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">{right.description}</p>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    {right.action}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cookies Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Uso de Cookies</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Transparencia completa sobre las cookies que utilizamos
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {cookieTypes.map((cookie, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cookie.type}</CardTitle>
                    <Badge variant={cookie.required ? "default" : "secondary"}>
                      {cookie.required ? "Requeridas" : "Opcionales"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{cookie.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Ejemplos:</h4>
                    {cookie.examples.map((example, idx) => (
                      <div key={idx} className="text-sm bg-secondary/30 px-2 py-1 rounded">
                        {example}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Data Sharing */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Compartir Información</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cuándo y con quién compartimos tus datos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-card border-green-500/20 text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-green-700">Lo que SÍ hacemos</h3>
              <ul className="text-sm text-left space-y-2">
                <li>✓ Compartir con tu consentimiento explícito</li>
                <li>✓ Proveedores de servicios certificados</li>
                <li>✓ Cumplimiento de órdenes legales</li>
                <li>✓ Agregación de datos anónimos</li>
              </ul>
            </Card>

            <Card className="bg-gradient-card border-red-500/20 text-center p-8">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-red-700">Lo que NO hacemos</h3>
              <ul className="text-sm text-left space-y-2">
                <li>✗ Vender datos a terceros</li>
                <li>✗ Publicidad dirigida externa</li>
                <li>✗ Compartir sin consentimiento</li>
                <li>✗ Transferir a países sin protección</li>
              </ul>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-8">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Siempre Protegido</h3>
              <ul className="text-sm text-left space-y-2">
                <li>• Contratos de confidencialidad</li>
                <li>• Cifrado en tránsito y reposo</li>
                <li>• Auditorías regulares</li>
                <li>• Monitoreo continuo</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-card border-primary/20 text-center p-12 max-w-3xl mx-auto">
            <Mail className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Preguntas sobre Privacidad</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Nuestro Oficial de Protección de Datos está disponible para resolver todas tus dudas
            </p>
            <div className="bg-secondary/30 p-4 rounded-lg mb-6">
              <p className="font-mono text-sm">privacy@salomonai.com</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Política Completa
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Mis Datos
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  );
}
