'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, Eye, EyeOff, LogIn, ArrowRight } from 'lucide-react';

import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { login, loginWithGoogle, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [isLoading, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      console.error('Firebase login error:', err);
      setError('No pudimos iniciar sesión con esas credenciales. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err) {
      console.error('Google login error:', err);
      setError('No pudimos iniciar sesión con Google. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Iniciar Sesión
            </h1>
            <p className="text-muted-foreground">
              Accede a tu cuenta de SalomonAI
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-6 bg-gradient-card border-primary/20">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm 
                           focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-input bg-background rounded-md text-sm 
                             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" className="rounded border-input" />
                  <span>Recordarme</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar Sesión</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
              </div>
            </div>

            {/* Social Login */}
            <Button
              variant="outline"
              className="w-full border-primary/30 hover:bg-primary/10"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </Button>
          </Card>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Crear cuenta gratis
              </Link>
            </p>
          </div>

          {/* Demo Access */}
          <div className="text-center mt-4">
            <Link 
              href="/demo"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Probar demo sin cuenta</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
