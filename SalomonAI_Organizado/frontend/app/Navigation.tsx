import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Menu, X } from "lucide-react";
import { useState } from "react";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-primary/20">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                SalomónAI
              </h1>
              <Badge variant="outline" className="text-xs -mt-1 border-primary/30 text-primary">
                Beta
              </Badge>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Funciones
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Precios
            </a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contacto
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => alert('Funcionalidad de login próximamente')}
            >
              Iniciar Sesión
            </Button>
            <Button 
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Probar Gratis
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary/20">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Funciones
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Precios
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contacto
              </a>
              <div className="pt-4 space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    setIsMenuOpen(false);
                    alert('Funcionalidad de login próximamente');
                  }}
                >
                  Iniciar Sesión
                </Button>
                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={() => {
                    setIsMenuOpen(false);
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Probar Gratis
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;