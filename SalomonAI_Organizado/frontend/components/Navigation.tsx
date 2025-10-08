"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-primary/20">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}>
                SalomonAI
              </h1>
              <Badge variant="outline" className="text-xs -mt-1 border-primary/30 text-primary">
                Beta
              </Badge>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/producto" className="text-muted-foreground hover:text-foreground transition-colors">
              Producto
            </Link>
            <Link href="/funciones" className="text-muted-foreground hover:text-foreground transition-colors">
              Funciones
            </Link>
            <Link href="/seguridad" className="hover:text-primary transition-colors">
              Seguridad
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/signup">
              <Button>
                Probar Gratis
              </Button>
            </Link>
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
              <Link href="/producto" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                Producto
              </Link>
              <Link href="/funciones" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                Funciones
              </Link>
              <Link href="/seguridad" className="hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                Seguridad
              </Link>
              <div className="pt-4 space-y-2">
                <Link href="/login" className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/signup" className="block">
                  <Button
                    className="w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Probar Gratis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;