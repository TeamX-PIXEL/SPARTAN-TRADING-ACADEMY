"use client";

import { create } from "zustand";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

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
  discord_channel_id?: string;
  discord_renewal_price?: number;
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
  status: IndicatorStatus;
  purchased_count: number;
  created_at?: string;
  updated_at?: string;
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
  token_env?: string;
  purchased_count: number;
  created_at?: string;
  updated_at?: string;
}

export type AccessType = "free" | "paid";

export interface Member {
  id: number;
  name: string;
  email: string;
  discordid?: string;
  discordExpiry?: string;
  indicatorExpiry?: string;
  botExpiry?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  accessType: AccessType;
  amount?: number;
  method?: string;
  joinedAt: string;
  courseId?: number;
  indicatorId?: number;
  botId?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mappers (backend snake_case → frontend camelCase)
// ─────────────────────────────────────────────────────────────────────────────

function mapCourse(raw: any): Course {
  return {
    id: raw.id,
    course_id: raw.course_id,
    title: raw.title,
    description: raw.description,
    longDescription: raw.long_description ?? "",
    price: raw.price,
    image: raw.image ?? "",
    category: raw.category ?? "General",
    features: raw.features ?? [],
    duration_months: raw.duration_months ?? 1,
    lecturer: raw.lecturer ?? "TBA",
    difficulty: raw.difficulty ?? "Beginner",
    scheduled_at: raw.scheduled_at ?? "",
    purchased_count: raw.purchased_count ?? 0,
    status: raw.status ?? "upcoming",
    completed_at: raw.completed_at ?? undefined,
    discord_channel_id: raw.discord_channel_id ?? undefined,
    discord_renewal_price: raw.discord_renewal_price ?? undefined,
  };
}

function mapLesson(raw: any): Lesson {
  return {
    id: raw.id,
    courseId: raw.course_id,
    title: raw.title,
    type: raw.type ?? "youtube",
    link: raw.link ?? "",
    addedAt: raw.added_at ?? "",
    duration: raw.duration ?? undefined,
    startTime: raw.start_time ?? undefined,
  };
}

function mapMember(raw: any): Member {
  return {
    id: raw.id,
    username: raw.username ?? "",
    name: raw.name ?? "",
    email: raw.email ?? "",
    firstname: raw.firstname ?? "",
    lastname: raw.lastname ?? "",
    discordid: raw.discord_user_id ?? undefined,
    discordExpiry: raw.expiry ?? undefined,
    accessType: (raw.access_type as AccessType) ?? "free",
    joinedAt: raw.joined_at ?? "",
    courseId: undefined,
  };
}

function mapIndicator(raw: any): Indicator {
  return {
    id: raw.id,
    indicator_id: raw.indicator_id,
    title: raw.title,
    description: raw.description ?? "",
    longDescription: raw.long_description ?? "",
    price: raw.price ?? 0,
    image: raw.image ?? "",
    category: raw.category ?? "General",
    features: raw.features ?? [],
    scriptType: raw.script_type ?? "Pine Script (v6)",
    accuracy: raw.accuracy ?? "—",
    timeframe: raw.timeframe ?? "—",
    pine_id: raw.pine_id ?? null,
    session_id: raw.session_id ?? null,
    status: raw.status ?? "unavailable",
    purchased_count: raw.purchased_count ?? 0,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  };
}

function mapIndicatorMember(raw: any): Member {
  return {
    id: raw.id,
    username: raw.username ?? "",
    name: raw.name ?? "",
    email: raw.email ?? "",
    discordid: raw.discord_user_id ?? undefined,
    indicatorExpiry: raw.expiry ?? undefined,
    accessType: (raw.access_type as AccessType) ?? "free",
    joinedAt: raw.joined_at ?? "",
    indicatorId: undefined,
  };
}

function mapBot(raw: any): Bot {
  return {
    id: raw.id,
    bot_id: raw.bot_id,
    title: raw.title,
    description: raw.description ?? "",
    longDescription: raw.long_description ?? "",
    price: raw.price ?? 0,
    image: raw.image ?? "",
    category: raw.category ?? "General",
    features: raw.features ?? [],
    exchange: raw.exchange ?? "Binance",
    apy: raw.apy ?? "—",
    status: (raw.status as BotStatus) ?? "Idle",
    token_env: raw.token_env ?? undefined,
    purchased_count: raw.purchased_count ?? 0,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  };
}

function mapBotMember(raw: any): Member {
  return {
    id: raw.id,
    username: raw.username ?? "",
    name: raw.name ?? "",
    email: raw.email ?? "",
    botExpiry: raw.expiry ?? undefined,
    accessType: (raw.access_type as AccessType) ?? "free",
    joinedAt: raw.joined_at ?? "",
    botId: undefined,
  };
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
  loading: boolean;

  setSection: (section: Section) => void;
  setView: (view: AcademyView) => void;
  goAcademy: () => void;
  goEnrolledMembers: (courseId: number) => void;
  goLessonsManage: (courseId: number) => void;
  goIndicators: () => void;
  goIndicatorMembers: (indicatorId: number) => void;
  goBots: () => void;
  goBotMembers: (botId: number) => void;

  fetchCourses: () => Promise<void>;
  addCourse: (data: Omit<Course, "id" | "purchased_count" | "status">) => Promise<Course | null>;
  updateCourse: (courseId: string, patch: Partial<Course>) => Promise<Course | null>;
  removeCourse: (courseId: string) => Promise<boolean>;
  markCourseCompleted: (courseId: string) => Promise<Course | null>;

  fetchLessons: (courseId: string) => Promise<void>;
  addLesson: (courseId: string, data: Omit<Lesson, "id" | "addedAt" | "courseId">) => Promise<Lesson | null>;
  updateLesson: (lessonId: number, patch: Partial<Lesson>) => Promise<Lesson | null>;
  removeLesson: (lessonId: number) => Promise<boolean>;

  fetchMembers: (courseId: string) => Promise<void>;
  addMember: (courseId: string, data: { username: string; expiry?: string; amount: number; method: string }) => Promise<Member | null>;
  updateMemberExpiry: (memberId: number, expiry: string) => Promise<Member | null>;
  updateMember: (id: number, patch: Partial<Member>) => void;

  fetchIndicators: () => Promise<void>;
  fetchIndicatorMembers: (indicatorId: string) => Promise<void>;
  addIndicator: (indicator: Omit<Indicator, "id" | "purchased_count">) => Promise<Indicator | null>;
  updateIndicator: (indicatorId: string, patch: Partial<Indicator>) => Promise<Indicator | null>;
  removeIndicator: (indicatorId: string) => Promise<boolean>;
  addIndicatorMember: (indicatorId: string, data: { username: string; expiry?: string; amount: number; method: string }) => Promise<Member | null>;
  updateIndicatorMemberExpiry: (memberId: number, expiry: string) => Promise<Member | null>;

  fetchBots: () => Promise<void>;
  addBot: (data: Omit<Bot, "id" | "purchased_count">) => Promise<Bot | null>;
  updateBot: (botId: number, patch: Partial<Bot>) => Promise<Bot | null>;
  removeBot: (botId: number) => Promise<{ ok: boolean; error?: string }>;

  fetchBotMembers: (botId: number) => Promise<void>;
  addBotMember: (botId: number, data: { username: string; expiry?: string; amount: number; method: string }) => Promise<Member | null>;
  updateBotMemberExpiry: (memberId: number, expiry: string) => Promise<Member | null>;
}

export const useAcademyStore = create<AcademyState>((set, get) => ({
  section: "academy",
  courses: [],
  lessons: [],
  indicators: [],
  members: [],
  bots: [],
  view: { name: "academy" },
  loading: false,

  setSection: (section) => set({ section, view: { name: section } }),
  setView: (view) => set({ view }),
  goAcademy: () => set({ section: "academy", view: { name: "academy" } }),
  goEnrolledMembers: (courseId) => set({ view: { name: "enrolled-members", courseId } }),
  goLessonsManage: (courseId) => set({ view: { name: "lessons-manage", courseId } }),
  goIndicators: () => set({ section: "indicators", view: { name: "indicators" } }),
  goIndicatorMembers: (indicatorId) => set({ view: { name: "indicator-members", indicatorId } }),
  goBots: () => set({ section: "bots", view: { name: "bots" } }),
  goBotMembers: (botId) => set({ view: { name: "bot-members", botId } }),

  // ── COURSES ──────────────────────────────────────────────────────────────

  fetchCourses: async () => {
    set({ loading: true });
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses?skip=0&limit=100`);
      if (res.ok) {
        const data = await res.json();
        set({ courses: (data.courses || []).map(mapCourse), loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  addCourse: async (courseData) => {
    const payload = {
      course_id: courseData.course_id,
      title: courseData.title,
      description: courseData.description,
      long_description: courseData.longDescription || null,
      price: courseData.price,
      image: courseData.image || null,
      category: courseData.category,
      features: courseData.features,
      duration_months: courseData.duration_months,
      lecturer: courseData.lecturer,
      difficulty: courseData.difficulty,
      scheduled_at: courseData.scheduled_at || null,
      discord_channel_id: courseData.discord_channel_id || undefined,
      discord_renewal_price: courseData.discord_renewal_price ?? undefined,
    };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const course = mapCourse(raw);
        set((s) => ({ courses: [...s.courses, course] }));
        return course;
      }
    } catch {}
    return null;
  },

  updateCourse: async (courseId, patch) => {
    const payload: any = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.longDescription !== undefined) payload.long_description = patch.longDescription;
    if (patch.price !== undefined) payload.price = patch.price;
    if (patch.image !== undefined) payload.image = patch.image;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.features !== undefined) payload.features = patch.features;
    if (patch.duration_months !== undefined) payload.duration_months = patch.duration_months;
    if (patch.lecturer !== undefined) payload.lecturer = patch.lecturer;
    if (patch.difficulty !== undefined) payload.difficulty = patch.difficulty;
    if (patch.scheduled_at !== undefined) payload.scheduled_at = patch.scheduled_at;
    if (patch.completed_at !== undefined) payload.completed_at = patch.completed_at;
    if (patch.discord_channel_id !== undefined) payload.discord_channel_id = patch.discord_channel_id;
    if (patch.discord_renewal_price !== undefined) payload.discord_renewal_price = patch.discord_renewal_price;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${encodeURIComponent(courseId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const course = mapCourse(raw);
        set((s) => ({
          courses: s.courses.map((c) => (c.course_id === courseId ? course : c)),
        }));
        return course;
      }
    } catch {}
    return null;
  },

  removeCourse: async (courseId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${encodeURIComponent(courseId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        set((s) => ({
          courses: s.courses.filter((c) => c.course_id !== courseId),
        }));
        return true;
      }
    } catch {}
    return false;
  },

  markCourseCompleted: async (courseId) => {
    return get().updateCourse(courseId, {
      completed_at: new Date().toISOString(),
      status: "completed",
    });
  },

  // ── LESSONS ──────────────────────────────────────────────────────────────

  fetchLessons: async (courseId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${encodeURIComponent(courseId)}/lessons`);
      if (res.ok) {
        const data = await res.json();
        set((s) => {
          const other = s.lessons.filter((l) => l.courseId !== (data[0]?.course_id ?? -1));
          return { lessons: [...other, ...data.map(mapLesson)] };
        });
      }
    } catch {}
  },

  addLesson: async (courseId, data) => {
    const payload = {
      title: data.title,
      type: data.type,
      link: data.link || null,
      duration: data.duration || null,
      start_time: data.startTime || null,
    };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${encodeURIComponent(courseId)}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const lesson = mapLesson(raw);
        set((s) => ({ lessons: [...s.lessons, lesson] }));
        return lesson;
      }
    } catch {}
    return null;
  },

  updateLesson: async (lessonId, patch) => {
    const payload: any = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.type !== undefined) payload.type = patch.type;
    if (patch.link !== undefined) payload.link = patch.link;
    if (patch.duration !== undefined) payload.duration = patch.duration;
    if (patch.startTime !== undefined) payload.start_time = patch.startTime;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/lessons/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const lesson = mapLesson(raw);
        set((s) => ({
          lessons: s.lessons.map((l) => (l.id === lessonId ? lesson : l)),
        }));
        return lesson;
      }
    } catch {}
    return null;
  },

  removeLesson: async (lessonId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        set((s) => ({
          lessons: s.lessons.filter((l) => l.id !== lessonId),
        }));
        return true;
      }
    } catch {}
    return false;
  },

  // ── MEMBERS ──────────────────────────────────────────────────────────────

  fetchMembers: async (courseId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${encodeURIComponent(courseId)}/members`);
      if (res.ok) {
        const data = await res.json();
        const courses = get().courses;
        const course = courses.find((c) => c.course_id === courseId);
        const mapped = data.map((m: any) => {
          const member = mapMember(m);
          member.courseId = course?.id;
          return member;
        });
        set((s) => {
          const other = s.members.filter((m) => m.courseId !== course?.id);
          return { members: [...other, ...mapped] };
        });
      }
    } catch {}
  },

  addMember: async (courseId, data) => {
    const payload = {
      username: data.username,
      expiry: data.expiry || null,
      amount: data.amount,
      method: data.method,
    };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${encodeURIComponent(courseId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const member = mapMember(raw);
        set((s) => ({
          members: [...s.members, member],
        }));
        return member;
      }
    } catch {}
    return null;
  },

  updateMemberExpiry: async (memberId, expiry) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry }),
      });
      if (res.ok) {
        const raw = await res.json();
        const member = mapMember(raw);
        set((s) => ({
          members: s.members.map((m) => (m.id === memberId ? { ...m, discordExpiry: member.discordExpiry } : m)),
        }));
        return member;
      }
    } catch {}
    return null;
  },

  updateMember: (id, patch) =>
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  // ── INDICATORS ────────────────────────────────────────────────────────────

  fetchIndicators: async () => {
    set({ loading: true });
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/indicators?skip=0&limit=100`);
      if (res.ok) {
        const data = await res.json();
        set({ indicators: (data.indicators || []).map(mapIndicator), loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  fetchIndicatorMembers: async (indicatorId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/indicators/${encodeURIComponent(indicatorId)}/members`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((m: any) => {
          const member = mapIndicatorMember(m);
          const indicators = get().indicators;
          const indicator = indicators.find((i) => i.indicator_id === indicatorId);
          member.indicatorId = indicator?.id;
          return member;
        });
        set((s) => {
          const indicator = s.indicators.find((i) => i.indicator_id === indicatorId);
          const other = s.members.filter((m) => m.indicatorId !== indicator?.id);
          return { members: [...other, ...mapped] };
        });
      }
    } catch {}
  },

  addIndicator: async (indicatorData) => {
    const payload = {
      indicator_id: indicatorData.indicator_id,
      title: indicatorData.title,
      description: indicatorData.description || null,
      long_description: indicatorData.longDescription || null,
      price: indicatorData.price,
      image: indicatorData.image || null,
      category: indicatorData.category || "General",
      features: indicatorData.features,
      script_type: indicatorData.scriptType || "Pine Script (v6)",
      accuracy: indicatorData.accuracy || null,
      timeframe: indicatorData.timeframe || null,
      pine_id: indicatorData.pine_id || null,
      session_id: indicatorData.session_id || null,
      status: indicatorData.status || "unavailable",
    };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/indicators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const indicator = mapIndicator(raw);
        set((s) => ({ indicators: [...s.indicators, indicator] }));
        return indicator;
      }
    } catch {}
    return null;
  },

  updateIndicator: async (indicatorId, patch) => {
    const payload: any = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.longDescription !== undefined) payload.long_description = patch.longDescription;
    if (patch.price !== undefined) payload.price = patch.price;
    if (patch.image !== undefined) payload.image = patch.image;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.features !== undefined) payload.features = patch.features;
    if (patch.scriptType !== undefined) payload.script_type = patch.scriptType;
    if (patch.accuracy !== undefined) payload.accuracy = patch.accuracy;
    if (patch.timeframe !== undefined) payload.timeframe = patch.timeframe;
    if (patch.pine_id !== undefined) payload.pine_id = patch.pine_id;
    if (patch.session_id !== undefined) payload.session_id = patch.session_id;
    if (patch.status !== undefined) payload.status = patch.status;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/indicators/${encodeURIComponent(indicatorId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const indicator = mapIndicator(raw);
        set((s) => ({
          indicators: s.indicators.map((i) => (i.indicator_id === indicatorId ? indicator : i)),
        }));
        return indicator;
      }
    } catch {}
    return null;
  },

  removeIndicator: async (indicatorId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/indicators/${encodeURIComponent(indicatorId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        set((s) => ({
          indicators: s.indicators.filter((i) => i.indicator_id !== indicatorId),
          members: s.members.filter((m) => {
            const indicator = s.indicators.find((i) => i.indicator_id === indicatorId);
            return m.indicatorId !== indicator?.id;
          }),
        }));
        return true;
      }
    } catch {}
    return false;
  },

  addIndicatorMember: async (indicatorId, data) => {
    const payload = {
      username: data.username,
      expiry: data.expiry || null,
      amount: data.amount,
      method: data.method,
    };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/indicators/${encodeURIComponent(indicatorId)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const member = mapIndicatorMember(raw);
        const indicators = get().indicators;
        const indicator = indicators.find((i) => i.indicator_id === indicatorId);
        member.indicatorId = indicator?.id;
        set((s) => ({
          members: [...s.members, member],
        }));
        return member;
      }
    } catch {}
    return null;
  },

  updateIndicatorMemberExpiry: async (memberId, expiry) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/indicators/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry: expiry || null }),
      });
      if (res.ok) {
        const raw = await res.json();
        const member = mapIndicatorMember(raw);
        set((s) => ({
          members: s.members.map((m) => (m.id === memberId ? { ...m, indicatorExpiry: member.indicatorExpiry } : m)),
        }));
        return member;
      }
    } catch {}
    return null;
  },

  // ── BOTS ────────────────────────────────────────────────────────────────

  fetchBots: async () => {
    set({ loading: true });
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/bots`);
      if (res.ok) {
        const data = await res.json();
        set({ bots: (Array.isArray(data) ? data : []).map(mapBot), loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  addBot: async (data) => {
    const payload = {
      bot_id: data.bot_id,
      title: data.title,
      description: data.description,
      long_description: data.longDescription,
      price: data.price,
      image: data.image,
      category: data.category,
      features: data.features,
      exchange: data.exchange,
      apy: data.apy,
      status: data.status,
      token_env: data.token_env,
    };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/bots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const bot = mapBot(raw);
        set((s) => ({ bots: [...s.bots, bot] }));
        return bot;
      }
    } catch {}
    return null;
  },

  updateBot: async (botId, patch) => {
    const payload: Record<string, any> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.longDescription !== undefined) payload.long_description = patch.longDescription;
    if (patch.price !== undefined) payload.price = patch.price;
    if (patch.image !== undefined) payload.image = patch.image;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.features !== undefined) payload.features = patch.features;
    if (patch.exchange !== undefined) payload.exchange = patch.exchange;
    if (patch.apy !== undefined) payload.apy = patch.apy;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.token_env !== undefined) payload.token_env = patch.token_env;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/edit/bot/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const bot = mapBot(raw);
        set((s) => ({
          bots: s.bots.map((b) => (b.id === botId ? bot : b)),
        }));
        return bot;
      }
    } catch {}
    return null;
  },

  removeBot: async (botId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/delete/bot/${botId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        set((s) => ({
          bots: s.bots.filter((b) => b.id !== botId),
          members: s.members.filter((m) => m.botId !== botId),
        }));
        return { ok: true };
      }
      const body = await res.json().catch(() => null);
      return { ok: false, error: body?.detail ?? "Failed to delete bot." };
    } catch {
      return { ok: false, error: "Network error." };
    }
  },

  fetchBotMembers: async (botId) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/bots/${botId}/members`);
      if (res.ok) {
        const data = await res.json();
        const mapped = (Array.isArray(data) ? data : []).map(mapBotMember);
        mapped.forEach((m) => { m.botId = botId; });
        set((s) => {
          const otherMembers = s.members.filter((m) => m.botId !== botId);
          return { members: [...otherMembers, ...mapped] };
        });
      }
    } catch {}
  },

  addBotMember: async (botId, data) => {
    const payload = {
      username: data.username,
      expiry: data.expiry || null,
      amount: data.amount,
      method: data.method,
    };

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/bots/${botId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        const member = mapBotMember(raw);
        member.botId = botId;
        set((s) => ({
          members: [...s.members, member],
        }));
        return member;
      }
    } catch {}
    return null;
  },

  updateBotMemberExpiry: async (memberId, expiry) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/bots/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiry: expiry || null }),
      });
      if (res.ok) {
        const raw = await res.json();
        const member = mapBotMember(raw);
        set((s) => ({
          members: s.members.map((m) => (m.id === memberId ? { ...m, botExpiry: member.botExpiry } : m)),
        }));
        return member;
      }
    } catch {}
    return null;
  },
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
