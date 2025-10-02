"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetMonitor = exports.BudgetMonitor = void 0;
const rate_limits_1 = require("../../config/rate-limits");
// In-memory cost tracking
const dailyCosts = new Map();
const monthlyCosts = new Map();
class BudgetMonitor {
    constructor() {
        // Cleanup old entries every hour
        this.cleanupInterval = setInterval(() => this.cleanup(), 3600000);
    }
    trackCost(functionName, cost) {
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
            dailyExceeded: currentDailyCost > rate_limits_1.COST_THRESHOLDS.DAILY_EMERGENCY,
            monthlyExceeded: currentMonthlyCost > rate_limits_1.COST_THRESHOLDS.MONTHLY_EMERGENCY,
            dailyWarning: currentDailyCost > rate_limits_1.COST_THRESHOLDS.DAILY_WARNING,
            monthlyWarning: currentMonthlyCost > rate_limits_1.COST_THRESHOLDS.MONTHLY_WARNING
        };
    }
    cleanup() {
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
exports.BudgetMonitor = BudgetMonitor;
// Export singleton instance
exports.budgetMonitor = new BudgetMonitor();
//# sourceMappingURL=budget-monitor.js.map