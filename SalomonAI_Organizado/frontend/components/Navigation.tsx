"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Menu, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const userInitials = useMemo(() => {
    if (!user) return "";
    if (user.fullName) {
      return user.fullName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .slice(0, 2)
        .join("");
    }
    if (user.displayName) {
      return user.displayName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .slice(0, 2)
        .join("");
    }
    return user.email.charAt(0).toUpperCase();
  }, [user]);

  const handleLogout = async () => {
    logout();
    setIsMenuOpen(false);
    router.push("/");
  };

  const authenticatedLinks = (
    <>
      <Link href="/dashboard">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
          Ir al Dashboard
        </Button>
      </Link>
      <Button
        variant="outline"
        className="flex items-center space-x-2"
        onClick={handleLogout}
      >
        <User className="w-4 h-4" />
        <span>Cerrar sesión</span>
      </Button>
    </>
  );

  const guestLinks = (
    <>
      <Link href="/login">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
          Iniciar Sesión
        </Button>
      </Link>
      <Link href="/signup">
        <Button className="bg-gradient-primary hover:opacity-90">Probar Gratis</Button>
      </Link>
    </>
  );

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-primary/20">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3" onClick={() => setIsMenuOpen(false)}>
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1
                className="text-xl font-bold"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
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
            <Link href="/integraciones" className="text-muted-foreground hover:text-foreground transition-colors">
              Integraciones
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isLoading && user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden lg:flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Hola,</span>
                  <span className="font-medium text-foreground">
                    {user.fullName ?? user.displayName ?? user.email}
                  </span>
                </div>
                <div className="hidden lg:flex w-8 h-8 bg-gradient-primary rounded-full items-center justify-center text-xs font-semibold text-primary-foreground">
                  {userInitials}
                </div>
                {authenticatedLinks}
              </div>
            ) : (
              guestLinks
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Abrir menú"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary/20">
            <div className="flex flex-col space-y-4">
              <Link
                href="/producto"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Producto
              </Link>
              <Link
                href="/funciones"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Funciones
              </Link>
              <Link
                href="/integraciones"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Integraciones
              </Link>
              <div className="pt-4 space-y-2">
                {!isLoading && user ? (
                  <>
                    <div className="flex items-center space-x-3 px-2 py-1 text-sm text-muted-foreground">
                      <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground">
                        {userInitials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {user.fullName ?? user.displayName ?? user.email}
                        </span>
                        <span className="text-xs">Usuario autenticado</span>
                      </div>
                    </div>
                    <Link href="/dashboard" className="block" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Ir al Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      Cerrar sesión
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Iniciar Sesión
                      </Button>
                    </Link>
                    <Link href="/signup" className="block" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-gradient-primary hover:opacity-90">
                        Probar Gratis
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
