export type PaymentSection = "academy" | "indicators" | "bot_alerts";
export type PaymentStatus = "completed" | "pending" | "refunded";

export interface SectionRevenue {
  section: PaymentSection;
  label: string;
  revenue: number;
  transactionCount: number;
  topItem: string | null;
}

export interface MonthlyRevenuePoint {
  monthKey: string;
  monthLabel: string;
  academy: number;
  indicators: number;
  bot_alerts: number;
  total: number;
}

export interface FinanceKpis {
  thisMonthRevenue: number;
  thisMonthTransactions: number;
  lastMonthRevenue: number;
  lastMonthTransactions: number;
  averageTransactionValue: number;
  monthOverMonthChange: number | null;
}

export const SECTION_LABELS: Record<PaymentSection, string> = {
  academy: "Academy",
  indicators: "Indicators",
  bot_alerts: "Bot Alerts",
};
