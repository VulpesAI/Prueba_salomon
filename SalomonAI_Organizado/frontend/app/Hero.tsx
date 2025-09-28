import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Brain,
  TrendingUp,
  Shield,
  Zap,
  MessageSquare,
  PiggyBank,
  BarChart3,
  BellRing,
} from "lucide-react";
import heroImage from "@/assets/hero-financial.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroImage}
          alt="Panorama financiero inteligente"
          fill
          priority
          sizes="100vw"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/5 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-primary/5 rounded-full blur-lg animate-pulse delay-500" />
      </div>

      {/* Content */}
      <div className="relative z-20 container mx-auto px-6 text-center">
        <Badge variant="secondary" className="mb-6 bg-primary/20 text-primary border-primary/30">
          <Brain className="w-4 h-4 mr-2" />
          Inteligencia Artificial Financiera
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
          SalomónAI
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
          Tu asistente financiero inteligente que aprende de tus hábitos
        </p>
        
        <p className="text-lg text-muted-foreground/80 mb-12 max-w-2xl mx-auto">
          Categoriza automáticamente tus gastos, analiza patrones y te ayuda a tomar decisiones financieras más inteligentes
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button 
            size="lg" 
            className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-3"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Zap className="w-5 h-5 mr-2" />
            Comenzar Ahora
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="text-lg px-8 py-3 border-primary/30 hover:bg-primary/10"
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Ver Demo
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-gradient-card border-primary/20 p-6 hover:border-primary/40 transition-all duration-300">
            <TrendingUp className="w-12 h-12 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Análisis Inteligente</h3>
            <p className="text-muted-foreground text-sm">
              Comprende automáticamente tus patrones de gasto y sugiere optimizaciones
            </p>
          </Card>

          <Card className="bg-gradient-card border-primary/20 p-6 hover:border-primary/40 transition-all duration-300">
            <Brain className="w-12 h-12 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Aprendizaje Continuo</h3>
            <p className="text-muted-foreground text-sm">
              Se adapta a tu estilo de vida y mejora sus recomendaciones con el tiempo
            </p>
          </Card>

          <Card className="bg-gradient-card border-primary/20 p-6 hover:border-primary/40 transition-all duration-300">
            <Shield className="w-12 h-12 text-primary mb-4 mx-auto" />
            <h3 className="text-lg font-semibold mb-2">Seguridad Total</h3>
            <p className="text-muted-foreground text-sm">
              Cumple con la Ley 19.628 chilena y estándares internacionales de seguridad
            </p>
          </Card>
        </div>

        <div className="mt-16 grid gap-6 text-left lg:grid-cols-[1.2fr_1fr]">
          <Card className="bg-background/40 border-primary/20 backdrop-blur">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Asistente SalomonAI
              </CardTitle>
              <Badge variant="outline" className="w-fit border-primary/40 text-primary">
                En línea
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  AI
                </div>
                <div className="rounded-lg bg-secondary/60 p-3 text-foreground/90">
                  ¡Hola! Soy SalomonAI, tu copiloto financiero. Puedo ayudarte con tu presupuesto, metas de ahorro y alertarte de gastos poco saludables.
                </div>
              </div>
              <div className="flex items-start gap-3 justify-end">
                <div className="rounded-lg bg-primary/20 p-3 text-primary text-right max-w-xs">
                  ¿Cómo voy con mi meta de vacaciones?
                </div>
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-background">
                  Tú
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  AI
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  Llevas un 72% de tu objetivo y, si mantienes el ritmo, podrías alcanzarlo 3 semanas antes. Te sugiero automatizar $40.000 semanales para lograrlo con holgura.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-background/40 border-primary/20 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Dashboard en tiempo real
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Seguimiento de gastos, metas y liquidez al minuto
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                  <p className="text-xs uppercase text-primary/80">Ahorro sugerido</p>
                  <p className="text-2xl font-semibold text-primary">$85.000</p>
                  <p className="text-xs text-primary/80">Este mes podrías redirigirlo a tu fondo de viajes.</p>
                </div>
                <div className="rounded-lg border border-accent/20 bg-accent/10 p-4">
                  <p className="text-xs uppercase text-accent/80">Patrones detectados</p>
                  <p className="text-sm text-foreground/90">Los viernes aumentan tus gastos en delivery un 18%.</p>
                </div>
                <div className="rounded-lg border border-secondary/40 bg-secondary/50 p-4">
                  <p className="text-xs uppercase text-secondary-foreground/80">Liquidez actual</p>
                  <p className="text-2xl font-semibold text-foreground">$460.400</p>
                  <p className="text-xs text-muted-foreground">Disponibles para el resto del mes.</p>
                </div>
                <div className="rounded-lg border border-muted/40 bg-muted/30 p-4 flex items-start gap-3">
                  <BellRing className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Alertas de gastos</p>
                    <p className="text-xs text-muted-foreground">Te avisamos si superas tu presupuesto diario.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/40 border-primary/20 backdrop-blur">
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Metas activas</p>
                  <p className="text-lg font-semibold text-foreground">Vacaciones en el sur</p>
                  <p className="text-sm text-muted-foreground">
                    72% completado · $340.000 acumulados
                  </p>
                </div>
                <PiggyBank className="w-10 h-10 text-primary" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;