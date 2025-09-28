"use client";

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Menu, User, X } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
    router.push("/")
  }

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
            <Link href="/integraciones" className="text-muted-foreground hover:text-foreground transition-colors">
              Integraciones
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                    Panel
                  </Button>
                </Link>
                <div className="flex items-center space-x-2 border border-primary/20 rounded-full px-3 py-1">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {user.fullName || user.email}
                  </span>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-gradient-primary hover:opacity-90">
                    Probar Gratis
                  </Button>
                </Link>
              </>
            )}
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
              <Link href="/integraciones" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsMenuOpen(false)}>
                Integraciones
              </Link>
              <div className="pt-4 space-y-2">
                {user ? (
                  <>
                    <Link href="/dashboard" className="block" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Panel
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
                        className="w-full bg-gradient-primary hover:opacity-90"
                        onClick={() => setIsMenuOpen(false)}
                      >
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