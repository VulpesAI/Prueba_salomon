'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { apiRequest, ApiError } from '@/lib/api-client'

interface DashboardSummaryResponse {
  summary: {
    totalIncome: number
    totalExpenses: number
    balance: number
    transactionCount: number
    period: {
      from: string
      to: string
    }
  }
  categories: Record<
    string,
    {
      total: number
      count: number
      type: 'income' | 'expense'
    }
  >
}

interface Movement {
  id: string
  description: string
  amount: number
  category: string
  date: string
  currency?: string
  type?: 'income' | 'expense'
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function DashboardPage() {
  const { user, token, isLoading: authLoading, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [showBalance, setShowBalance] = useState(true)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingMovements, setIsLoadingMovements] = useState(false)
  const [summary, setSummary] = useState<{
    balance: number
    totalIncome: number
    totalExpenses: number
    transactionCount: number
    period?: { from: string; to: string }
    categories: { name: string; total: number; percentage: number }[]
  } | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login')
    }
  }, [authLoading, token, router])

  const fetchSummary = useCallback(async () => {
    if (!token) return
    setIsLoadingSummary(true)
    try {
      const data = await apiRequest<DashboardSummaryResponse>('/dashboard/summary', { token })
      const categories = Object.entries(data.categories || {})
        .filter(([, info]) => info.type !== 'income')
        .map(([name, info]) => ({
          name,
          total: Number(info.total),
          percentage:
            data.summary.totalExpenses > 0
              ? Math.min(100, (Number(info.total) / data.summary.totalExpenses) * 100)
              : 0,
        }))
        .sort((a, b) => b.total - a.total)

      setSummary({
        balance: Number(data.summary.balance),
        totalIncome: Number(data.summary.totalIncome),
        totalExpenses: Number(data.summary.totalExpenses),
        transactionCount: data.summary.transactionCount,
        period: data.summary.period,
        categories,
      })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'No pudimos obtener el resumen financiero. Intenta nuevamente más tarde.'
      toast({ title: 'Error al cargar tu resumen', description: message, variant: 'destructive' })
    } finally {
      setIsLoadingSummary(false)
    }
  }, [token, toast])

  const loadMovements = useCallback(
    async (limit = 5, category?: string) => {
      if (!token) return []
      setIsLoadingMovements(true)
      try {
        const params = new URLSearchParams({ limit: String(limit) })
        if (category) {
          params.set('category', category)
        }
        const data = await apiRequest<{ movements: Movement[] }>(`/dashboard/movements?${params.toString()}`, {
          token,
        })
        setMovements(data.movements)
        return data.movements
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'No pudimos obtener las transacciones. Vuelve a intentarlo en unos minutos.'
        toast({ title: 'Error al cargar transacciones', description: message, variant: 'destructive' })
        return []
      } finally {
        setIsLoadingMovements(false)
      }
    },
    [token, toast]
  )

  useEffect(() => {
    if (!token) return
    fetchSummary()
    loadMovements(5)
  }, [token, fetchSummary, loadMovements])

  const handleConnectAccounts = async () => {
    if (!token) return
    try {
      await apiRequest('/users/me/sync', { method: 'POST', token })
      toast({
        title: 'Sincronización iniciada',
        description: 'Estamos conectando tus cuentas bancarias. Te avisaremos cuando termine.',
      })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'No pudimos iniciar la sincronización. Intenta nuevamente más tarde.'
      toast({ title: 'Error al sincronizar', description: message, variant: 'destructive' })
    }
  }

  const handleFilter = async () => {
    if (!token) return
    const category = window.prompt('¿Qué categoría deseas filtrar? (por ejemplo: Alimentación)')
    if (!category) return

    const results = await loadMovements(5, category)
    if (results.length > 0) {
      toast({
        title: 'Filtro aplicado',
        description: `Mostramos tus últimas transacciones en la categoría “${category}”.`,
      })
    }
  }

  const handleExport = async () => {
    if (!token) return
    try {
      const params = new URLSearchParams({ limit: '200' })
      const data = await apiRequest<{ movements: Movement[] }>(`/dashboard/movements?${params.toString()}`, {
        token,
      })
      if (!data.movements.length) {
        toast({
          title: 'Sin movimientos para exportar',
          description: 'Aún no registramos transacciones suficientes.',
        })
        return
      }

      const header = 'Descripción,Categoría,Monto,Fecha\n'
      const rows = data.movements
        .map((movement) => {
          const formattedDate = new Date(movement.date).toLocaleDateString('es-CL')
          const normalizedAmount = movement.amount.toString().replace('.', ',')
          return `"${movement.description}","${movement.category ?? 'Sin categoría'}",${normalizedAmount},${formattedDate}`
        })
        .join('\n')

      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'salomonai-transacciones.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Exportación lista',
        description: 'Descargamos tus últimas transacciones en formato CSV.',
      })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'No pudimos exportar tus transacciones. Intenta nuevamente más tarde.'
      toast({ title: 'Error al exportar', description: message, variant: 'destructive' })
    }
  }

  const handleShowAll = async () => {
    const results = await loadMovements(20)
    if (results.length > 0) {
      toast({
        title: 'Mostrando más movimientos',
        description: 'Cargamos tus últimas 20 transacciones.',
      })
    }
  }

  const welcomeName = useMemo(() => {
    if (!user) return 'Usuario'
    const base = user.fullName || user.email || 'Usuario'
    return base.split(' ')[0]
  }, [user])

  const initials = useMemo(() => {
    if (!user) return 'US'
    if (user.fullName) {
      return user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((name) => name[0]?.toUpperCase() ?? '')
        .join('')
    }
    return user.email?.slice(0, 2).toUpperCase() ?? 'US'
  }, [user])

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-primary/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar transacciones..."
                  className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">{initials}</span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user?.fullName || user?.email}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout()
                  router.push('/')
                }}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">¡Hola, {welcomeName}! 👋</h1>
          <p className="text-muted-foreground">Aquí tienes un resumen de tu situación financiera</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Balance total</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1"
                  disabled={isLoadingSummary}
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-primary">
              {showBalance ? formatCurrency(summary?.balance ?? 0) : '••••••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.period
                ? `Período: ${new Date(summary.period.from).toLocaleDateString('es-CL')} - ${new Date(
                    summary.period.to
                  ).toLocaleDateString('es-CL')}`
                : 'Actualizado'}
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Ingresos del período</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">
              {showBalance ? formatCurrency(summary?.totalIncome ?? 0) : '••••••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ingresos registrados en los últimos 30 días</p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Gastos del período</h3>
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500">
              {showBalance ? formatCurrency(summary?.totalExpenses ?? 0) : '••••••••'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de gastos detectados por SalomonAI</p>
          </Card>

          <Card className="p-6 bg-gradient-card border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Transacciones analizadas</h3>
              <PieChart className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500">{summary?.transactionCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Movimientos incluidos en tu resumen</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 bg-gradient-card border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Resumen mensual</h2>
                <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={handleConnectAccounts}>
                  <Plus className="w-4 h-4 mr-2" />
                  Sincronizar cuentas
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Balance neto</p>
                  <p className="text-lg font-semibold mt-1">
                    {showBalance ? formatCurrency(summary?.balance ?? 0) : '••••••••'}
                  </p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Ingresos totales</p>
                  <p className="text-lg font-semibold mt-1">
                    {showBalance ? formatCurrency(summary?.totalIncome ?? 0) : '••••••••'}
                  </p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Gastos totales</p>
                  <p className="text-lg font-semibold mt-1">
                    {showBalance ? formatCurrency(summary?.totalExpenses ?? 0) : '••••••••'}
                  </p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Transacciones procesadas</p>
                  <p className="text-lg font-semibold mt-1">{summary?.transactionCount ?? 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Transacciones recientes</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleFilter} disabled={isLoadingMovements}>
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoadingMovements}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {isLoadingMovements && (
                  <p className="text-sm text-muted-foreground">Cargando transacciones...</p>
                )}
                {!isLoadingMovements && movements.length === 0 && (
                  <p className="text-sm text-muted-foreground">No encontramos transacciones recientes.</p>
                )}
                {movements.map((transaction) => (
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
                        <p className="text-sm text-muted-foreground">{transaction.category ?? 'Sin categoría'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <Button variant="outline" onClick={handleShowAll} disabled={isLoadingMovements}>
                  Ver todas las transacciones
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-6">Gastos por categoría</h2>
              {isLoadingSummary && <p className="text-sm text-muted-foreground">Analizando tus categorías...</p>}
              {!isLoadingSummary && summary?.categories.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no registramos gastos clasificados.</p>
              )}
              <div className="space-y-4">
                {summary?.categories.map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, category.percentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{formatCurrency(category.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-6">Acciones rápidas</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={handleConnectAccounts}>
                  <Plus className="w-4 h-4 mr-2" />
                  Conectar nueva cuenta
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/demo')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ver análisis IA
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Generar reporte CSV
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    toast({
                      title: 'Próximamente',
                      description: 'Estamos habilitando la configuración avanzada del panel.',
                    })
                  }
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configuración
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-primary/20">
              <h2 className="text-xl font-semibold mb-4">💡 Insights de IA</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="font-medium text-blue-800">Oportunidad de ahorro</p>
                  <p className="text-blue-600">
                    {summary?.categories[0]
                      ? `Reduce ${summary.categories[0].name.toLowerCase()} un 10% para ahorrar ${formatCurrency(
                          summary.categories[0].total * 0.1
                        )}`
                      : 'Solicita una consulta para descubrir oportunidades de ahorro.'}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <p className="font-medium text-green-800">Buen progreso</p>
                  <p className="text-green-600">
                    {summary
                      ? `Tu balance neto es ${formatCurrency(summary.balance)} este período. ¡Sigue así!`
                      : 'Consulta a SalomonAI para comenzar a medir tu progreso.'}
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <p className="font-medium text-yellow-800">Patrón detectado</p>
                  <p className="text-yellow-600">
                    {movements.length > 0
                      ? 'Tus gastos suelen aumentar los fines de semana. Considera definir un presupuesto para esos días.'
                      : 'Cuando registremos más movimientos te mostraremos patrones relevantes.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
