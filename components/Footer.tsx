import { Brain, Mail, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-primary/20 py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent'
                }}>
                  SalomonAI
                </h3>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Fintech Chile
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              El asistente financiero inteligente que revoluciona la forma en que los chilenos 
              manejan su dinero.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Producto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/funciones" className="hover:text-primary transition-colors">Funciones</Link></li>
              <li><Link href="/integraciones" className="hover:text-primary transition-colors">Integraciones</Link></li>
              <li><Link href="/seguridad" className="hover:text-primary transition-colors">Seguridad</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/producto" className="hover:text-primary transition-colors">Acerca de</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Carrera</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Prensa</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacidad" className="hover:text-primary transition-colors">Privacidad</Link></li>
              <li><Link href="/terminos" className="hover:text-primary transition-colors">Términos</Link></li>
              <li><Link href="/cookies" className="hover:text-primary transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-muted-foreground">
              © 2024 SalomonAI. Todos los derechos reservados.
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Santiago, Chile</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>contacto@salomonai.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+56 2 2345 6789</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;