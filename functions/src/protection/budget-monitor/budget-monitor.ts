import { COST_THRESHOLDS } from '../../config/rate-limits';

// In-memory cost tracking
const dailyCosts = new Map<string, number>();
const monthlyCosts = new Map<string, number>();

export class BudgetMonitor {
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old entries every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600000);
  }

  trackCost(functionName: string, cost: number): { 
    dailyExceeded: boolean;
    monthlyExceeded: boolean;
    dailyWarning: boolean;
    monthlyWarning: boolean;
  } {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);

    // Update daily cost
    const currentDailyCost = (dailyCosts.get(today) || 0) + cost;
    dailyCosts.set(today, currentDailyCost);

    // Update monthly cost
    const currentMonthlyCost = (monthlyCosts.get(month) || 0) + cost;
    monthlyCosts.set(month, currentMonthlyCost);

    // Check thresholds
    return {
      dailyExceeded: currentDailyCost > COST_THRESHOLDS.DAILY_EMERGENCY,
      monthlyExceeded: currentMonthlyCost > COST_THRESHOLDS.MONTHLY_EMERGENCY,
      dailyWarning: currentDailyCost > COST_THRESHOLDS.DAILY_WARNING,
      monthlyWarning: currentMonthlyCost > COST_THRESHOLDS.MONTHLY_WARNING
    };
  }

  private cleanup() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // Clean up old daily costs (keep only last 7 days)
    for (const [date] of dailyCosts) {
      if (date < today) {
        dailyCosts.delete(date);
      }
    }

    // Clean up old monthly costs (keep only last 3 months)
    for (const [month] of monthlyCosts) {
      if (month < currentMonth) {
        monthlyCosts.delete(month);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Export singleton instance
export const budgetMonitor = new BudgetMonitor(); 