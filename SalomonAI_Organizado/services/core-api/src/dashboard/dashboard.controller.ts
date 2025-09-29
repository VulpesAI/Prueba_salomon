import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialMovementsService } from '../financial-movements/financial-movements.service';
import { FinancialForecastsService } from '../financial-forecasts/financial-forecasts.service';
import { GoalsService } from '../goals/goals.service';
import { RecommendationsService } from './recommendations.service';
import { SubmitRecommendationFeedbackDto } from './dto/submit-recommendation-feedback.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly financialMovementsService: FinancialMovementsService,
    private readonly financialForecastsService: FinancialForecastsService,
    private readonly goalsService: GoalsService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Obtener resumen del dashboard del usuario
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getDashboardSummary(@Request() req) {
    const userId = req.user.id;

    // Obtener movimientos del último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const movementsResult = await this.financialMovementsService.findAllByUser(
      userId,
      {
        startDate: lastMonth.toISOString(),
        endDate: new Date().toISOString(),
        page: 1,
        limit: 1000, // Obtener todos los movimientos del período
      },
    );

    const movements = movementsResult.data;

    // Calcular estadísticas básicas
    const totalIncome = movements
      .filter(m => m.amount > 0)
      .reduce((sum, m) => sum + m.amount, 0);

    const totalExpenses = movements
      .filter(m => m.amount < 0)
      .reduce((sum, m) => sum + Math.abs(m.amount), 0);

    const balance = totalIncome - totalExpenses;

    // Agrupar por categorías
    const categoryBreakdown = movements.reduce((acc, movement) => {
      const category = movement.category || 'Sin categoría';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          count: 0,
          type: movement.amount > 0 ? 'income' : 'expense',
        };
      }
      acc[category].total += Math.abs(movement.amount);
      acc[category].count += 1;
      return acc;
    }, {});

    // Tendencias semanales
    const weeklyTrends = this.calculateWeeklyTrends(movements);

    const goalsOverview = await this.goalsService.getDashboardOverview(userId);

    return {
      summary: {
        totalIncome,
        totalExpenses,
        balance,
        transactionCount: movements.length,
        period: {
          from: lastMonth.toISOString(),
          to: new Date().toISOString(),
        },
      },
      categories: categoryBreakdown,
      trends: weeklyTrends,
      goals: goalsOverview,
      recentTransactions: movements
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          description: m.description,
          amount: m.amount,
          category: m.category,
          date: m.transactionDate,
          currency: m.currency,
        })),
    };
  }

  @Get('goals')
  @UseGuards(JwtAuthGuard)
  async getGoalsOverview(@Request() req) {
    const userId = req.user.id;
    return this.goalsService.getDashboardOverview(userId);
  }

  /**
   * Obtener movimientos financieros con paginación
   */
  @Get('movements')
  @UseGuards(JwtAuthGuard)
  async getMovements(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.id;
    
    const result = await this.financialMovementsService.findAllByUser(
      userId,
      {
        startDate,
        endDate,
        page,
        limit,
      },
    );

    return {
      movements: result.data.map(m => ({
        id: m.id,
        description: m.description,
        amount: m.amount,
        category: m.category,
        date: m.transactionDate,
        currency: m.currency,
        type: m.amount > 0 ? 'income' : 'expense',
      })),
      pagination: result.meta,
    };
  }

  @Get('forecasts')
  @UseGuards(JwtAuthGuard)
  async getForecasts(@Request() req) {
    const userId = req.user.id;
    const summary = await this.financialForecastsService.getForecastSummary(userId);

    if (!summary) {
      return {
        modelType: 'none',
        generatedAt: null,
        horizonDays: 0,
        historyDays: 0,
        forecasts: [],
        trend: {
          direction: 'stable',
          change: 0,
          changePercentage: 0,
        },
      };
    }

    return summary;
  }

  @Get('recommendations/personalized')
  @UseGuards(JwtAuthGuard)
  async getPersonalizedRecommendations(
    @Request() req,
    @Query('refresh') refresh?: string,
  ) {
    const userId = req.user.id;
    const shouldRefresh = (refresh ?? 'false').toLowerCase() === 'true';
    return this.recommendationsService.getPersonalizedRecommendations(userId, shouldRefresh);
  }

  @Post('recommendations/feedback')
  @UseGuards(JwtAuthGuard)
  async submitRecommendationFeedback(
    @Request() req,
    @Body() payload: SubmitRecommendationFeedbackDto,
  ) {
    const userId = req.user.id;
    await this.recommendationsService.sendFeedback(userId, payload);
    return { status: 'received' };
  }

  /**
   * Obtener análisis de gastos por categoría
   */
  @Get('spending-analysis')
  @UseGuards(JwtAuthGuard)
  async getSpendingAnalysis(
    @Request() req,
    @Query('months', new DefaultValuePipe(3), ParseIntPipe) months: number,
  ) {
    const userId = req.user.id;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const movementsResult = await this.financialMovementsService.findAllByUser(
      userId,
      {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        page: 1,
        limit: 1000, // Obtener todos los movimientos del período
      },
    );

    const movements = movementsResult.data;

    // Análisis por categoría
    const categoryAnalysis = movements
      .filter(m => m.amount < 0) // Solo gastos
      .reduce((acc, movement) => {
        const category = movement.category || 'Sin categoría';
        if (!acc[category]) {
          acc[category] = {
            total: 0,
            transactions: 0,
            average: 0,
            monthlyData: {},
          };
        }
        
        acc[category].total += Math.abs(movement.amount);
        acc[category].transactions += 1;
        
        // Agrupar por mes
        const monthKey = new Date(movement.transactionDate).toISOString().substring(0, 7); // YYYY-MM
        if (!acc[category].monthlyData[monthKey]) {
          acc[category].monthlyData[monthKey] = 0;
        }
        acc[category].monthlyData[monthKey] += Math.abs(movement.amount);
        
        return acc;
      }, {});

    // Calcular promedios
    Object.keys(categoryAnalysis).forEach(category => {
      categoryAnalysis[category].average = 
        categoryAnalysis[category].total / categoryAnalysis[category].transactions;
    });

    return {
      period: {
        months,
        from: startDate.toISOString(),
        to: new Date().toISOString(),
      },
      categories: categoryAnalysis,
      topCategories: Object.entries(categoryAnalysis)
        .sort(([,a], [,b]) => (b as any).total - (a as any).total)
        .slice(0, 5)
        .map(([name, data]) => ({ name, ...(data as any) })),
    };
  }

  /**
   * Calcular tendencias semanales
   */
  private calculateWeeklyTrends(movements: any[]): any[] {
    const weeklyData = {};
    
    movements.forEach(movement => {
      const date = new Date(movement.transactionDate);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Inicio de semana (domingo)
      const weekKey = weekStart.toISOString().substring(0, 10); // YYYY-MM-DD
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          income: 0,
          expenses: 0,
          transactions: 0,
        };
      }
      
      if (movement.amount > 0) {
        weeklyData[weekKey].income += movement.amount;
      } else {
        weeklyData[weekKey].expenses += Math.abs(movement.amount);
      }
      weeklyData[weekKey].transactions += 1;
    });

    return Object.values(weeklyData)
      .sort((a: any, b: any) => a.week.localeCompare(b.week));
  }
}
