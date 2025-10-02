export declare class BudgetMonitor {
    private cleanupInterval;
    constructor();
    trackCost(functionName: string, cost: number): {
        dailyExceeded: boolean;
        monthlyExceeded: boolean;
        dailyWarning: boolean;
        monthlyWarning: boolean;
    };
    private cleanup;
    destroy(): void;
}
export declare const budgetMonitor: BudgetMonitor;
