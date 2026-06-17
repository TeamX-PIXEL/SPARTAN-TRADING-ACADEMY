import { addDays, differenceInCalendarDays, isValid, parseISO, startOfDay, startOfMonth, subMonths } from "date-fns";

export type PaymentSection = "academy" | "indicators" | "bot_alerts";
export type PaymentStatus = "completed" | "pending" | "refunded";

export interface Payment {
  id: string;
  date: string;
  section: PaymentSection;
  customer: string;
  item: string;
  amount: number;
  status: PaymentStatus;
  method: "Card" | "Crypto" | "Bank Transfer" | "Telegram" | "Other";
}

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

export interface CourseLike {
  id?: number;
  title?: string;
  price?: number;
  purchased_count?: number;
}

export interface IndicatorLike {
  id: number;
  indicator_name: string;
  indicator_price?: number;
  buyers?: number;
}

export interface BotUserLike {
  id: number | string;
  user?: string;
  user_key?: string;
  telegram_id?: string | number;
  Alpha_Expiry?: string | null;
  Evergreen_Expiry?: string | null;
  Legacy_Expiry?: string | null;
}

export const SECTION_LABELS: Record<PaymentSection, string> = {
  academy: "Academy",
  indicators: "Indicators",
  bot_alerts: "Bot Alerts",
};

const BOT_MODEL_PRICES: Record<string, number> = {
  Alpha: 99,
  Evergreen: 49,
  Legacy: 29,
};

const BOT_DEFAULT_PRICE = 39;

