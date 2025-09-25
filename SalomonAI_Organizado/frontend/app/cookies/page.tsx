"use client";

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Cookie, 
  Settings, 
  Eye,
  BarChart3,
  Target,
  Shield,
  CheckCircle,
  X,
  Calendar,
  Trash2,
  Download,
  RefreshCw
} from "lucide-react";
import { useState } from "react";

export default function CookiesPage() {
  const [cookieSettings, setCookieSettings] = useState({
    functional: true,
    analytics: false,
    marketing: false
  });

  const cookieTypes = [
    {
      id: 'essential',
      icon: Shield,
      name: "Cookies Esenciales",
      description: "Necesarias para el funcionamiento básico del sitio web",
      examples: ["Sesión de usuario", "Configuración de idioma", "Tokens de seguridad"],
      required: true,
      enabled: true,
      duration: "Hasta el cierre del navegador o logout"
    },
    {
      id: 'functional',
      icon: Settings,
      name: "Cookies Funcionales",
      description: "Mejoran la experiencia del usuario y personalizan funciones",
      examples: ["Preferencias de dashboard", "Tema oscuro/claro", "Configuraciones guardadas"],
      required: false,
      enabled: cookieSettings.functional,
      duration: "30 días"
    },
    {
      id: 'analytics',
      icon: BarChart3,
      name: "Cookies Analíticas",
      description: "Nos ayudan a entender cómo los usuarios interactúan con la plataforma",
      examples: ["Google Analytics", "Métricas de uso", "Rutas de navegación"],
      required: false,
      enabled: cookieSettings.analytics,
      duration: "2 años"
    },
    {
      id: 'marketing',
      icon: Target,
      name: "Cookies de Marketing",
      description: "Utilizadas para mostrar publicidad relevante y medir campañas",
      examples: ["Seguimiento de conversiones", "Retargeting", "Publicidad personalizada"],
      required: false,
      enabled: cookieSettings.marketing,
      duration: "1 año"
    }
  ];

  const thirdPartyServices = [
    {
      name: "Google Analytics",
      purpose: "Análisis de uso del sitio web",
      type: "analytics",
      cookies: ["_ga", "_ga_*", "_gid"],
      privacy: "https://policies.google.com/privacy"
    },
    {
      name: "Mixpanel",
      purpose: "Análisis de comportamiento de usuarios",
      type: "analytics",
      cookies: ["mp_*", "__mplxopt_out"],
      privacy: "https://mixpanel.com/legal/privacy-policy"
    },
    {
      name: "Intercom",
      purpose: "Chat de soporte al cliente",
      type: "functional",
      cookies: ["intercom-*", "intercom-session-*"],
      privacy: "https://www.intercom.com/legal/privacy"
    },
    {
      name: "Facebook Pixel",
      purpose: "Seguimiento de conversiones publicitarias",
      type: "marketing",
      cookies: ["_fbp", "_fbc", "fr"],
      privacy: "https://www.facebook.com/privacy/policy"
    }
  ];

  const handleCookieToggle = (cookieType: string) => {
    setCookieSettings(prev => ({
      ...prev,
      [cookieType]: !prev[cookieType as keyof typeof prev]
    }));
  };

  const acceptAll = () => {
    setCookieSettings({
      functional: true,
      analytics: true,
      marketing: true
    });
  };

  const rejectAll = () => {
    setCookieSettings({
      functional: false,
      analytics: false,
      marketing: false
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary">
              <Cookie className="w-4 h-4 mr-2" />
              Política de Cookies
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Gestión de <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>Cookies</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Control total sobre las cookies y el seguimiento en SalomonAI
            </p>
            <div className="flex items-center justify-center gap-2 mt-6">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Última actualización: 15 de Diciembre, 2024</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cookie Settings */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Configuración de Cookies</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Personaliza qué tipos de cookies quieres permitir
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {cookieTypes.map((cookie, index) => {
              const IconComponent = cookie.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-8 h-8 text-primary" />
                        <div>
                          <CardTitle className="text-xl">{cookie.name}</CardTitle>
                          <p className="text-muted-foreground">{cookie.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {cookie.required ? (
                          <Badge variant="default">Requeridas</Badge>
                        ) : (
                          <Switch
                            checked={cookie.enabled}
                            onCheckedChange={() => handleCookieToggle(cookie.id)}
                            disabled={cookie.required}
                          />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Ejemplos de uso:</h4>
                        <ul className="space-y-1">
                          {cookie.examples.map((example, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-center">
                              <CheckCircle className="w-3 h-3 text-primary mr-2" />
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Duración:</h4>
                        <p className="text-sm text-muted-foreground">{cookie.duration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button onClick={acceptAll} size="lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              Aceptar Todas
            </Button>
            <Button onClick={rejectAll} variant="outline" size="lg">
              <X className="w-4 h-4 mr-2" />
              Rechazar Opcionales
            </Button>
            <Button variant="secondary" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Guardar Preferencias
            </Button>
          </div>
        </div>
      </section>

      {/* Third Party Services */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Servicios de Terceros</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cookies utilizadas por servicios externos integrados en la plataforma
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {thirdPartyServices.map((service, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {service.type}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{service.purpose}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Cookies utilizadas:</h4>
                      <div className="flex flex-wrap gap-1">
                        {service.cookies.map((cookie, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-mono">
                            {cookie}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Política de Privacidad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cookie Management */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Gestión de Cookies</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Herramientas para controlar y eliminar cookies existentes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <Trash2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-lg mb-2">Eliminar Cookies</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Borra todas las cookies no esenciales de tu navegador
              </p>
              <Button variant="outline" size="sm">
                Eliminar Ahora
              </Button>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <RefreshCw className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-lg mb-2">Restablecer Configuración</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Vuelve a la configuración predeterminada de cookies
              </p>
              <Button variant="outline" size="sm">
                Restablecer
              </Button>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <Download className="w-12 h-12 text-primary mx-auto mb-4" />
              <CardTitle className="text-lg mb-2">Exportar Preferencias</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Descarga un archivo con tu configuración actual
              </p>
              <Button variant="outline" size="sm">
                Descargar
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Browser Settings */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Configuración del Navegador</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cómo gestionar cookies directamente desde tu navegador web
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="text-4xl mb-4">🌐</div>
              <CardTitle className="text-lg mb-2">Chrome</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Configuración → Privacidad y seguridad → Cookies
              </p>
              <Button variant="outline" size="sm">
                Guía Detallada
              </Button>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="text-4xl mb-4">🦊</div>
              <CardTitle className="text-lg mb-2">Firefox</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Opciones → Privacidad y seguridad → Cookies
              </p>
              <Button variant="outline" size="sm">
                Guía Detallada
              </Button>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="text-4xl mb-4">🧭</div>
              <CardTitle className="text-lg mb-2">Safari</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Preferencias → Privacidad → Cookies
              </p>
              <Button variant="outline" size="sm">
                Guía Detallada
              </Button>
            </Card>

            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <div className="text-4xl mb-4">📱</div>
              <CardTitle className="text-lg mb-2">Móviles</CardTitle>
              <p className="text-sm text-muted-foreground mb-4">
                Configuración específica para iOS y Android
              </p>
              <Button variant="outline" size="sm">
                Guía Detallada
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-card border-primary/20 text-center p-12 max-w-3xl mx-auto">
            <Cookie className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">¿Necesitas Ayuda con las Cookies?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Nuestro equipo de soporte puede ayudarte a configurar tus preferencias de cookies
            </p>
            <div className="bg-secondary/30 p-4 rounded-lg mb-6">
              <p className="font-mono text-sm">cookies@salomonai.com</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                Centro de Preferencias
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Descargar Política
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </main>
  );
}
