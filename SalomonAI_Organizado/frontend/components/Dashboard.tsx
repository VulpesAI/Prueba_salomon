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
  Home
} from "lucide-react";

const Dashboard = () => {
  return (
    <section className="py-20 bg-background">
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
              <CardTitle className="text-sm font-medium">Ahorro Meta</CardTitle>
              <PiggyBank className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">68%</div>
              <p className="text-xs text-muted-foreground mb-2">
                $340,000 de $500,000
              </p>
              <Progress value={68} className="h-2" />
            </CardContent>
          </Card>
        </div>

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