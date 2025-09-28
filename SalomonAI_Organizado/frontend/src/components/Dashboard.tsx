'use client';

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PiggyBank,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  AlertTriangle,
  CheckCircle2,
  TimerReset
} from "lucide-react";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";

const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

const percentageFormatter = new Intl.NumberFormat("es-CL", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const Dashboard = () => {
  const { goals, summary, isLoading, error } = useFinancialGoals();

  const primaryGoal = goals[0];
  const atRiskGoals = useMemo(() => goals.filter(goal => goal.metrics.pace === "off_track"), [goals]);
  const aheadGoals = useMemo(() => goals.filter(goal => goal.metrics.pace === "ahead"), [goals]);

  const formatCurrency = (value: number) => currencyFormatter.format(Math.round(value));
const formatPercentage = (value: number) =>
  Number.isFinite(value) ? percentageFormatter.format(value / 100) : percentageFormatter.format(0);
  const formatEta = (isoDate: string | null) =>
    isoDate ? new Date(isoDate).toLocaleDateString("es-CL", { month: "short", day: "numeric" }) : "Sin proyección";

  return (
    <section className="py-20 bg-background" id="demo">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 text-foreground">
            Tu Dashboard Financiero Inteligente
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Visualiza y comprende tus finanzas como nunca antes
          </p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-card border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">$2,847,650</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-primary inline-flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12.5%
                </span>{" "}
                desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos Este Mes</CardTitle>
              <CreditCard className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">$658,420</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive inline-flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  -3.2%
                </span>{" "}
                vs mes anterior
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Metas financieras</CardTitle>
              <PiggyBank className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              {primaryGoal ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{primaryGoal.name}</span>
                    <Badge variant={primaryGoal.metrics.pace === "off_track" ? "destructive" : "secondary"}>
                      {primaryGoal.metrics.pace === "off_track" ? "Desvío" : "En curso"}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-accent">
                    {formatPercentage(primaryGoal.metrics.progressPercentage)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {formatCurrency(primaryGoal.metrics.totalActual)} de {formatCurrency(primaryGoal.targetAmount)}
                  </p>
                  <Progress value={primaryGoal.metrics.progressPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    ETA: {formatEta(primaryGoal.metrics.eta)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tus metas financieras aparecerán aquí.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-8">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
              {error}
            </Badge>
          </div>
        )}

        {!isLoading && goals.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <Card className="bg-gradient-card border-primary/20">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TimerReset className="w-5 h-5 text-primary" />
                  Seguimiento de metas
                </CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {summary.completed} completadas · {summary.onTrack} en ritmo · {summary.offTrack} en riesgo
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {goals.map(goal => (
                  <div key={goal.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Objetivo: {formatCurrency(goal.targetAmount)} · ETA {formatEta(goal.metrics.eta)}
                        </p>
                      </div>
                      <Badge
                        variant={goal.metrics.pace === "off_track" ? "destructive" : goal.metrics.pace === "ahead" ? "default" : "secondary"}
                        className={goal.metrics.pace === "ahead" ? "bg-emerald-500/10 text-emerald-500" : undefined}
                      >
                        {goal.metrics.pace === "off_track"
                          ? "En riesgo"
                          : goal.metrics.pace === "ahead"
                            ? "Adelantada"
                            : goal.metrics.pace === "completed"
                              ? "Completada"
                              : "Al día"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{formatCurrency(goal.metrics.totalActual)}</span>
                      <span className="text-muted-foreground">{formatPercentage(goal.metrics.progressPercentage)}</span>
                    </div>
                    <Progress value={goal.metrics.progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Desviación actual: {formatCurrency(goal.metrics.deviationAmount)} ({formatPercentage(goal.metrics.deviationRatio * 100)})
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {atRiskGoals.length > 0 && (
                <Card className="border-destructive/40 bg-destructive/5">
                  <CardHeader className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Metas con desviaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {atRiskGoals.map(goal => (
                      <div key={goal.id} className="space-y-2 rounded-md border border-destructive/20 p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-destructive">{goal.name}</p>
                          <Badge variant="outline" className="border-destructive/40 text-destructive">
                            Falta {formatCurrency(Math.max(goal.metrics.expectedAmountByNow - goal.metrics.totalActual, 0))}
                          </Badge>
                        </div>
                        <p className="text-xs text-destructive/80">
                          Progreso actual {formatPercentage(goal.metrics.progressPercentage)} vs esperado{' '}
                          {formatPercentage((goal.metrics.expectedAmountByNow / goal.targetAmount) * 100)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {aheadGoals.length > 0 && (
                <Card className="border-emerald-400/40 bg-emerald-500/5">
                  <CardHeader className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="w-5 h-5" />
                      Metas adelantadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aheadGoals.map(goal => (
                      <div key={goal.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{goal.name}</span>
                        <span className="text-emerald-500">
                          +{formatCurrency(goal.metrics.deviationAmount)} ({formatPercentage(goal.metrics.deviationRatio * 100)})
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Spending Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-gradient-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Categorías de Gasto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Vivienda</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">$250,000</div>
                    <div className="text-xs text-muted-foreground">38%</div>
                  </div>
                </div>
                <Progress value={38} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Coffee className="w-4 h-4 text-orange-400" />
                    <span className="font-medium">Alimentación</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">$180,000</div>
                    <div className="text-xs text-muted-foreground">27%</div>
                  </div>
                </div>
                <Progress value={27} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="w-4 h-4 text-green-400" />
                    <span className="font-medium">Transporte</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">$120,000</div>
                    <div className="text-xs text-muted-foreground">18%</div>
                  </div>
                </div>
                <Progress value={18} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-primary/20">
            <CardHeader>
              <CardTitle>Insights de IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Badge variant="secondary" className="mb-2 bg-primary/20 text-primary">
                  💡 Oportunidad de Ahorro
                </Badge>
                <p className="text-sm text-foreground">
                  Podrías ahorrar <span className="font-bold text-primary">$45,000</span> mensuales 
                  reduciendo pedidos de delivery de 12 a 8 veces al mes.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <Badge variant="secondary" className="mb-2 bg-accent/20 text-accent">
                  📈 Patrón Detectado
                </Badge>
                <p className="text-sm text-foreground">
                  Tus gastos en transporte aumentan un 23% los viernes. 
                  Considera usar transporte público.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-secondary">
                <Badge variant="secondary" className="mb-2">
                  🎯 Meta Alcanzable
                </Badge>
                <p className="text-sm text-foreground">
                  Con tu patrón actual, alcanzarás tu meta de ahorro 
                  2 meses antes de lo planeado.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;