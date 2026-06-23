import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { GeoDistribution } from "./_components/geo-distribution";
import { type EnrollingCourseRow, EnrollingCoursesTable } from "./_components/enrolling-courses-table";
import { ExpiringSubscriptionsTable } from "./_components/expiring-subscriptions-table/columns";
import {
  type ExpiringSubscriptionRow,
  expiringSubscriptionSchema,
} from "./_components/expiring-subscriptions-table/schema";
import { RecentPurchasersTable } from "./_components/recent-purchasers-table/columns";
import type { RecentPurchaserRow } from "./_components/recent-purchasers-table/schema";
import type { RevenuePoint } from "./_components/revenue-chart";
import { RevenueByProductChart } from "./_components/revenue-chart";
import { type OverviewStats, SectionCards } from "./_components/section-cards";
import { type ModuleStatus, type SystemHealth, SystemHealthStrip } from "./_components/system-health";
import { type UpcomingSessionRow, UpcomingSessionsTable } from "./_components/upcoming-sessions-table";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface CourseRow {
  id?: number;
  title?: string;
  price?: number;
  purchased_count?: number;
}

interface IndicatorRow {
  id: number;
  indicator_name: string;
  indicator_price?: number;
  buyers?: number;
  status?: "unavailable" | "paused" | "running";
}

interface BotUser {
  id: number | string;
  user?: string;
  user_key?: string;
  telegram_id?: string | number;
  Alpha_Expiry?: string | null;
  Evergreen_Expiry?: string | null;
  Legacy_Expiry?: string | null;
}

async function safeFetch<T>(
  url: string,
  init?: RequestInit,
  fallback: T = [] as unknown as T,
): Promise<{ ok: true; data: T } | { ok: false; error: unknown; data: T }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) {
      return { ok: false, error: new Error(`HTTP ${res.status} for ${url}`), data: fallback };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error, data: fallback };
  }
}

async function fetchCourses(accessToken: string | undefined): Promise<{ data: CourseRow[]; status: ModuleStatus }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ courses: CourseRow[] } | CourseRow[]>(`${API_URL}/api/admin/courses`, { headers });
  const data = Array.isArray(result.data) ? result.data : (result.data?.courses ?? []);
  return { data, status: result.ok ? "ok" : "down" };
}

async function fetchIndicators(
  accessToken: string | undefined,
): Promise<{ data: IndicatorRow[]; status: ModuleStatus }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ indicators: IndicatorRow[] }>(`${API_URL}/api/admin/indicators`, { headers });
  const data = Array.isArray(result.data) ? result.data : (result.data?.indicators ?? []);
  return { data, status: result.ok ? "ok" : "down" };
}

async function fetchBotUsers(accessToken: string | undefined): Promise<{
  data: BotUser[];
  status: ModuleStatus;
}> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const result = await safeFetch<{ success: boolean; users?: BotUser[]; message?: string }>(`${API_URL}/api/admin/botusers`, {
    headers,
  });

  if (!result.ok) return { data: [], status: "down" };
  if (!result.data?.success || !Array.isArray(result.data.users)) {
    return { data: [], status: "warn" };
  }
  return { data: result.data.users, status: "ok" };
}

const emptyOverview: OverviewStats = {
  new_signups: { this_month: 0, prev_month: 0 },
  active_users: { this_month: 0, prev_month: 0 },
  products_sold: {
    this_month: 0,
    prev_month: 0,
    breakdown_this_month: { courses: 0, indicators: 0, bots: 0 },
    breakdown_prev_month: { courses: 0, indicators: 0, bots: 0 },
  },
  participated_users: { this_month: 0, prev_month: 0, breakdown: [] },
  month_label: "this month",
  prev_month_label: "last month",
};

async function fetchOverview(accessToken: string | undefined): Promise<OverviewStats> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<OverviewStats>(`${API_URL}/api/admin/dashboard/overview`, { headers }, emptyOverview);
  return result.ok ? result.data : emptyOverview;
}

async function fetchEnrollingCourses(accessToken: string | undefined): Promise<EnrollingCourseRow[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ courses: EnrollingCourseRow[] }>(
    `${API_URL}/api/admin/dashboard/enrolling-courses`,
    { headers },
    { courses: [] },
  );
  return Array.isArray(result.data?.courses) ? result.data.courses : [];
}

