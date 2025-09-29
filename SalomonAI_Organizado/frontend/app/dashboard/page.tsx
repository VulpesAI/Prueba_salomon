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
  AlertTriangle,
  Loader2,
  CalendarDays,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  CheckCircle
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

type ForecastDirection = 'upward' | 'downward' | 'stable';

type ForecastPoint = {
  date: string;
  amount: number;
};

type ForecastSummary = {
  modelType: string;
  generatedAt: string | null;
  horizonDays: number;
  historyDays: number;
  forecasts: ForecastPoint[];
  trend: {
    direction: ForecastDirection;
    change: number;
    changePercentage: number;
  };
};

type PredictiveAlert = {
  id: string;
  type: 'cashflow' | 'spending' | 'savings';
  severity: 'low' | 'medium' | 'high';
  message: string;
  forecastDate: string;
  details?: Record<string, unknown>;
};

type PersonalizedRecommendation = {
  id: string;
  title: string;
  description: string;
  score: number;
  category: string;
  explanation: string;
  generatedAt: string;
  cluster?: number | null;
};

type PersonalizedRecommendationsResponse = {
  userId: string;
  generatedAt: string;
  recommendations: PersonalizedRecommendation[];
  featureSummary?: Record<string, unknown> | null;
};

type FeedbackStatus = 'idle' | 'sending' | 'sent' | 'error';

type AccountSummary = {
  id: string | number;
  name: string;
  balance: number;
  type?: string | null;
  institution?: string | null;
  currency?: string | null;
};

type TransactionSummary = {
  id: string | number;
  description: string;
  amount: number;
  date: string;
  category?: string | null;
  currency?: string | null;
};

type CategoryBreakdown = {
  name: string;
  amount: number;
  percentage: number;
  color: string;
};

