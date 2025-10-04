"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Send, 
  Mic, 
  PiggyBank,
  CreditCard,
  Brain,
  Smartphone
} from "lucide-react";
import { useState } from "react";

const InteractiveDemo = () => {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResponse, setShowResponse] = useState(false);

  const demoQueries = [
    "¿Cuánto gasté en restaurantes este mes?",
    "¿Puedo ahorrar $100.000 en 6 meses?",
    "¿Cuáles son mis gastos más altos?",
    "¿Cómo van mis metas de ahorro?"
  ];

  const demoResponses = [
    {
      text: "Este mes has gastado $186.420 en restaurantes. Esto representa un aumento del 15% respecto al mes pasado. Tu mayor gasto fue en 'La Mar Cebichería' por $45.000.",
      data: [
        { restaurant: "La Mar Cebichería", amount: 45000 },
        { restaurant: "Sukalde", amount: 32000 },
        { restaurant: "McDonald's", amount: 28420 },
        { restaurant: "Otros", amount: 81000 }
      ]
    },
    {
      text: "¡Sí! Basado en tus patrones actuales, puedes ahorrar $100.000 en 5.2 meses si reduces delivery en 30% y gastos de entretenimiento en 20%.",
      savings: { target: 100000, monthly: 19230, timeFrame: 5.2 }
    },
    {
      text: "Tus 3 categorías de mayor gasto son: 1) Vivienda: $420.000 (35%), 2) Alimentación: $312.000 (26%), 3) Transporte: $158.000 (13%)",
      categories: [
        { name: "Vivienda", amount: 420000, percentage: 35 },
        { name: "Alimentación", amount: 312000, percentage: 26 },
        { name: "Transporte", amount: 158000, percentage: 13 }
      ]
    },
    {
      text: "¡Excelente progreso! Has ahorrado $340.000 de tu meta de $500.000 (68%). Al ritmo actual, alcanzarás tu objetivo 2 meses antes de lo planeado.",
      goal: { current: 340000, target: 500000, percentage: 68 }
    }
  ];

  const handleSendQuery = () => {
    if (query.trim()) {
      setShowResponse(true);
      setQuery("");
    }
  };

  const handleDemoQuery = (queryText: string, index: number) => {
    setQuery(queryText);
    setCurrentStep(index);
    setTimeout(() => {
      setShowResponse(true);
      setQuery("");
    }, 500);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setQuery("¿Cuánto gasté en delivery esta semana?");
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <section className="py-20 bg-background" id="demo">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary">
            <MessageSquare className="w-4 h-4 mr-2" />
            Demo Interactivo
          </Badge>
          <h2 className="text-4xl font-bold mb-6 text-foreground">
            Experimenta la Conversación Financiera
          </h2>
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
                    En línea
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
                        ¡Hola! Soy SalomonAI, tu asistente financiero. Puedes preguntarme sobre tus gastos, ahorros, metas o cualquier consulta financiera.
                      </p>
                    </div>
                  </div>

                  {showResponse && (
                    <>
                      <div className="flex gap-3 justify-end">
                        <div className="bg-primary/20 rounded-lg p-3 max-w-xs">
                          <p className="text-sm">{demoQueries[currentStep]}</p>
                        </div>
                        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">Tú</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Brain className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 max-w-sm">
                          <p className="text-sm">{demoResponses[currentStep].text}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Escribe tu pregunta aquí..."
                      className="pr-10"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendQuery()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`absolute right-1 top-1 h-8 w-8 p-0 ${isListening ? 'text-destructive' : 'text-muted-foreground'}`}
                      onClick={toggleListening}
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button onClick={handleSendQuery}>
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
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto p-3 whitespace-normal"
                      onClick={() => handleDemoQuery(queryText, index)}
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
                <CardTitle>Dashboard en Tiempo Real</CardTitle>
              </CardHeader>
              <CardContent>
                {showResponse ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <CreditCard className="w-6 h-6 text-destructive mx-auto mb-2" />
                        <p className="text-lg font-bold text-destructive">$658.420</p>
                        <p className="text-xs text-muted-foreground">Gastos mes</p>
                      </div>
                      <div className="text-center p-4 bg-secondary/30 rounded-lg">
                        <PiggyBank className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-lg font-bold text-primary">$340.000</p>
                        <p className="text-xs text-muted-foreground">Ahorrado</p>
                      </div>
                    </div>

                    {currentStep === 0 && demoResponses[0].data && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Gastos en Restaurantes:</h4>
                        {demoResponses[0].data.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm">{item.restaurant}</span>
                            <span className="font-bold">${item.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentStep === 1 && demoResponses[1].savings && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Plan de Ahorro:</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Meta mensual:</span>
                            <span className="font-bold">${demoResponses[1].savings.monthly.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Tiempo estimado:</span>
                            <span className="font-bold">{demoResponses[1].savings.timeFrame} meses</span>
                          </div>
                          <Progress value={65} className="h-2" />
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && demoResponses[2].categories && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Top Categorías:</h4>
                        {demoResponses[2].categories.map((cat, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{cat.name}</span>
                              <span className="font-bold">${cat.amount.toLocaleString()}</span>
                            </div>
                            <Progress value={cat.percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    )}

                    {currentStep === 3 && demoResponses[3].goal && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Progreso de Meta:</h4>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            {demoResponses[3].goal.percentage}%
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            ${demoResponses[3].goal.current.toLocaleString()} de ${demoResponses[3].goal.target.toLocaleString()}
                          </p>
                          <Progress value={demoResponses[3].goal.percentage} className="h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Smartphone className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">
                      Haz una pregunta para ver la respuesta aquí
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Card className="bg-gradient-card border-primary/20 text-center p-6">
            <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lenguaje Natural</h3>
            <p className="text-sm text-muted-foreground">
              Pregunta como si hablaras con un experto financiero
            </p>
          </Card>
          <Card className="bg-gradient-card border-primary/20 text-center p-6">
            <Brain className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Respuestas Inteligentes</h3>
            <p className="text-sm text-muted-foreground">
              Análisis contextual con datos visuales precisos
            </p>
          </Card>
          <Card className="bg-gradient-card border-primary/20 text-center p-6">
            <Mic className="w-12 h-12 text-secondary-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Control por Voz</h3>
            <p className="text-sm text-muted-foreground">
              Consultas manos libres para máxima comodidad
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo;
