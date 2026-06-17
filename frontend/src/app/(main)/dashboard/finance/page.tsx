import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { AvgTransactionKpi } from "./_components/kpis/avg-transaction";
import { LastMonthRevenue } from "./_components/kpis/last-month-revenue";
import { ThisMonthRevenue } from "./_components/kpis/this-month-revenue";
import { TransactionsKpi } from "./_components/kpis/transactions";
import { MonthlyRevenueChart } from "./_components/monthly-revenue-chart";
import { PaymentHistoryTable } from "./_components/payment-history/columns";
import { RevenueBySection } from "./_components/revenue-by-section";
import {
  type BotUserLike,
  buildKpis,
  buildMonthlyRevenue,
  buildPayments,
  buildSectionRevenue,
  type CourseLike,
  type IndicatorLike,
} from "./_lib/derive-payments";

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

async function fetchCourses(accessToken: string | undefined) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ courses: CourseLike[] } | CourseLike[]>(`${API_URL}/api/admin/courses`, { headers });
  const data = Array.isArray(result) ? result : (result?.courses ?? []);
  return data;
}

async function fetchIndicators(accessToken: string | undefined) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return safeFetch<IndicatorLike[]>(`${API_URL}/fetch/indicators`, { headers });
}

async function fetchBotUsers(accessToken: string | undefined) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const result = await safeFetch<{ success: boolean; users?: BotUserLike[]; message?: string }>(
    `${API_URL}/api/admin/botusers`,
    { headers },
    { success: false, users: [] },
  );
  if (!result?.success || !Array.isArray(result.users)) return [];
  return result.users;
}

export default async function Page() {
  const session = await getServerSession(authOptions);

  const [courses, indicators, users] = await Promise.all([
    fetchCourses(session?.accessToken),
    fetchIndicators(session?.accessToken),
    fetchBotUsers(session?.accessToken),
  ]);

  const payments = buildPayments(courses, indicators, users);
  const kpis = buildKpis(payments);
  const monthlyRevenue = buildMonthlyRevenue(payments);
  const sectionRevenue = buildSectionRevenue(payments);
  const totalRevenue = sectionRevenue.reduce((acc, s) => acc + s.revenue, 0);

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
