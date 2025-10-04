'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brain, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setEmailSent(true);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'No pudimos enviar las instrucciones. Inténtalo nuevamente.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="min-h-screen flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-2">¡Email Enviado!</h1>
              <p className="text-muted-foreground">
                Hemos enviado las instrucciones para restablecer tu contraseña a{' '}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <Card className="p-6 bg-gradient-card border-primary/20">
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong>¿No encuentras el email?</strong>
                </p>
                <ul className="text-left space-y-1">
                  <li>• Revisa tu carpeta de spam o promociones</li>
                  <li>• Asegúrate de haber escrito bien tu email</li>
                  <li>• Espera unos minutos, puede tardar en llegar</li>
                </ul>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  Intentar con otro email
                </Button>
                <Link href="/login">
                  <Button className="w-full">Volver al login</Button>
                </Link>
              </div>
            </Card>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿Problemas para acceder?{' '}
                <a href="mailto:soporte@salomonai.cl" className="text-primary hover:underline">
                  Contacta con soporte
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold mb-2" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent'
            }}>
              Recuperar Contraseña
            </h1>
            <p className="text-muted-foreground">
              Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña
            </p>
          </div>

          {/* Reset Form */}
          <Card className="p-6 bg-gradient-card border-primary/20">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
              </Button>
            </form>

            <Button
              variant="ghost"
              className="mt-4 w-full"
              asChild
            >
              <Link href="/login" className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al login
              </Link>
            </Button>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Necesitas ayuda adicional?
            <a href="mailto:soporte@salomonai.cl" className="text-primary hover:underline ml-1">
              Contacta a soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
