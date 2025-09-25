import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Shield, Zap } from "lucide-react";
import heroImage from "@/assets/hero-financial.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Financial Intelligence" 
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
      </div>
    </section>
  );
};

export default Hero;