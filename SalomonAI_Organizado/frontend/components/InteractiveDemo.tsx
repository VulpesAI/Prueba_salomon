'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  MessageSquare,
  Send,
  Mic,
  PiggyBank,
  CreditCard,
  Brain,
  Smartphone,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { apiRequest, ApiError } from '@/lib/api-client'

const fallbackResponses = [
  "Este mes has gastado $186.420 en restaurantes. Esto representa un aumento del 15% respecto al mes pasado. Tu mayor gasto fue en 'La Mar Cebichería' por $45.000.",
  '¡Sí! Basado en tus patrones actuales, puedes ahorrar $100.000 en 5.2 meses si reduces delivery en 30% y gastos de entretenimiento en 20%.',
  'Tus 3 categorías de mayor gasto son: 1) Vivienda: $420.000 (35%), 2) Alimentación: $312.000 (26%), 3) Transporte: $158.000 (13%).',
  '¡Excelente progreso! Has ahorrado $340.000 de tu meta de $500.000 (68%). Al ritmo actual, alcanzarás tu objetivo 2 meses antes de lo planeado.',
]

const demoQueries = [
  '¿Cuánto gasté en restaurantes este mes?',
  '¿Puedo ahorrar $100.000 en 6 meses?',
  '¿Cuáles son mis gastos más altos?',
  '¿Cómo van mis metas de ahorro?',
]

const InteractiveDemo = () => {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const { token, user } = useAuth()
  const { toast } = useToast()

  const sendQuery = async (question: string, fallback?: number) => {
    if (!question.trim()) return

    if (!token) {
      toast({
        title: 'Inicia sesión para continuar',
        description: 'Conéctate a tu cuenta para usar el asistente financiero en tiempo real.',
        variant: 'destructive',
      })
      return
    }

    setIsRequesting(true)
    setResponse(null)
    setLastQuestion(question)
    setQuery('')

    try {
      const result = await apiRequest<Record<string, unknown>>('/users/me/query', {
        method: 'POST',
        token,
        body: JSON.stringify({ query: question }),
      })

      const text =
        (typeof result.answer === 'string' && result.answer) ||
        (typeof result.response === 'string' && result.response) ||
        (typeof result.message === 'string' && result.message) ||
        (typeof result.result === 'string' && result.result) ||
        JSON.stringify(result, null, 2)

      setResponse(text)
    } catch (error) {
      const defaultMessage = fallback !== undefined ? fallbackResponses[fallback] : fallbackResponses[0]
      setResponse(defaultMessage)

      const description =
        error instanceof ApiError && error.status === 404
          ? 'Aún estamos conectando el asistente conversacional. Usamos una respuesta de ejemplo.'
          : error instanceof Error
          ? error.message
          : 'No pudimos obtener una respuesta en este momento.'

      toast({
        title: 'No pudimos procesar la consulta',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsRequesting(false)
    }
  }

  const handleSendQuery = () => {
    if (query.trim()) {
      sendQuery(query, 0)
    }
  }

  const handleDemoQuery = (queryText: string, index: number) => {
    setQuery('')
    sendQuery(queryText, index)
  }

  const toggleListening = () => {
    setIsListening((prev) => !prev)
    if (!isListening) {
      setTimeout(() => {
        const suggestedQuery = '¿Cuánto gasté en delivery esta semana?'
        setQuery(suggestedQuery)
        setIsListening(false)
      }, 2000)
    }
  }

  return (
    <section className="py-20 bg-background" id="demo">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary">
            <MessageSquare className="w-4 h-4 mr-2" />
            Demo Interactivo
          </Badge>
          <h2 className="text-4xl font-bold mb-6 text-foreground">Experimenta la conversación financiera</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Pregunta en lenguaje natural y obtén respuestas inteligentes sobre tus finanzas
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Asistente SalomonAI
                  <Badge variant="outline" className="w-fit">
                    {user ? 'Listo' : 'Requiere sesión'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6 h-64 overflow-y-auto">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Brain className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 max-w-xs">
                      <p className="text-sm">
                        ¡Hola! Soy SalomonAI, tu asistente financiero. Puedes preguntarme sobre tus gastos, ahorros, metas o
                        cualquier consulta financiera.
                      </p>
                    </div>
                  </div>

                  {lastQuestion && (
                    <div className="flex gap-3 justify-end">
                      <div className="bg-primary/20 rounded-lg p-3 max-w-xs">
                        <p className="text-sm">{lastQuestion}</p>
                      </div>
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">Tú</span>
                      </div>
                    </div>
                  )}

                  {response && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Brain className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 max-w-sm whitespace-pre-wrap">
                        <p className="text-sm">{response}</p>
                      </div>
                    </div>
                  )}

                  {isRequesting && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Brain className="w-4 h-4 text-primary-foreground animate-pulse" />
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 max-w-sm flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analizando tu información financiera...
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={user ? 'Escribe tu pregunta aquí...' : 'Inicia sesión para conversar con SalomonAI'}
                      className="pr-10"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                      disabled={isRequesting || !user}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`absolute right-1 top-1 h-8 w-8 p-0 ${isListening ? 'text-destructive' : 'text-muted-foreground'}`}
                      onClick={toggleListening}
                      type="button"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button onClick={handleSendQuery} className="bg-primary hover:bg-primary/90" disabled={isRequesting || !user}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">Prueba estas preguntas:</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {demoQueries.map((queryText, index) => (
                    <Button
                      key={queryText}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto p-3 whitespace-normal"
                      onClick={() => handleDemoQuery(queryText, index)}
                      disabled={isRequesting || !user}
                    >
                      {queryText}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader>
                <CardTitle>Dashboard en tiempo real</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Observa cómo el asistente alimenta el panel con tus movimientos más recientes
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Progreso del análisis</span>
                      <span className="text-xs text-primary font-medium">
                        {isRequesting ? 'Procesando...' : response ? 'Actualizado' : 'Esperando consulta'}
                      </span>
                    </div>
                    <Progress value={response ? 100 : isRequesting ? 60 : 10} className="h-2 bg-primary/10" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="border-primary/10 bg-primary/5">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Ahorro sugerido</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {response
                            ? 'Actualizamos tus metas con base en la última respuesta.'
                            : 'Haz una pregunta para recibir recomendaciones personalizadas.'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/10 bg-primary/5">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Patrones detectados</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          El asistente identifica variaciones en tus gastos en tiempo real.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-primary/10 bg-primary/5">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Recomendaciones accionables</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {response
                          ? 'Consulta registrada. Revisa tu panel para ver las recomendaciones aplicadas.'
                          : 'Cuando realices una consulta, verás aquí las sugerencias priorizadas.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InteractiveDemo
