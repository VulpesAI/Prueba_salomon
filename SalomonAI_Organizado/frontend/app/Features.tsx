import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  MessageSquare, 
  Shield, 
  TrendingUp, 
  Smartphone, 
  Link,
  AlertTriangle,
  Target,
  Banknote
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "IA Personalizada",
      description: "Aprende de tus hábitos únicos y se adapta a tu estilo de vida financiero",
      badge: "Adaptativo",
      color: "text-primary"
    },
    {
      icon: MessageSquare,
      title: "Consultas Naturales",
      description: "Pregunta en español: '¿Cuánto gasté en farmacias este mes?'",
      badge: "NLP",
      color: "text-blue-400"
    },
    {
      icon: Link,
      title: "Integración Bancaria",
      description: "Conecta con Banco de Chile, Santander, BCI y más vía Belvo",
      badge: "API Segura",
      color: "text-green-400"
    },
    {
      icon: TrendingUp,
      title: "Análisis Predictivo",
      description: "Proyecta gastos futuros y identifica tendencias automáticamente",
      badge: "Predicción",
      color: "text-purple-400"
    },
    {
      icon: AlertTriangle,
      title: "Alertas Inteligentes",
      description: "Notificaciones contextuales sobre gastos inusuales o metas",
      badge: "Real-time",
      color: "text-orange-400"
    },
    {
      icon: Target,
      title: "Metas Personalizadas",
      description: "Define objetivos de ahorro e inversión con seguimiento automático",
      badge: "Objetivos",
      color: "text-cyan-400"
    },
    {
      icon: Shield,
      title: "Seguridad Bancaria",
      description: "Cifrado AES-256 y cumplimiento con Ley 19.628 chilena",
      badge: "Protegido",
      color: "text-red-400"
    },
    {
      icon: Banknote,
      title: "Asesoría Tributaria",
      description: "Optimización automática para declaración de renta y deducciones",
      badge: "SII",
      color: "text-yellow-400"
    },
    {
      icon: Smartphone,
      title: "Multiplataforma",
      description: "App móvil y web sincronizadas en tiempo real",
      badge: "Sync",
      color: "text-indigo-400"
    }
  ];

  return (
    <section className="py-20 bg-secondary/20" id="features">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary">
            Funcionalidades Avanzadas
          </Badge>
          <h2 className="text-4xl font-bold mb-6 text-foreground">
            Inteligencia Financiera Completa
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            SalomónAI combina tecnología de punta con conocimiento local para ofrecerte 
            la experiencia financiera más avanzada de Chile
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={index} 
                className="bg-gradient-card border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <IconComponent className={`w-8 h-8 ${feature.color}`} />
                    <Badge variant="outline" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Integration Showcase */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 text-foreground">
              Integraciones Nativas Chilenas
            </h3>
            <p className="text-lg text-muted-foreground">
              Conecta automáticamente con el ecosistema financiero local
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Banco de Chile", status: "Activo" },
              { name: "Santander", status: "Activo" },
              { name: "BCI", status: "Activo" },
              { name: "Falabella", status: "Próximamente" },
              { name: "SII", status: "Integrado" },
              { name: "Belvo API", status: "Certificado" },
              { name: "Fintoc", status: "Soporte" },
              { name: "MercadoPago", status: "Activo" }
            ].map((integration, index) => (
              <Card key={index} className="bg-gradient-card border-primary/20 p-4 text-center">
                <h4 className="font-semibold text-sm mb-2">{integration.name}</h4>
                <Badge 
                  variant={integration.status === "Activo" || integration.status === "Integrado" || integration.status === "Certificado" ? "default" : "secondary"}
                  className={integration.status === "Activo" || integration.status === "Integrado" || integration.status === "Certificado" ? "bg-primary text-primary-foreground" : ""}
                >
                  {integration.status}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;