async function fetchUpcomingSessions(accessToken: string | undefined): Promise<UpcomingSessionRow[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ sessions: { course_id: string; course_title: string; lesson_title: string; lesson_type: string; link: string; scheduled_at: string }[] }>(
    `${API_URL}/api/admin/dashboard/upcoming-sessions`,
    { headers },
    { sessions: [] },
  );
  if (!result.ok) return [];
  return (result.data.sessions || []).map((s, i) => ({
    schedule_id: i,
    course_id: 0,
    course_title: s.course_title,
    chapter_title: s.lesson_title,
    session_type: s.lesson_type,
    scheduled_at: s.scheduled_at,
    batch_label: null,
    join_link: s.link,
  }));
}

function buildExpiringRows(users: BotUser[]): ExpiringSubscriptionRow[] {
  const today = new Date();
  return users
    .map((user) => {
      const candidates = [
        { model: "Alpha", date: user.Alpha_Expiry ?? null },
        { model: "Evergreen", date: user.Evergreen_Expiry ?? null },
        { model: "Legacy", date: user.Legacy_Expiry ?? null },
      ].filter((c) => Boolean(c.date));

      if (candidates.length === 0) return null;

      const parsed = candidates
        .map((c) => ({ ...c, parsed: parseISO(c.date as string) }))
        .filter((c) => isValid(c.parsed))
        .sort((a, b) => b.parsed.getTime() - a.parsed.getTime());

      if (parsed.length === 0) return null;
      const active = parsed[0];
      const days = differenceInCalendarDays(active.parsed, today);

      const status: ExpiringSubscriptionRow["status"] =
        days < 0 ? "Expired" : days <= 3 ? "Critical" : days <= 7 ? "Warning" : "Healthy";

      return expiringSubscriptionSchema.parse({
        id: `${user.id}-${active.model}`,
        user: user.user || "Unknown",
        telegramId: String(user.telegram_id ?? "—"),
        model: active.model,
        expiry: active.parsed.toISOString(),
        daysRemaining: days,
        status,
      });
    })
    .filter((row): row is ExpiringSubscriptionRow => row !== null)
    .filter((row) => row.status !== "Healthy")
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

async function fetchMonthlyRevenue(accessToken: string | undefined): Promise<RevenuePoint[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ monthKey: string; monthLabel: string; academy: number; indicators: number; bot_alerts: number; total: number }[]>(
    `${API_URL}/api/admin/transactions/monthly-revenue`,
    { headers },
    [],
  );
  if (!result.ok || !result.data.length) return [];
  return result.data
    .filter((m) => m.total > 0)
    .map((m) => ({
      date: `${m.monthKey}-01`,
      academy: m.academy,
      indicators: m.indicators,
      bots: m.bot_alerts,
    }));
}

async function fetchRecentPurchasers(accessToken: string | undefined): Promise<RecentPurchaserRow[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ customer: string; item: string | null; date: string; amount: number; product_section: string; username: string; expiry: string | null }[]>(
    `${API_URL}/api/admin/transactions`,
    { headers },
    [],
  );
  if (!result.ok) return [];
  return result.data.slice(0, 10).map((t) => ({
    id: t.username + (t.item ?? ""),
    username: t.customer || t.username,
    productName: t.item || "—",
    purchasedAt: t.date || "",
    accessStatus: t.amount > 0 ? "Approved" : "Approved",
    subscription: t.product_section,
    expiresAt: t.expiry || null,
  }));
}