function getBotModelPrice(model: string): number {
  return BOT_MODEL_PRICES[model] ?? BOT_DEFAULT_PRICE;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function pickPaymentMethod(rand: () => number): Payment["method"] {
  const methods: Payment["method"][] = ["Card", "Crypto", "Bank Transfer", "Telegram", "Other"];
  const index = Math.floor(rand() * methods.length);
  return methods[index];
}

function pickStatus(rand: () => number): PaymentStatus {
  const r = rand();
  if (r < 0.92) return "completed";
  if (r < 0.97) return "pending";
  return "refunded";
}

function pseudoCustomerName(rand: () => number, prefix = "Buyer"): string {
  const id = Math.floor(rand() * 9000) + 1000;
  return `${prefix} #${id}`;
}

function buildAcademyPayments(courses: CourseLike[], now: Date): Payment[] {
  const rand = seededRandom(0x4ad3);
  const monthStart = startOfMonth(subMonths(now, 11));
  const payments: Payment[] = [];

  for (const course of courses) {
    const price = Number(course.price) || 0;
    const buyers = Math.max(0, Math.floor(Number(course.purchased_count) || 0));
    if (price <= 0 || buyers === 0) continue;

    for (let i = 0; i < buyers; i++) {
      const dayOffset = Math.floor(rand() * 365);
      const date = addDays(monthStart, dayOffset);
      if (date > now) continue;
      payments.push({
        id: `academy-${course.id ?? "x"}-${i}`,
        date: date.toISOString(),
        section: "academy",
        customer: pseudoCustomerName(rand, "Student"),
        item: course.title ?? "Untitled course",
        amount: price,
        status: pickStatus(rand),
        method: pickPaymentMethod(rand),
      });
    }
  }

  return payments;
}

function buildIndicatorPayments(indicators: IndicatorLike[], now: Date): Payment[] {
  const rand = seededRandom(0x107a);
  const monthStart = startOfMonth(subMonths(now, 11));
  const payments: Payment[] = [];

  for (const indicator of indicators) {
    const price = Number(indicator.indicator_price) || 0;
    const buyers = Math.max(0, Math.floor(Number(indicator.buyers) || 0));
    if (price <= 0 || buyers === 0) continue;

    for (let i = 0; i < buyers; i++) {
      const dayOffset = Math.floor(rand() * 365);
      const date = addDays(monthStart, dayOffset);
      if (date > now) continue;
      payments.push({
        id: `indicator-${indicator.id}-${i}`,
        date: date.toISOString(),
        section: "indicators",
        customer: pseudoCustomerName(rand, "Trader"),
        item: indicator.indicator_name,
        amount: price,
        status: pickStatus(rand),
        method: pickPaymentMethod(rand),
      });
    }
  }

  return payments;
}

function buildBotAlertPayments(users: BotUserLike[], now: Date): Payment[] {
  const rand = seededRandom(0x80a5);
  const monthStart = startOfMonth(subMonths(now, 11));
  const payments: Payment[] = [];

  for (const user of users) {
    const candidates = [
      { model: "Alpha" as const, date: user.Alpha_Expiry ?? null },
      { model: "Evergreen" as const, date: user.Evergreen_Expiry ?? null },
      { model: "Legacy" as const, date: user.Legacy_Expiry ?? null },
    ].filter((c) => Boolean(c.date));

    if (candidates.length === 0) continue;

    for (const candidate of candidates) {
      const expiry = parseISO(candidate.date as string);
      if (!isValid(expiry)) continue;
      const startDate = subMonths(expiry, 1);
      const date = startDate < monthStart ? addDays(monthStart, Math.floor(rand() * 28)) : startDate;
      if (date > now) continue;
      payments.push({
        id: `bot-${user.id}-${candidate.model}`,
        date: date.toISOString(),
        section: "bot_alerts",
        customer: user.user ? `${user.user} (Telegram)` : `tg:${user.telegram_id ?? "unknown"}`,
        item: `${candidate.model} bot subscription`,
        amount: getBotModelPrice(candidate.model),
        status: pickStatus(rand),
        method: "Telegram",
      });
    }
  }

  return payments;
}

export function buildPayments(
  courses: CourseLike[],
  indicators: IndicatorLike[],
  users: BotUserLike[],
  now: Date = new Date(),
): Payment[] {
  const all = [
    ...buildAcademyPayments(courses, now),
    ...buildIndicatorPayments(indicators, now),
    ...buildBotAlertPayments(users, now),
  ];

  return all
    .filter((p) => Number.isFinite(p.amount) && p.amount > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function buildMonthlyRevenue(payments: Payment[], now: Date = new Date()): MonthlyRevenuePoint[] {
  const months: MonthlyRevenuePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = startOfMonth(subMonths(now, i));
    months.push({
      monthKey: monthDate.toISOString().slice(0, 7),
      monthLabel: monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      academy: 0,
      indicators: 0,
      bot_alerts: 0,
      total: 0,
    });
  }
  const indexByKey = new Map(months.map((m, idx) => [m.monthKey, idx]));

  for (const payment of payments) {
    if (payment.status === "refunded") continue;
    const key = startOfMonth(new Date(payment.date)).toISOString().slice(0, 7);
    const idx = indexByKey.get(key);
    if (idx === undefined) continue;
    const point = months[idx];
    point[payment.section] += payment.amount;
    point.total += payment.amount;
  }

  return months;
}

export function buildKpis(payments: Payment[], now: Date = new Date()): FinanceKpis {
  const thisMonthKey = startOfMonth(now).toISOString().slice(0, 7);
  const lastMonthKey = startOfMonth(subMonths(now, 1)).toISOString().slice(0, 7);

  let thisMonthRevenue = 0;
  let thisMonthTransactions = 0;
  let lastMonthRevenue = 0;
  let lastMonthTransactions = 0;

  for (const payment of payments) {
    if (payment.status === "refunded") continue;
    const key = startOfMonth(new Date(payment.date)).toISOString().slice(0, 7);
    if (key === thisMonthKey) {
      thisMonthRevenue += payment.amount;
      thisMonthTransactions += 1;
    } else if (key === lastMonthKey) {
      lastMonthRevenue += payment.amount;
      lastMonthTransactions += 1;
    }
  }

  const averageTransactionValue = thisMonthTransactions > 0 ? thisMonthRevenue / thisMonthTransactions : 0;
  const monthOverMonthChange =
    lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;

  return {
    thisMonthRevenue,
    thisMonthTransactions,
    lastMonthRevenue,
    lastMonthTransactions,
    averageTransactionValue,
    monthOverMonthChange,
  };
}

export function buildSectionRevenue(payments: Payment[]): SectionRevenue[] {
  const sections: PaymentSection[] = ["academy", "indicators", "bot_alerts"];
  const result: SectionRevenue[] = [];

  for (const section of sections) {
    const sectionPayments = payments.filter((p) => p.section === section && p.status !== "refunded");
    const revenue = sectionPayments.reduce((acc, p) => acc + p.amount, 0);
    const transactionCount = sectionPayments.length;

    let topItem: string | null = null;
    let topItemRevenue = 0;
    const itemTotals = new Map<string, number>();
    for (const payment of sectionPayments) {
      itemTotals.set(payment.item, (itemTotals.get(payment.item) ?? 0) + payment.amount);
    }
    for (const [item, total] of itemTotals) {
      if (total > topItemRevenue) {
        topItemRevenue = total;
        topItem = item;
      }
    }

    result.push({
      section,
      label: SECTION_LABELS[section],
      revenue,
      transactionCount,
      topItem,
    });
  }

  return result;
}

export function daysUntil(date: string): number {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return Number.NaN;
  return differenceInCalendarDays(startOfDay(parsed), startOfDay(new Date()));
}