export default function DashboardPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
  const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);
  const [isLoadingForecasts, setIsLoadingForecasts] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, FeedbackStatus>>({});

  const [totals, setTotals] = useState<{
    balance: number;
    income: number;
    expenses: number;
    savings?: number | null;
  } | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionSummary[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);

  const [isLoadingTotals, setIsLoadingTotals] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [totalsError, setTotalsError] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000', []);

  const resetFinancialData = useCallback(() => {
    setTotals(null);
    setAccounts([]);
    setRecentTransactions([]);
    setCategoryBreakdown([]);
    setTotalsError(null);
    setAccountsError(null);
    setTransactionsError(null);
    setCategoriesError(null);
    setIsLoadingTotals(false);
    setIsLoadingAccounts(false);
    setIsLoadingTransactions(false);
    setIsLoadingCategories(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    let cancelled = false;
    const abortControllers: AbortController[] = [];

    const isAbortError = (error: unknown) =>
      error instanceof DOMException && error.name === 'AbortError';

    const fetchPredictiveInsights = async () => {
      if (!user) {
        resetFinancialData();
        setForecastSummary(null);
        setPredictiveAlerts([]);
        setPersonalizedRecommendations([]);
        setFeedbackStatus({});
        return;
      }

      let token: string;
      try {
        token = await user.getIdToken();
      } catch (error) {
        console.error('No fue posible obtener el token de autenticación', error);
        if (!cancelled) {
          const sessionExpiredMessage = 'Sesión expirada, inicia nuevamente.';
          setForecastError(sessionExpiredMessage);
          setAlertsError(sessionExpiredMessage);
          setRecommendationsError(sessionExpiredMessage);
          setTotalsError(sessionExpiredMessage);
          setAccountsError(sessionExpiredMessage);
          setTransactionsError(sessionExpiredMessage);
          setCategoriesError(sessionExpiredMessage);
          resetFinancialData();
          setForecastSummary(null);
          setPredictiveAlerts([]);
          setPersonalizedRecommendations([]);
          setFeedbackStatus({});
        }
        return;
      }

      const createAbortController = () => {
        const controller = new AbortController();
        abortControllers.push(controller);
        return controller;
      };

      const summaryController = createAbortController();
      try {
        setIsLoadingTotals(true);
        setIsLoadingTransactions(true);
        setIsLoadingCategories(true);
        setTotalsError(null);
        setTransactionsError(null);
        setCategoriesError(null);

        const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/summary`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: summaryController.signal,
        });

        if (!response.ok) {
          throw new Error(`Error al obtener el resumen (${response.status})`);
        }

        const data = await response.json();
        if (!cancelled) {
          const summary = data?.summary ?? {};
          const income = typeof summary.totalIncome === 'number' ? summary.totalIncome : 0;
          const expenses = typeof summary.totalExpenses === 'number' ? summary.totalExpenses : 0;
          const balance =
            typeof summary.balance === 'number' ? summary.balance : income - expenses;
          const savings =
            typeof summary.savings === 'number'
              ? summary.savings
              : balance > 0
              ? balance
              : 0;

          setTotals({
            balance,
            income,
            expenses,
            savings,
          });

          const transactions: TransactionSummary[] = Array.isArray(data?.recentTransactions)
            ? data.recentTransactions
            : [];
          setRecentTransactions(transactions);

          const rawCategories = data?.categories ?? {};
          const palette = [
            '#ef4444',
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#ec4899',
            '#14b8a6',
            '#6366f1',
          ];
          let colorIndex = 0;
          const breakdown: CategoryBreakdown[] = Object.entries(rawCategories)
            .filter(([, value]) => value && typeof value === 'object')
            .map(([name, value]) => {
              const total =
                typeof (value as { total?: number }).total === 'number'
                  ? (value as { total?: number }).total!
                  : 0;
              const categoryType = (value as { type?: string }).type ?? 'expense';
              if (categoryType === 'income') {
                return null;
              }
              const relevantTotal = expenses > 0 ? expenses : income;
              const percentage = relevantTotal > 0 ? (total / relevantTotal) * 100 : 0;
              const color = palette[colorIndex % palette.length];
              colorIndex += 1;
              return {
                name,
                amount: total,
                percentage: Number(percentage.toFixed(1)),
                color,
              } satisfies CategoryBreakdown;
            })
            .filter((category): category is CategoryBreakdown => category !== null)
            .sort((a, b) => b.amount - a.amount);

          setCategoryBreakdown(breakdown);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('No fue posible cargar el resumen financiero', error);
        if (!cancelled) {
          setTotals(null);
          setRecentTransactions([]);
          setCategoryBreakdown([]);
          setTotalsError('No fue posible cargar el balance. Intenta nuevamente.');
          setTransactionsError('No fue posible cargar las transacciones recientes.');
          setCategoriesError('No fue posible cargar el desglose por categoría.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTotals(false);
          setIsLoadingTransactions(false);
          setIsLoadingCategories(false);
        }
      }

      const accountsController = createAbortController();
      try {
        setIsLoadingAccounts(true);
        setAccountsError(null);
        const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/accounts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: accountsController.signal,
        });

        if (!response.ok) {
          throw new Error(`Error al obtener cuentas (${response.status})`);
        }

        const data = await response.json();
        const receivedAccounts: AccountSummary[] = Array.isArray(data?.accounts)
          ? data.accounts
          : Array.isArray(data)
          ? data
          : [];
        if (!cancelled) {
          setAccounts(receivedAccounts);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('No fue posible cargar las cuentas', error);
        if (!cancelled) {
          setAccounts([]);
          setAccountsError('No fue posible cargar las cuentas conectadas.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      }

      const forecastsController = createAbortController();
      try {
        setIsLoadingForecasts(true);
        setForecastError(null);
        const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/forecasts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: forecastsController.signal,
        });

        if (!response.ok) {
          throw new Error(`Error al obtener proyecciones (${response.status})`);
        }

        const data: ForecastSummary = await response.json();
        if (!cancelled) {
          setForecastSummary(data);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('No fue posible cargar las proyecciones', error);
        if (!cancelled) {
          setForecastSummary(null);
          setForecastError('No fue posible cargar las proyecciones.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingForecasts(false);
        }
      }

      const alertsController = createAbortController();
      try {
        setIsLoadingAlerts(true);
        setAlertsError(null);
        const response = await fetch(`${apiBaseUrl}/api/v1/alerts/predictive`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: alertsController.signal,
        });

        if (!response.ok) {
          throw new Error(`Error al obtener alertas (${response.status})`);
        }

        const data: { alerts: PredictiveAlert[] } = await response.json();
        if (!cancelled) {
          setPredictiveAlerts(data.alerts);
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('No fue posible cargar las alertas predictivas', error);
        if (!cancelled) {
          setPredictiveAlerts([]);
          setAlertsError('No fue posible cargar las alertas predictivas.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAlerts(false);
        }
      }

      const recommendationsController = createAbortController();
      try {
        setIsLoadingRecommendations(true);
        setRecommendationsError(null);
        const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/recommendations/personalized`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: recommendationsController.signal,
        });

        if (response.status === 404) {
          if (!cancelled) {
            setPersonalizedRecommendations([]);
            setFeedbackStatus({});
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Error al obtener recomendaciones (${response.status})`);
        }

        const data: PersonalizedRecommendationsResponse = await response.json();
        if (!cancelled) {
          setPersonalizedRecommendations(data.recommendations ?? []);
          setFeedbackStatus((prev) => {
            const updated: Record<string, FeedbackStatus> = {};
            (data.recommendations ?? []).forEach((rec) => {
              updated[rec.id] = prev[rec.id] ?? 'idle';
            });
            return updated;
          });
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('No fue posible cargar las recomendaciones personalizadas', error);
        if (!cancelled) {
          setPersonalizedRecommendations([]);
          setFeedbackStatus({});
          setRecommendationsError('No fue posible cargar las recomendaciones personalizadas.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecommendations(false);
        }
      }
    };

    if (!isLoading) {
      void fetchPredictiveInsights();
    }

    return () => {
      cancelled = true;
      abortControllers.forEach((controller) => controller.abort());
    };
  }, [user, isLoading, apiBaseUrl, resetFinancialData]);

  const displayName = useMemo(() => {
    if (!user) return 'Usuario';
    if (user.displayName && user.displayName.trim().length > 0) {
      return user.displayName;
    }
    if (user.email) {
      const [name] = user.email.split('@');
      return name;
    }
    return 'Usuario';
  }, [user]);

  const initials = useMemo(() => {
    return displayName
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || 'U';
  }, [displayName]);

  const greetingName = useMemo(() => {
    const [first] = displayName.split(' ');
    return first || displayName;
  }, [displayName]);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      router.push('/');
    } finally {
      setIsSigningOut(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const rounded = Number(value.toFixed(1));
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}%`;
  };

  const renderTotalsValue = (
    value: number | null | undefined,
    className: string,
    fallbackMessage: string,
  ) => {
    if (isLoadingTotals) {
      return (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Cargando...</span>
        </div>
      );
    }

    if (totalsError) {
      return <p className="text-sm text-red-500">{totalsError}</p>;
    }

    if (value === undefined || value === null) {
      return <p className="text-sm text-muted-foreground">{fallbackMessage}</p>;
    }

    return (
      <div className={`text-2xl font-bold ${className}`}>
        {showBalance ? formatCurrency(value) : '••••••••'}
      </div>
    );
  };

  const formatDate = (value: string) => {
    return new Intl.DateTimeFormat('es-CL', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(value));
  };

  const formatScore = (value: number) => {
    if (Number.isNaN(value)) {
      return '0%';
    }
    const normalized = Math.min(Math.max(value, 0), 1);
    return `${Math.round(normalized * 100)}%`;
  };

  const getSeverityStyles = (severity: PredictiveAlert['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border border-red-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30';
    }
  };

  const handleRecommendationFeedback = async (recommendationId: string, score: number) => {
    if (!user) {
      return;
    }

    setFeedbackStatus((prev) => ({ ...prev, [recommendationId]: 'sending' }));
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/recommendations/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recommendationId, score }),
      });

      if (!response.ok) {
        throw new Error(`Error al enviar feedback (${response.status})`);
      }

      setFeedbackStatus((prev) => ({ ...prev, [recommendationId]: 'sent' }));
      setRecommendationsError(null);
    } catch (error) {
      console.error('No fue posible enviar feedback de recomendación', error);
      setFeedbackStatus((prev) => ({ ...prev, [recommendationId]: 'error' }));
    }
  };

  const forecastTrendLabel = useMemo(() => {
    if (!forecastSummary) return 'Tendencia estable';
    if (forecastSummary.trend.direction === 'upward') return 'Tendencia positiva';
    if (forecastSummary.trend.direction === 'downward') return 'Tendencia a la baja';
    return 'Tendencia estable';
  }, [forecastSummary]);

  const upcomingForecasts = useMemo(() => {
    if (!forecastSummary) return [] as ForecastPoint[];
    return forecastSummary.forecasts.slice(0, 7);
  }, [forecastSummary]);

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
                <h1 className="text-xl font-bold" style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
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
                    {initials}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email ?? 'Cuenta sin correo'}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isSigningOut}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">¡Hola, {greetingName}! 👋</h1>
          <p className="text-muted-foreground">Aquí tienes un resumen de tu situación financiera</p>
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
            <div className="min-h-[2.5rem]">
              {renderTotalsValue(totals?.balance, 'text-primary', 'Sin balance disponible')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500">+12.5%</span> desde el mes pasado
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Ingresos del Mes</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="min-h-[2.5rem]">
              {renderTotalsValue(totals?.income, 'text-green-500', 'Sin ingresos disponibles')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500">+5.2%</span> vs mes anterior
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Gastos del Mes</h3>
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-h-[2.5rem]">
              {renderTotalsValue(totals?.expenses, 'text-red-500', 'Sin gastos disponibles')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-red-500">+3.1%</span> vs mes anterior
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Ahorros</h3>
              <PieChart className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-h-[2.5rem]">
              {renderTotalsValue(
                totals?.savings ?? (totals ? totals.balance : null),
                'text-blue-500',
                'Sin información de ahorros',
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-500">+8.7%</span> este mes
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Accounts */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-gradient-card border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Mis Cuentas</h2>
                <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Conectar Cuenta
                </Button>
              </div>

              <div className="space-y-4">
                {isLoadingAccounts ? (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cargando cuentas...</span>
                  </div>
                ) : accountsError ? (
                  <p className="text-sm text-red-500">{accountsError}</p>
                ) : accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay cuentas conectadas. Vincula una cuenta bancaria para comenzar.
                  </p>
                ) : (
                  accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{account.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {account.type
                              ? account.type.replace(/[_-]/g, ' ')
                              : account.institution ?? 'Cuenta financiera'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {typeof account.balance === 'number'
                            ? showBalance
                              ? formatCurrency(account.balance)
                              : '••••••••'
                            : showBalance
                            ? 'Sin dato'
                            : '••••••••'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {account.currency ?? 'Disponible'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Transactions */}
            <Card className="p-6 bg-gradient-card border-primary/20 mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Transacciones Recientes</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                {isLoadingTransactions ? (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cargando transacciones...</span>
                  </div>
                ) : transactionsError ? (
                  <p className="text-sm text-red-500">{transactionsError}</p>
                ) : recentTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay transacciones recientes registradas.
                  </p>
                ) : (
                  recentTransactions.map((transaction) => {
                    const amountValue =
                      typeof transaction.amount === 'number' ? transaction.amount : null;
                    const isPositive = (amountValue ?? 0) > 0;
                    const formattedAmount = amountValue === null
                      ? 'Sin dato'
                      : showBalance
                      ? `${isPositive ? '+' : ''}${formatCurrency(amountValue)}`
                      : '••••••••';

                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {isPositive ? '↗' : '↙'}
                          </div>
                          <div>
                            <h3 className="font-medium">{transaction.description}</h3>
                            <p className="text-sm text-muted-foreground">
                              {transaction.category ?? 'Sin categoría'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {formattedAmount}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.date ? formatDate(transaction.date) : 'Fecha no disponible'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="mt-4 text-center">
                <Button variant="outline">Ver todas las transacciones</Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Monthly Categories */}
            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-6">Gastos por Categoría</h2>
              <div className="space-y-4">
                {isLoadingCategories ? (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Calculando categorías...</span>
                  </div>
                ) : categoriesError ? (
                  <p className="text-sm text-red-500">{categoriesError}</p>
                ) : categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay datos suficientes para mostrar el desglose por categoría.
                  </p>
                ) : (
                  categoryBreakdown.map((category, index) => (
                    <div key={category.name ?? index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {Number.isFinite(category.percentage) ? category.percentage : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(Math.max(category.percentage, 0), 100)}%`,
                            backgroundColor: category.color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {typeof category.amount === 'number'
                            ? showBalance
                              ? formatCurrency(category.amount)
                              : '••••••••'
                            : 'Sin dato'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Personalized Recommendations */}
            <Card className="p-6 bg-gradient-card border-primary/20">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Recomendaciones para ti</h2>
                  <p className="text-sm text-muted-foreground">
                    Acciones sugeridas según tus hábitos financieros recientes
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>

              {isLoadingRecommendations ? (
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando recomendaciones...</span>
                </div>
              ) : recommendationsError ? (
                <p className="text-sm text-red-500">{recommendationsError}</p>
              ) : personalizedRecommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay recomendaciones personalizadas. Conecta tus cuentas o espera a que se
                  procesen tus transacciones recientes.
                </p>
              ) : (
                <div className="space-y-4">
                  {personalizedRecommendations.map((recommendation) => {
                    const status = feedbackStatus[recommendation.id] ?? 'idle';
                    const isDisabled = status === 'sending' || status === 'sent';

                    return (
                      <div
                        key={recommendation.id}
                        className="p-4 bg-background/70 border border-border/60 rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{recommendation.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {recommendation.category.replace(/[-_]/g, ' ')}
                            </p>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {formatScore(recommendation.score)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                        <p className="text-xs text-primary/80">
                          🧠 {recommendation.explanation}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleRecommendationFeedback(recommendation.id, 1)}
                            disabled={isDisabled}
                          >
                            <ThumbsUp className="w-3 h-3 mr-1" /> Útil
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleRecommendationFeedback(recommendation.id, 0)}
                            disabled={isDisabled}
                          >
                            <ThumbsDown className="w-3 h-3 mr-1" /> No útil
                          </Button>
                          {status === 'sent' ? (
                            <span className="flex items-center text-xs text-emerald-500 gap-1">
                              <CheckCircle className="w-3 h-3" /> ¡Gracias por tu feedback!
                            </span>
                          ) : null}
                          {status === 'error' ? (
                            <span className="text-xs text-red-500">Error al registrar tu feedback.</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* AI Insights */}
            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-4">💡 Insights de IA</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="font-medium text-blue-800">Oportunidad de Ahorro</p>
                  <p className="text-blue-600">Podrías ahorrar $45,000 reduciendo gastos en entretenimiento este mes.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <p className="font-medium text-green-800">Buen Progreso</p>
                  <p className="text-green-600">Tus ahorros han aumentado 8.7% este mes. ¡Excelente trabajo!</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="font-medium text-yellow-800">Patrón Detectado</p>
                  <p className="text-yellow-600">Gastas más los viernes. Considera planificar un presupuesto.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Proyección de flujo</h2>
                <p className="text-sm text-muted-foreground">Tendencias generadas por el motor predictivo</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
            </div>

            {isLoadingForecasts ? (
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando proyecciones...</span>
              </div>
            ) : forecastError ? (
              <p className="text-sm text-red-500">{forecastError}</p>
            ) : forecastSummary && forecastSummary.forecasts.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{forecastTrendLabel}</p>
                    <p
                      className={`text-2xl font-semibold ${
                        forecastSummary.trend.direction === 'downward'
                          ? 'text-red-500'
                          : forecastSummary.trend.direction === 'upward'
                            ? 'text-emerald-500'
                            : 'text-primary'
                      }`}
                    >
                      {formatCurrency(
                        forecastSummary.forecasts[forecastSummary.forecasts.length - 1]?.amount ?? 0
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cambio {formatCurrency(forecastSummary.trend.change)} ({
                        formatPercentage(forecastSummary.trend.changePercentage)
                      }) en {forecastSummary.horizonDays} días
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>Modelo: {forecastSummary.modelType.toUpperCase()}</p>
                    {forecastSummary.generatedAt ? (
                      <p>
                        Actualizado:{' '}
                        {new Date(forecastSummary.generatedAt).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {upcomingForecasts.map(point => (
                    <div key={point.date} className="p-3 bg-background/70 border border-border/60 rounded-lg">
                      <p className="text-xs text-muted-foreground">{formatDate(point.date)}</p>
                      <p className="font-semibold">{formatCurrency(point.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay datos suficientes para proyectar tu flujo de caja. Conecta tus cuentas para comenzar.
              </p>
            )}
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Alertas predictivas</h2>
                <p className="text-sm text-muted-foreground">
                  Anticipa eventos financieros relevantes antes de que ocurran
                </p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            {isLoadingAlerts ? (
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando tendencias...</span>
              </div>
            ) : alertsError ? (
              <p className="text-sm text-red-500">{alertsError}</p>
            ) : predictiveAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No se detectaron alertas críticas en las próximas semanas. ¡Sigue así!
              </p>
            ) : (
              <div className="space-y-4">
                {predictiveAlerts.map(alert => (
                  <div key={alert.id} className="p-4 bg-background/70 border border-border/60 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity === 'high'
                          ? 'Alta prioridad'
                          : alert.severity === 'medium'
                            ? 'Prioridad media'
                            : 'Recomendación'}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(alert.forecastDate)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">{alert.message}</p>
                    {alert.details ? (
                      <div className="text-xs text-muted-foreground space-y-1">
                        {Object.entries(alert.details).map(([key, value]) => (
                          <p key={key}>
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                            {typeof value === 'number' ? formatCurrency(value) : String(value)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