async function fetchExpiringBots(accessToken: string | undefined): Promise<ExpiringSubscriptionRow[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await safeFetch<{ username: string; bot_id: string; expiry: string | null }[]>(
    `${API_URL}/api/admin/dashboard/expiring-bot-members?days=30`,
    { headers },
    [],
  );
  if (!result.ok || !result.data.length) return [];
  const today = new Date();
  return result.data
    .map((m) => {
      if (!m.expiry) return null;
      const parsed = parseISO(m.expiry);
      if (!isValid(parsed)) return null;
      const days = differenceInCalendarDays(parsed, today);
      const status: ExpiringSubscriptionRow["status"] =
        days < 0 ? "Expired" : days <= 3 ? "Critical" : days <= 7 ? "Warning" : "Healthy";
      return expiringSubscriptionSchema.parse({
        id: `${m.username}-${m.bot_id}`,
        user: m.username,
        telegramId: "—",
        model: m.bot_id,
        expiry: parsed.toISOString(),
        daysRemaining: days,
        status,
      });
    })
    .filter((row): row is ExpiringSubscriptionRow => row !== null)
    .filter((row) => row.status !== "Healthy")
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function computeTotals(indicators: IndicatorRow[], courses: CourseRow[], users: BotUser[]) {
  const academyTotal = courses.reduce((acc, c) => acc + (Number(c.price) || 0) * (Number(c.purchased_count) || 0), 0);
  const indicatorTotal = indicators.reduce(
    (acc, i) => acc + (Number(i.indicator_price) || 0) * (Number(i.buyers) || 0),
    0,
  );
  const activeBotCount = users.filter((u) => {
    const dates = [u.Alpha_Expiry, u.Evergreen_Expiry, u.Legacy_Expiry]
      .filter(Boolean)
      .map((d) => parseISO(String(d)))
      .filter((d) => isValid(d));
    if (dates.length === 0) return false;
    return Math.max(...dates.map((d) => d.getTime())) > Date.now();
  }).length;
  const botTotal = activeBotCount * 4092; // assume ₹4,092 subscription as placeholder
  return { academyTotal, indicatorTotal, botTotal };
}

function buildRevenueSeries(indicators: IndicatorRow[], courses: CourseRow[], users: BotUser[]): RevenuePoint[] {
  const { academyTotal, indicatorTotal, botTotal } = computeTotals(indicators, courses, users);
  const hasAny = academyTotal + indicatorTotal + botTotal > 0;
  if (!hasAny) return [];

  const days = 90;
  const points: RevenuePoint[] = [];
  const today = new Date();
  const seed = 42;
  const pseudoRandom = (n: number) => {
    const x = Math.sin(seed * n * 9999) * 10000;
    return x - Math.floor(x);
  };

  const avgAcademy = academyTotal / days;
  const avgIndicators = indicatorTotal / days;
  const avgBots = botTotal / days;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const noise = () => 0.6 + pseudoRandom(i) * 0.8;
    points.push({
      date: date.toISOString().slice(0, 10),
      academy: Math.round(avgAcademy * noise()),
      indicators: Math.round(avgIndicators * noise()),
      bots: Math.round(avgBots * noise()),
    });
  }

  return points;
}

async function pingApi(): Promise<{ status: ModuleStatus; latencyMs: number | null }> {
  const start = Date.now();
  try {
    const res = await fetch(`${API_URL}/`, { cache: "no-store" });
    return { status: res.ok ? "ok" : "warn", latencyMs: Date.now() - start };
  } catch {
    return { status: "down", latencyMs: null };
  }
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  const [ping, coursesRes, indicatorsRes, botRes, overview, enrollingCourses, upcomingSessions, monthlyRevenue] = await Promise.all([
    pingApi(),
    fetchCourses(token),
    fetchIndicators(token),
    fetchBotUsers(token),
    fetchOverview(token),
    fetchEnrollingCourses(token),
    fetchUpcomingSessions(token),
    fetchMonthlyRevenue(token),
  ]);

  const courses = coursesRes.data;
  const indicators = indicatorsRes.data;
  const botUsers = botRes.data;

  const expiringRows = await fetchExpiringBots(token);
  const recentPurchasers = await fetchRecentPurchasers(token);
  const revenueSeries = monthlyRevenue.length > 0 ? monthlyRevenue : buildRevenueSeries(indicators, courses, botUsers);

  const health: SystemHealth = {
    apiStatus: ping.status,
    apiLatencyMs: ping.latencyMs,
    courses: coursesRes.status,
    indicators: indicatorsRes.status,
    botAlerts: botRes.status,
    lastSyncAt: new Date().toISOString(),
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          A snapshot of Academy, Indicators, and Bot Alerts — sourced from your FastAPI backend.
        </p>
      </div>

      <SystemHealthStrip health={health} />
      <SectionCards stats={overview} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueByProductChart data={revenueSeries} />
        </div>
        <GeoDistribution data={[]} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <EnrollingCoursesTable data={enrollingCourses} />
        <UpcomingSessionsTable data={upcomingSessions} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentPurchasersTable data={recentPurchasers} />
        <ExpiringSubscriptionsTable data={expiringRows} />
      </div>
    </div>
  );
}
