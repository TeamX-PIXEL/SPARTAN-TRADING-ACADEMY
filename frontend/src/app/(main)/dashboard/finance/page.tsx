import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { AvgTransactionKpi } from "./_components/kpis/avg-transaction";
import { LastMonthRevenue } from "./_components/kpis/last-month-revenue";
import { ThisMonthRevenue } from "./_components/kpis/this-month-revenue";
import { TransactionsKpi } from "./_components/kpis/transactions";
import { MonthlyRevenueChart } from "./_components/monthly-revenue-chart";
import { PaymentHistoryTable } from "./_components/payment-history/columns";
import { type Payment } from "./_components/payment-history/schema";
import { RevenueBySection } from "./_components/revenue-by-section";
import { type SectionRevenue, type PaymentSection } from "./_lib/derive-payments";
import { SECTION_LABELS } from "./_lib/derive-payments";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function safeFetch<T>(url: string, init?: RequestInit, fallback: T = [] as unknown as T) {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

interface SummaryResponse {
  total_revenue: number;
  total_transactions: number;
  this_month_revenue: number;
  this_month_transactions: number;
  last_month_revenue: number;
  last_month_transactions: number;
  by_section: {
    section: string;
    revenue: number;
    count: number;
    topItem: string | null;
  }[];
}

interface MonthlyRevenuePoint {
  monthKey: string;
  monthLabel: string;
  academy: number;
  indicators: number;
  bot_alerts: number;
  total: number;
}

interface TransactionRow {
  id: string;
  date: string;
  section: string;
  customer: string;
  item: string | null;
  amount: number;
  method: string | null;
  status: string;
}

const SUMMARY_DEFAULTS: SummaryResponse = {
  total_revenue: 0,
  total_transactions: 0,
  this_month_revenue: 0,
  this_month_transactions: 0,
  last_month_revenue: 0,
  last_month_transactions: 0,
  by_section: [],
};

async function fetchSummary(token: string | undefined) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return safeFetch<SummaryResponse>(`${API_URL}/api/admin/transactions/summary`, { headers }, SUMMARY_DEFAULTS);
}

async function fetchMonthlyRevenue(token: string | undefined) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return safeFetch<MonthlyRevenuePoint[]>(`${API_URL}/api/admin/transactions/monthly-revenue`, { headers });
}

async function fetchTransactions(token: string | undefined) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return safeFetch<TransactionRow[]>(`${API_URL}/api/admin/transactions`, { headers });
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const [summary, monthlyRevenue, transactions] = await Promise.all([
    fetchSummary(token),
    fetchMonthlyRevenue(token),
    fetchTransactions(token),
  ]);

  const kpis = {
    thisMonthRevenue: summary.this_month_revenue,
    thisMonthTransactions: summary.this_month_transactions,
    lastMonthRevenue: summary.last_month_revenue,
    lastMonthTransactions: summary.last_month_transactions,
    averageTransactionValue:
      summary.this_month_transactions > 0
        ? summary.this_month_revenue / summary.this_month_transactions
        : 0,
    monthOverMonthChange:
      summary.last_month_revenue > 0
        ? ((summary.this_month_revenue - summary.last_month_revenue) / summary.last_month_revenue) * 100
        : null,
  };

  const sectionRevenue: SectionRevenue[] = summary.by_section.map((s) => ({
    section: s.section as SectionRevenue["section"],
    label: SECTION_LABELS[s.section as PaymentSection] ?? s.section,
    revenue: s.revenue,
    transactionCount: s.count,
    topItem: s.topItem,
  }));
  const totalRevenue = sectionRevenue.reduce((acc, s) => acc + s.revenue, 0);

  const payments: Payment[] = transactions.map((t) => ({
    id: t.id,
    date: t.date,
    section: t.section as Payment["section"],
    customer: t.customer,
    item: t.item ?? "—",
    amount: t.amount,
    status: t.status as Payment["status"],
    method: (t.method ?? "Other") as Payment["method"],
  }));

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight">Finance</h1>
        <p className="text-muted-foreground text-sm">
          Revenue, transactions, and section performance — derived from Academy, Indicators, and Bot Alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs">
        <ThisMonthRevenue
          amount={kpis.thisMonthRevenue}
          transactionCount={kpis.thisMonthTransactions}
          monthOverMonthChange={kpis.monthOverMonthChange}
        />
        <LastMonthRevenue amount={kpis.lastMonthRevenue} />
        <TransactionsKpi thisMonth={kpis.thisMonthTransactions} lastMonth={kpis.lastMonthTransactions} />
        <AvgTransactionKpi amount={kpis.averageTransactionValue} totalTransactions={kpis.thisMonthTransactions} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MonthlyRevenueChart data={monthlyRevenue} />
        </div>
        <RevenueBySection sections={sectionRevenue} totalRevenue={totalRevenue} />
      </div>

      <PaymentHistoryTable data={payments} />
    </div>
  );
}
