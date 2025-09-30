import { PredictiveAlertsService } from './predictive-alerts.service';
export declare class AlertsController {
    private readonly predictiveAlertsService;
    constructor(predictiveAlertsService: PredictiveAlertsService);
    getPredictiveAlerts(req: any): Promise<{
        alerts: import("./predictive-alerts.service").PredictiveAlert[];
    }>;
}
