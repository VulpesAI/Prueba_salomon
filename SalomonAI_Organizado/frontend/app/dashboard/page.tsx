'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Brain,
  CreditCard,
  TrendingUp,
  DollarSign,
  PieChart,
  Settings,
  LogOut,
  Plus,
  Eye,
  EyeOff,
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { apiRequest, ApiError } from '@/lib/api-client';
import { getAuthToken } from '@/lib/auth-storage';

interface DashboardSummaryResponse {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
    period: {
      from: string;
      to: string;
    };
  };
  categories: Record<
    string,
    {
      total: number;
      count: number;
      type: 'income' | 'expense';
    }
  >;
  trends: {
    week: string;
    income: number;
    expenses: number;
    transactions: number;
  }[];
  recentTransactions: {
    id: string;
    description: string;
    amount: number;
    category?: string;
    date: string;
    currency: string;
  }[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(Math.round(amount));

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const weeklyLabel = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
  });

export default function DashboardPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const loadDashboard = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setDashboardData(null);
      setIsLoadingData(false);
      setFetchError('Tu sesión ha expirado. Vuelve a iniciar sesión.');
      return;
    }

    setIsLoadingData(true);
    setFetchError(null);

    try {
      const data = await apiRequest<DashboardSummaryResponse>('/dashboard/summary', { token });
      setDashboardData(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        router.push('/login');
        return;
      }
      const message =
        error instanceof ApiError
          ? error.message
          : 'No pudimos cargar los datos del dashboard. Intenta nuevamente.';
      setFetchError(message);
      setDashboardData(null);
    } finally {
      setIsLoadingData(false);
    }
  }, [logout, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      void loadDashboard();
    }
  }, [authLoading, user, loadDashboard, router]);

  const expenseCategories = useMemo(() => {
    if (!dashboardData) return [] as { name: string; amount: number; percentage: number; color: string }[];
    const entries = Object.entries(dashboardData.categories).filter(([, value]) => value.type === 'expense');
    const totalExpenses = entries.reduce((acc, [, value]) => acc + value.total, 0);
    const palette = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

    return entries.map(([name, value], index) => ({
      name,
      amount: value.total,
      percentage: totalExpenses ? Math.round((value.total / totalExpenses) * 1000) / 10 : 0,
      color: palette[index % palette.length],
    }));
  }, [dashboardData]);

  const weeklySummaries = useMemo(() => {
    if (!dashboardData) return [] as DashboardSummaryResponse['trends'];
    return [...dashboardData.trends].slice(-4).reverse();
  }, [dashboardData]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-lg text-muted-foreground">Cargando tu panel financiero...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6 space-y-6">
        <div className="max-w-md space-y-3">
          <h1 className="text-2xl font-semibold">No pudimos cargar tu información</h1>
          <p className="text-muted-foreground">{fetchError}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={loadDashboard} className="bg-gradient-primary hover:opacity-90">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Regresar al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData || !user) {
    return null;
  }

  const firstName = (user.fullName ?? user.displayName ?? user.email)?.split(' ')[0] ?? 'Usuario';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-primary/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1
                  className="text-xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  SalomonAI
                </h1>
              </div>
            </Link>

            {/* Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar transacciones..."
                  className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {(user.fullName ?? user.displayName ?? user.email)
                      .split(' ')
                      .filter(Boolean)
                      .map((part) => part[0]?.toUpperCase())
                      .slice(0, 2)
                      .join('')}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user.fullName ?? user.displayName ?? user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">¡Hola, {firstName}! 👋</h1>
          <p className="text-muted-foreground">
            Resumen de tu actividad financiera entre {formatDate(dashboardData.summary.period.from)} y{' '}
            {formatDate(dashboardData.summary.period.to)}
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Balance Total</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1"
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {showBalance ? formatCurrency(dashboardData.summary.balance) : '••••••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Neto entre ingresos y gastos del período seleccionado
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Ingresos del Período</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">
              {showBalance ? formatCurrency(dashboardData.summary.totalIncome) : '••••••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de ingresos registrados en tus cuentas conectadas
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Gastos del Período</h3>
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500">
              {showBalance ? formatCurrency(dashboardData.summary.totalExpenses) : '••••••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Incluye todos los egresos clasificados automáticamente
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Transacciones Analizadas</h3>
              <PieChart className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {dashboardData.summary.transactionCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Movimientos procesados por nuestros modelos de IA
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Weekly Overview and Recent Transactions */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-gradient-card border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Resumen Semanal</h2>
                <span className="text-sm text-muted-foreground">Últimas {weeklySummaries.length} semanas</span>
              </div>

              <div className="space-y-4">
                {weeklySummaries.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aún no tenemos suficientes movimientos para mostrar tendencias.</p>
                )}

                {weeklySummaries.map((week) => (
                  <div
                    key={week.week}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/15 rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Semana del {weeklyLabel(week.week)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {week.transactions} transacciones analizadas
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1 text-sm">
                      <p className="text-green-500">+ {formatCurrency(week.income)}</p>
                      <p className="text-red-500">- {formatCurrency(week.expenses)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Transactions */}
            <Card className="p-6 bg-gradient-card border-primary/20 mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Transacciones Recientes</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              {dashboardData.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aún no registras movimientos. Conecta una cuenta para comenzar.
                </p>
              ) : (
                <div className="space-y-3">
                  {dashboardData.recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            transaction.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {transaction.amount > 0 ? '↗' : '↙'}
                        </div>
                        <div>
                          <h3 className="font-medium">{transaction.description}</h3>
                          <p className="text-sm text-muted-foreground">
                            {transaction.category ?? 'Sin categoría asignada'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 text-center">
                <Button variant="outline" disabled>
                  Ver todas las transacciones
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Monthly Categories */}
            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-6">Gastos por Categoría</h2>
              <div className="space-y-4">
                {expenseCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Una vez que registres transacciones, verás cómo se distribuyen tus gastos.
                  </p>
                )}
                {expenseCategories.map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-sm text-muted-foreground">{category.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${category.percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-6">Acciones Rápidas</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Transacción
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ver Análisis IA
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Generar Reporte
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Configuración
                </Button>
              </div>
            </Card>

            {/* AI Insights */}
            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-4">💡 Insights de IA</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="font-medium text-blue-800">Seguimiento automático</p>
                  <p className="text-blue-600">
                    Nuestros modelos clasifican tus gastos por categoría para detectar oportunidades de ahorro.
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <p className="font-medium text-green-800">Control de ingresos</p>
                  <p className="text-green-600">
                    Revisa si tus ingresos cubren los gastos mensuales para mantener un balance saludable.
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="font-medium text-yellow-800">Próximas integraciones</p>
                  <p className="text-yellow-600">
                    Muy pronto podrás recibir recomendaciones personalizadas según tus hábitos financieros.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
