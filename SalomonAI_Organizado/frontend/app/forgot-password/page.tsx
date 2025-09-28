'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navigation } from '../../components/Navigation'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Brain, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { sendPasswordReset } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await sendPasswordReset(email)
      setEmailSent(true)
      toast({
        title: 'Solicitud enviada',
        description: 'Si la cuenta existe recibirás un correo con los siguientes pasos.',
      })
    } catch (error) {
      toast({
        title: 'No pudimos enviar el correo',
        description:
          error instanceof Error
            ? error.message
            : 'Intenta nuevamente o contacta a soporte@salomonai.cl',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
              <h1 className="text-3xl font-bold mb-2">¡Email enviado!</h1>
              <p className="text-muted-foreground">
                Te enviamos instrucciones a{' '}
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
                    setEmailSent(false)
                    setEmail('')
                  }}
                >
                  Intentar con otro email
                </Button>
                <Button className="w-full bg-gradient-primary hover:opacity-90" onClick={() => router.push('/login')}>
                  Volver al login
                </Button>
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
    )
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
            <h1
              className="text-3xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
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
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="tu@email.com"
                    required
                    disabled={isSubmitting}
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>Enviar instrucciones</span>
                  </div>
                )}
              </Button>
            </form>
          </Card>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al login
            </Link>
          </div>

          {/* Support */}
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              ¿Necesitas ayuda?{' '}
              <a href="mailto:soporte@salomonai.cl" className="text-primary hover:underline">
                Contacta con soporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
