import { Brain, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
                <h3 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  SalomónAI
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
              <li>
                <Link href="/producto" className="hover:text-primary transition-colors">
                  Visión general
                </Link>
              </li>
              <li>
                <Link href="/funciones" className="hover:text-primary transition-colors">
                  Funciones
                </Link>
              </li>
              <li>
                <Link href="/integraciones" className="hover:text-primary transition-colors">
                  Integraciones
                </Link>
              </li>
              <li>
                <Link href="/seguridad" className="hover:text-primary transition-colors">
                  Seguridad
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/demo" className="hover:text-primary transition-colors">
                  Demo en vivo
                </Link>
              </li>
              <li>
                <Link href="/api" className="hover:text-primary transition-colors">
                  API y documentación
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-primary transition-colors">
                  Roadmap de producto
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-primary transition-colors">
                  Contáctanos
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contacto</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>hola@salomonai.cl</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>+56 2 2345 6789</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Santiago, Chile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2024 SalomónAI. Todos los derechos reservados.
            </p>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <Link href="/privacidad" className="hover:text-primary transition-colors">
                Privacidad
              </Link>
              <Link href="/terminos" className="hover:text-primary transition-colors">
                Términos
              </Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;