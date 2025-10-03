'use client';

import { Brain } from 'lucide-react';

import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-lg">
                <Brain className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{
                background:
                  'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent'
              }}
            >
              Acceso temporalmente deshabilitado
            </h1>
            <p className="text-muted-foreground">
              Estamos actualizando la experiencia de ingreso a SalomonAI.
            </p>
          </div>

          {/* Static Information */}
          <Card className="p-6 bg-gradient-card border-primary/20 space-y-4 text-sm leading-relaxed">
            <p>
              El acceso mediante usuario y contraseña está temporalmente deshabilitado mientras
              finalizamos la experiencia de autenticación.
            </p>
            <p className="text-muted-foreground">
              Puedes explorar la plataforma accediendo directamente al dashboard de demostración.
              El contenido mostrado es ilustrativo y no requiere credenciales.
            </p>
            <Button asChild className="w-full bg-gradient-primary hover:opacity-90">
              <a href="/dashboard/overview" className="flex items-center justify-center gap-2">
                Explorar demo del dashboard
              </a>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
