'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { 
  Brain, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  MessageSquare,
  Send,
  Play,
  ArrowRight
} from 'lucide-react';

export default function DemoPage() {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      message: '¡Hola! Soy SalomonAI, tu asistente financiero. Puedes preguntarme sobre tus gastos, ahorros o cualquier consulta financiera. ¿En qué puedo ayudarte?'
    }
  ]);

  // Datos de demo simulados
  const demoData = {
    totalBalance: 2500000,
    monthlyIncome: 1800000,
    monthlyExpenses: 1200000,
    recentTransactions: [
      { description: 'Supermercado Lider', amount: -85000, category: 'Alimentación' },
      { description: 'Sueldo', amount: 1800000, category: 'Ingresos' },
      { description: 'Netflix', amount: -9990, category: 'Entretenimiento' },
      { description: 'Farmacia Ahumada', amount: -45000, category: 'Salud' }
    ]
  };

  const suggestedQuestions = [
    "¿Cuánto gasté en alimentación este mes?",
    "¿Puedo ahorrar $200,000 en 3 meses?",
    "¿Cuáles son mis gastos más altos?",
    "¿Cómo van mis metas de ahorro?"
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage = { role: 'user' as const, message: chatMessage };
    setChatHistory(prev => [...prev, newMessage]);

    // Simular respuesta de IA
    setTimeout(() => {
      let response = '';
      
      if (chatMessage.toLowerCase().includes('aliment')) {
        response = 'Según tu historial, has gastado aproximadamente $340,000 en alimentación este mes. Esto representa un 28% de tus gastos totales. ¿Te gustaría que analice patrones o sugerencias para optimizar?';
      } else if (chatMessage.toLowerCase().includes('ahorr')) {
        response = 'Basándome en tus ingresos de $1,800,000 y gastos de $1,200,000, tienes un excedente de $600,000 mensual. Ahorrar $200,000 en 3 meses es totalmente factible. ¿Quieres que te ayude a crear un plan?';
      } else if (chatMessage.toLowerCase().includes('alto') || chatMessage.toLowerCase().includes('mayor')) {
        response = 'Tus categorías de gasto más altas son: 1) Vivienda ($420,000), 2) Alimentación ($340,000), 3) Transporte ($180,000). ¿Te interesa analizar alguna categoría en particular?';
      } else {
        response = `Interesante pregunta: "${chatMessage}". En una versión completa de SalomonAI, analizaría todos tus datos financieros para darte una respuesta personalizada y precisa. ¿Te gustaría crear una cuenta para obtener análisis reales?`;
      }

      setChatHistory(prev => [...prev, { role: 'assistant', message: response }]);
    }, 1000);

    setChatMessage('');
  };

  const handleSuggestedQuestion = (question: string) => {
    setChatMessage(question);
    handleSendMessage();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="min-h-screen px-6 py-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-lg">
                <Brain className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent'
            }}>
              Demo Interactivo de SalomonAI
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explora cómo funciona nuestro asistente financiero inteligente con datos de ejemplo
            </p>
            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20 max-w-2xl mx-auto">
              <p className="text-sm text-primary">
                <strong>Nota:</strong> Esta es una demostración con datos simulados. 
                <Link href="/signup" className="underline ml-1">Crea una cuenta</Link> para conectar tus cuentas reales.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Dashboard Demo */}
            <div className="lg:col-span-1">
              <Card className="p-6 bg-gradient-card border-primary/20">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <Play className="w-5 h-5 mr-2 text-primary" />
                  Tu Dashboard Financiero
                </h2>
                
                {/* Balance Cards */}
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Balance Total</span>
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-xl font-bold text-primary">
                      {formatCurrency(demoData.totalBalance)}
                    </div>
                    <p className="text-xs text-green-500">+8.5% este mes</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Ingresos</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-xl font-bold text-green-500">
                      {formatCurrency(demoData.monthlyIncome)}
                    </div>
                    <p className="text-xs text-muted-foreground">Este mes</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Gastos</span>
                      <CreditCard className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-xl font-bold text-red-500">
                      {formatCurrency(demoData.monthlyExpenses)}
                    </div>
                    <p className="text-xs text-muted-foreground">Este mes</p>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Transacciones Recientes</h3>
                  <div className="space-y-2">
                    {demoData.recentTransactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-border rounded">
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{transaction.category}</p>
                        </div>
                        <span className={`text-sm font-semibold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Chat Demo */}
            <div className="lg:col-span-2">
              <Card className="p-6 bg-gradient-card border-primary/20 h-full">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-primary" />
                  Conversación con SalomonAI
                </h2>
                
                {/* Chat Messages */}
                <div className="space-y-4 mb-6 h-64 overflow-y-auto">
                  {chatHistory.map((chat, index) => (
                    <div key={index} className={`flex gap-3 ${chat.role === 'user' ? 'justify-end' : ''}`}>
                      {chat.role === 'assistant' && (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Brain className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                      <div className={`rounded-lg p-3 max-w-xs ${
                        chat.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-secondary/50'
                      }`}>
                        <p className="text-sm">{chat.message}</p>
                      </div>
                      {chat.role === 'user' && (
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium">Tú</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Suggested Questions */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Preguntas sugeridas:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-left justify-start h-auto p-2 text-xs whitespace-normal"
                        onClick={() => handleSuggestedQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm 
                             focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="Pregunta algo sobre tus finanzas..."
                  />
                  <Button onClick={handleSendMessage} size="sm" className="bg-primary hover:bg-primary/90">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-12 text-center">
            <Card className="p-8 bg-gradient-card border-primary/20 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">¿Listo para conectar tus cuentas reales?</h2>
              <p className="text-muted-foreground mb-6">
                Crea tu cuenta gratuita y conecta tus bancos para obtener análisis reales y personalizados
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button className="bg-gradient-primary hover:opacity-90">
                    <span>Crear Cuenta Gratis</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
