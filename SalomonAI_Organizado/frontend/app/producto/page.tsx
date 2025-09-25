"use client";

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Zap, 
  Shield, 
  TrendingUp, 
  MessageSquare,
  Smartphone,
  Link,
  Target,
  CheckCircle,
  ArrowRight
} from "lucide-react";

export default function ProductoPage() {
  const features = [
    {
      icon: Brain,
      title: "IA Avanzada de Categorización",
      description: "Nuestro motor de inteligencia artificial categoriza automáticamente tus transacciones con 94% de precisión, aprendiendo continuamente de tus patrones únicos.",
      benefits: ["Categorización automática", "Aprendizaje continuo", "94% de precisión", "Personalización total"]
    },
    {
      icon: MessageSquare,
      title: "Consultas en Lenguaje Natural",
      description: "Pregunta en español cotidiano sobre tus finanzas. '¿Cuánto gasté en supermercados esta semana?' y obtén respuestas inmediatas.",
      benefits: ["Procesamiento de lenguaje natural", "Respuestas instantáneas", "Interfaz conversacional", "Sin curva de aprendizaje"]
    },
    {
      icon: TrendingUp,
      title: "Análisis Predictivo",
      description: "Proyectamos tus gastos futuros, identificamos tendencias y te alertamos sobre posibles problemas financieros antes de que ocurran.",
      benefits: ["Predicción de gastos", "Identificación de tendencias", "Alertas proactivas", "Planificación inteligente"]
    },
    {
      icon: Target,
      title: "Metas Inteligentes",
      description: "Define objetivos de ahorro e inversión que se ajustan automáticamente según tus patrones de gasto y ingresos reales.",
      benefits: ["Metas adaptativas", "Seguimiento automático", "Recomendaciones personalizadas", "Gamificación"]
    },
    {
      icon: Link,
      title: "Integración Bancaria Total",
      description: "Conecta con todos los principales bancos chilenos de forma segura. Sincronización automática sin compartir credenciales.",
      benefits: ["Todos los bancos chilenos", "Conexión segura", "Sincronización automática", "Sin credenciales compartidas"]
    },
    {
      icon: Shield,
      title: "Seguridad Bancaria",
      description: "Cumplimos con los más altos estándares de seguridad financiera. Certificaciones PCI DSS y cifrado de grado bancario.",
      benefits: ["Certificación PCI DSS", "Cifrado AES-256", "Auditorías regulares", "Cumplimiento regulatorio"]
    }
  ];

  const useCases = [
    {
      title: "Para Profesionales",
      description: "Optimiza tu presupuesto personal y planifica inversiones inteligentes",
      points: ["Control de gastos profesionales", "Planificación de inversiones", "Análisis de ROI personal", "Optimización tributaria"]
    },
    {
      title: "Para Familias",
      description: "Gestiona el presupuesto familiar y enseña educación financiera",
      points: ["Presupuesto familiar compartido", "Control de gastos por categoría", "Metas de ahorro familiares", "Educación financiera para hijos"]
    },
    {
      title: "Para Emprendedores",
      description: "Separa finanzas personales del negocio y optimiza flujo de caja",
      points: ["Separación de cuentas", "Análisis de flujo de caja", "Predicción de ingresos", "Control de gastos empresariales"]
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
              <Brain className="w-4 h-4 mr-2" />
              Producto
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              La Inteligencia Financiera que <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>Chile Necesita</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              SalomonAI combina inteligencia artificial avanzada con conocimiento profundo del sistema financiero chileno para revolucionar cómo manejas tu dinero.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-3">
                <Zap className="w-5 h-5 mr-2" />
                Comenzar Gratis
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Ver Demo en Vivo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Características Principales</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cada característica está diseñada específicamente para el mercado financiero chileno
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300">
                  <CardHeader>
                    <IconComponent className="w-12 h-12 text-primary mb-4" />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm">{benefit}</span>
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

      {/* Use Cases */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">¿Para Quién es SalomonAI?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Diseñado para adaptarse a diferentes necesidades y estilos de vida
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20 text-center p-8">
                <CardHeader>
                  <CardTitle className="text-2xl mb-4">{useCase.title}</CardTitle>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {useCase.points.map((point, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-left">
                        <ArrowRight className="w-4 h-4 text-primary" />
                        <span className="text-sm">{point}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Tecnología de Vanguardia</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Construido con las tecnologías más avanzadas para garantizar rendimiento y seguridad
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <Brain className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Machine Learning</h3>
              <p className="text-sm text-muted-foreground">Algoritmos de aprendizaje profundo entrenados específicamente con datos financieros chilenos</p>
            </Card>
            
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <MessageSquare className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">NLP Avanzado</h3>
              <p className="text-sm text-muted-foreground">Procesamiento de lenguaje natural optimizado para el español chileno y términos financieros locales</p>
            </Card>
            
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seguridad</h3>
              <p className="text-sm text-muted-foreground">Infraestructura de grado bancario con certificaciones internacionales de seguridad</p>
            </Card>
            
            <Card className="bg-gradient-card border-primary/20 text-center p-6">
              <Smartphone className="w-16 h-16 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multi-Plataforma</h3>
              <p className="text-sm text-muted-foreground">Experiencia consistente en web, móvil y API para desarrolladores</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">
            ¿Listo para Transformar tus Finanzas?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Únete a miles de chilenos que ya están tomando mejores decisiones financieras con SalomonAI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Comenzar Gratis Ahora
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary">
              Agendar Demo
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
