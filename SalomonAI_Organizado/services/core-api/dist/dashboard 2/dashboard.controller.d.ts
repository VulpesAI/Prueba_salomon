import { FinancialMovementsService } from '../financial-movements/financial-movements.service';
export declare class DashboardController {
    private readonly financialMovementsService;
    constructor(financialMovementsService: FinancialMovementsService);
    getDashboardSummary(req: any): Promise<{
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
        categories: {};
        trends: any[];
        recentTransactions: {
            id: string;
            description: string;
            amount: number;
            category: string;
            date: Date;
            currency: string;
        }[];
    }>;
    getMovements(req: any, page: number, limit: number, category?: string, startDate?: string, endDate?: string): Promise<{
        movements: {
            id: string;
            description: string;
            amount: number;
            category: string;
            date: Date;
            currency: string;
            type: string;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            lastPage: number;
        };
    }>;
    getSpendingAnalysis(req: any, months: number): Promise<{
        period: {
            months: number;
            from: string;
            to: string;
        };
        categories: {};
        topCategories: any[];
    }>;
    private calculateWeeklyTrends;
}
