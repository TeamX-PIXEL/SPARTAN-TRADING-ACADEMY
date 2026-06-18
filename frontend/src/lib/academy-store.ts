"use client";

import { create } from "zustand";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CourseStatus = "upcoming" | "ongoing" | "completed";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced" | "Master";

export interface Course {
  id: number;
  course_id: string;
  title: string;
  description: string;
  longDescription: string;
  price: number;
  image: string;
  category: string;
  features: string[];
  duration_months: number;
  lecturer: string;
  difficulty: Difficulty;
  scheduled_at: string;
  purchased_count: number;
  status: CourseStatus;
  completed_at?: string;
}

export type LessonType = "youtube" | "zoom" | "meet";

export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  type: LessonType;
  link: string;
  addedAt: string;
  duration?: string;
  startTime?: string;
}

export type IndicatorStatus = "running" | "paused" | "unavailable";
export type ExpiryPeriod = "7D" | "1M" | "3M" | "6M" | "1Y" | "1L";

export interface Indicator {
  id: number;
  indicator_id: string;
  title: string;
  description: string;
  longDescription: string;
  price: number;
  image: string;
  category: string;
  features: string[];
  scriptType: string;
  accuracy: string;
  timeframe: string;
  pine_id?: string | null;
  session_id?: string | null;
  expiry_period: ExpiryPeriod;
  status: IndicatorStatus;
  purchased_count: number;
}

export type BotStatus = "Running" | "Idle" | "Paused";

export interface Bot {
  id: number;
  bot_id: string;
  title: string;
  description: string;
  longDescription: string;
  price: number;
  image: string;
  category: string;
  features: string[];
  exchange: string;
  apy: string;
  status: BotStatus;
  apiKey?: string;
  telegram_id?: string;
  token_env?: string;
  purchased_count: number;
}

export type AccessType = "free" | "paid";

export interface Member {
  id: number;
  name: string;
  email: string;
  tvid: string;
  telegramid?: string;
  discordid?: string;
  discordExpiry?: string;
  indicatorExpiry?: string;
  botExpiry?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  accessType: AccessType;
  joinedAt: string;
  courseId?: number;
  indicatorId?: number;
  botId?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// View routing
// ─────────────────────────────────────────────────────────────────────────────

export type Section = "academy" | "indicators" | "bots";

export type AcademyView =
  | { name: "academy" }
  | { name: "enrolled-members"; courseId: number }
  | { name: "lessons-manage"; courseId: number }
  | { name: "indicators" }
  | { name: "indicator-members"; indicatorId: number }
  | { name: "bots" }
  | { name: "bot-members"; botId: number };

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

interface AcademyState {
  section: Section;
  courses: Course[];
  lessons: Lesson[];
  members: Member[];
  indicators: Indicator[];
  bots: Bot[];
  view: AcademyView;

  setSection: (section: Section) => void;
  setView: (view: AcademyView) => void;
  goAcademy: () => void;
  goEnrolledMembers: (courseId: number) => void;
  goLessonsManage: (courseId: number) => void;
  goIndicators: () => void;
  goIndicatorMembers: (indicatorId: number) => void;
  goBots: () => void;
  goBotMembers: (botId: number) => void;

  addCourse: (course: Omit<Course, "id" | "purchased_count" | "status">) => void;
  updateCourse: (id: number, patch: Partial<Course>) => void;
  removeCourse: (id: number) => void;
  markCourseCompleted: (id: number) => void;

  addLesson: (lesson: Omit<Lesson, "id" | "addedAt">) => void;
  removeLesson: (id: number) => void;

  addMember: (member: Omit<Member, "id" | "joinedAt">) => void;
  removeMember: (id: number) => void;
  updateMember: (id: number, patch: Partial<Member>) => void;

  addIndicator: (indicator: Omit<Indicator, "id" | "purchased_count">) => void;
  updateIndicator: (id: number, patch: Partial<Indicator>) => void;
  removeIndicator: (id: number) => void;

  addIndicatorMember: (member: Omit<Member, "id" | "joinedAt">) => void;
  removeIndicatorMember: (id: number) => void;

  addBot: (bot: Omit<Bot, "id" | "purchased_count">) => void;
  updateBot: (id: number, patch: Partial<Bot>) => void;

  addBotMember: (member: Omit<Member, "id" | "joinedAt">) => void;
  removeBotMember: (id: number) => void;
}

export const useAcademyStore = create<AcademyState>((set) => ({
  section: "academy",
  courses: [
    {
      id: 1,
      course_id: "CRS-101",
      title: "Price Action Mastery",
      description: "Master naked chart reading with support/resistance, trendlines, and candlestick patterns.",
      longDescription: "A comprehensive course on pure price action trading. Learn to read the market without indicators.",
      price: 4092,
      image: "",
      category: "Trading",
      features: ["8 HD Lessons", "Live Weekly Sessions", "Certificate", "1 Year Free Discord Support"],
      duration_months: 1,
      lecturer: "Spartan Academy",
      difficulty: "Beginner",
      scheduled_at: "2026-07-01T18:00:00Z",
      purchased_count: 12,
      status: "upcoming",
    },
    {
      id: 2,
      course_id: "CRS-102",
      title: "ICT Concepts Deep Dive",
      description: "Liquidity sweeps, order blocks, fair value gaps, and smart money execution.",
      longDescription: "Deep dive into Inner Circle Trader concepts for institutional-style trading.",
      price: 8184,
      image: "",
      category: "Trading",
      features: ["12 HD Lessons", "Mentorship Access", "Slack Community", "1 Year Free Discord Support"],
      duration_months: 2,
      lecturer: "Spartan Academy",
      difficulty: "Advanced",
      scheduled_at: "2026-06-10T18:00:00Z",
      purchased_count: 8,
      status: "ongoing",
    },
  ],
  lessons: [],
  indicators: [
    {
      id: 1,
      indicator_id: "TVID-201",
      title: "Spartan Scalper",
      description: "Real-time scalping indicator with entry/exit signals and risk management overlays.",
      longDescription: "High-accuracy scalping tool built for M5/M15 timeframes with built-in SL/TP levels.",
      price: 4092,
      image: "",
      category: "Scalping",
      features: ["Real-time Alerts", "Multi-pair Support", "Custom Dashboard", "1 Year Free Discord Support"],
      scriptType: "Pine Script (v6)",
      accuracy: "87%",
      timeframe: "M5 / M15",
      expiry_period: "1Y",
      status: "running",
      purchased_count: 15,
    },
    {
      id: 2,
      indicator_id: "TVID-202",
      title: "Liquidity Tracker",
      description: "Tracks institutional liquidity zones and potential sweep targets across all timeframes.",
      longDescription: "Visualize where big money is resting. Identify sweep targets before they happen.",
      price: 6548,
      image: "",
      category: "Analysis",
      features: ["Multi-TF Heatmap", "Session Overlays", "Alert Integration", "1 Year Free Discord Support"],
      scriptType: "Pine Script (v6)",
      accuracy: "92%",
      timeframe: "M15 / H1",
      expiry_period: "1Y",
      status: "running",
      purchased_count: 9,
    },
  ],
  members: [
    {
      id: 1,
      name: "Algo4X Admin",
      email: "algo4x@gamil.com",
      tvid: "TVID-ALGO",
      telegramid: "@algo4x",
      firstname: "Algo4X",
      lastname: "Admin",
      username: "admin",
      accessType: "paid",
      joinedAt: "2026-05-10T12:00:00Z",
      courseId: 1,
      discordExpiry: "2027-05-10",
    },
    {
      id: 2,
      name: "Algo4X Admin",
      email: "algo4x@gamil.com",
      tvid: "TVID-ALGO",
      telegramid: "@algo4x",
      firstname: "Algo4X",
      lastname: "Admin",
      username: "admin",
      accessType: "paid",
      joinedAt: "2026-05-12T12:00:00Z",
      courseId: 2,
      discordExpiry: "2027-05-12",
    },
    {
      id: 3,
      name: "Algo4X Admin",
      email: "algo4x@gamil.com",
      tvid: "TVID-ALGO",
      telegramid: "@algo4x",
      firstname: "Algo4X",
      lastname: "Admin",
      username: "admin",
      accessType: "paid",
      joinedAt: "2026-05-15T12:00:00Z",
      indicatorId: 1,
      discordExpiry: "2027-05-15",
      indicatorExpiry: "2027-05-15",
    },
    {
      id: 4,
      name: "Algo4X Admin",
      email: "algo4x@gamil.com",
      tvid: "TVID-ALGO",
      telegramid: "@algo4x",
      firstname: "Algo4X",
      lastname: "Admin",
      username: "admin",
      accessType: "paid",
      joinedAt: "2026-05-18T12:00:00Z",
      indicatorId: 2,
      discordExpiry: "2027-05-18",
      indicatorExpiry: "2027-05-18",
    },
    {
      id: 5,
      name: "Algo4X Admin",
      email: "algo4x@gamil.com",
      tvid: "TVID-ALGO",
      telegramid: "@algo4x",
      firstname: "Algo4X",
      lastname: "Admin",
      username: "admin",
      accessType: "paid",
      joinedAt: "2026-05-20T12:00:00Z",
      botId: 1,
      discordExpiry: "2027-05-20",
      botExpiry: "2027-05-20",
    },
  ],
  bots: [
    {
      id: 1,
      bot_id: "BOT-301",
      title: "Grid Hunter Pro",
      description: "Automated grid trading bot with adaptive spacing and drawdown protection for volatile pairs.",
      longDescription: "Grid Hunter Pro dynamically adjusts grid spacing based on ATR volatility, with built-in drawdown protection and trailing stop integration. Supports major crypto pairs on Binance and Bybit.",
      price: 4092,
      image: "",
      category: "Grid",
      features: ["Adaptive Grid Spacing", "Drawdown Protection", "Telegram Alert Channel", "1 Year Free Discord Support"],
      exchange: "Binance",
      apy: "142",
      status: "Running",
      purchased_count: 3,
    },
  ],
  view: { name: "academy" },

  setSection: (section) => set({ section, view: { name: section } }),
  setView: (view) => set({ view }),
  goAcademy: () => set({ section: "academy", view: { name: "academy" } }),
  goEnrolledMembers: (courseId) => set({ view: { name: "enrolled-members", courseId } }),
  goLessonsManage: (courseId) => set({ view: { name: "lessons-manage", courseId } }),
  goIndicators: () => set({ section: "indicators", view: { name: "indicators" } }),
  goIndicatorMembers: (indicatorId) => set({ view: { name: "indicator-members", indicatorId } }),
  goBots: () => set({ section: "bots", view: { name: "bots" } }),
  goBotMembers: (botId) => set({ view: { name: "bot-members", botId } }),

  addCourse: (course) =>
    set((s) => ({
      courses: [
        ...s.courses,
        {
          ...course,
          id: Math.max(0, ...s.courses.map((c) => c.id)) + 1,
          purchased_count: 0,
          status: "upcoming",
        },
      ],
    })),

  updateCourse: (id, patch) =>
    set((s) => ({
      courses: s.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeCourse: (id) =>
    set((s) => ({
      courses: s.courses.filter((c) => c.id !== id),
      lessons: s.lessons.filter((l) => l.courseId !== id),
      members: s.members.filter((m) => m.courseId !== id),
    })),

  markCourseCompleted: (id) =>
    set((s) => ({
      courses: s.courses.map((c) =>
        c.id === id ? { ...c, status: "completed" as CourseStatus, completed_at: new Date().toISOString() } : c,
      ),
    })),

  addLesson: (lesson) =>
    set((s) => ({
      lessons: [
        ...s.lessons,
        {
          ...lesson,
          id: Math.max(0, ...s.lessons.map((l) => l.id)) + 1,
          addedAt: new Date().toISOString(),
        },
      ],
    })),

  removeLesson: (id) =>
    set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) })),

  addMember: (member) =>
    set((s) => ({
      members: [
        ...s.members,
        {
          ...member,
          id: Math.max(0, ...s.members.map((m) => m.id)) + 1,
          joinedAt: new Date().toISOString(),
        },
      ],
      courses: member.courseId
        ? s.courses.map((c) =>
            c.id === member.courseId ? { ...c, purchased_count: c.purchased_count + 1 } : c,
          )
        : s.courses,
    })),

  removeMember: (id) =>
    set((s) => {
      const m = s.members.find((x) => x.id === id);
      return {
        members: s.members.filter((x) => x.id !== id),
        courses: m?.courseId
          ? s.courses.map((c) =>
              c.id === m.courseId
                ? { ...c, purchased_count: Math.max(0, c.purchased_count - 1) }
                : c,
            )
          : s.courses,
      };
    }),

  updateMember: (id, patch) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  addIndicator: (indicator) =>
    set((s) => ({
      indicators: [
        ...s.indicators,
        {
          ...indicator,
          id: Math.max(0, ...s.indicators.map((i) => i.id)) + 1,
          purchased_count: 0,
        },
      ],
    })),

  updateIndicator: (id, patch) =>
    set((s) => ({
      indicators: s.indicators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),

  removeIndicator: (id) =>
    set((s) => ({
      indicators: s.indicators.filter((i) => i.id !== id),
      members: s.members.filter((m) => m.indicatorId !== id),
    })),

  addIndicatorMember: (member) =>
    set((s) => ({
      members: [
        ...s.members,
        {
          ...member,
          id: Math.max(0, ...s.members.map((m) => m.id)) + 1,
          joinedAt: new Date().toISOString(),
        },
      ],
      indicators: member.indicatorId
        ? s.indicators.map((i) =>
            i.id === member.indicatorId ? { ...i, purchased_count: i.purchased_count + 1 } : i,
          )
        : s.indicators,
    })),

  removeIndicatorMember: (id) =>
    set((s) => {
      const m = s.members.find((x) => x.id === id);
      return {
        members: s.members.filter((x) => x.id !== id),
        indicators: m?.indicatorId
          ? s.indicators.map((i) =>
              i.id === m.indicatorId
                ? { ...i, purchased_count: Math.max(0, i.purchased_count - 1) }
                : i,
            )
          : s.indicators,
      };
    }),

  addBot: (bot) =>
    set((s) => ({
      bots: [
        ...s.bots,
        {
          ...bot,
          id: Math.max(0, ...s.bots.map((b) => b.id)) + 1,
          purchased_count: 0,
        },
      ],
    })),

  updateBot: (id, patch) =>
    set((s) => ({
      bots: s.bots.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),

  addBotMember: (member) =>
    set((s) => ({
      members: [
        ...s.members,
        {
          ...member,
          id: Math.max(0, ...s.members.map((m) => m.id)) + 1,
          joinedAt: new Date().toISOString(),
        },
      ],
      bots: member.botId
        ? s.bots.map((b) =>
            b.id === member.botId ? { ...b, purchased_count: b.purchased_count + 1 } : b,
          )
        : s.bots,
    })),

  removeBotMember: (id) =>
    set((s) => {
      const m = s.members.find((x) => x.id === id);
      return {
        members: s.members.filter((x) => x.id !== id),
        bots: m?.botId
          ? s.bots.map((b) =>
              b.id === m.botId
                ? { ...b, purchased_count: Math.max(0, b.purchased_count - 1) }
                : b,
            )
          : s.bots,
      };
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(isoStr?: string): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(isoStr?: string): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
