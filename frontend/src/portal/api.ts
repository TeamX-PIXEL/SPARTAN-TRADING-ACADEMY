import { Course, Indicator, Bot, UserProfile, EnrollmentStatus, ProductType, Product, CartItem, Lesson, Transaction } from '@/types/portal';
import { API_BASE_URL, fetchWithAuth } from '@/lib/api-fetch';

export const API = {
  // GET /users/me
  async getProfile(): Promise<UserProfile> {
    const res = await fetchWithAuth(`${API_BASE_URL}/users/me`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    const d = await res.json();
    return {
      id: d.id ?? 1,
      name: `${d.firstname || ""} ${d.lastname || ""}`.trim() || d.UserID || "",
      email: d.email || "",
      avatar: "",
      tvid: d.tvid || "",
      telegram_user_id: d.telegram_user_id || "",
      telegram_chat_id: d.telegram_chat_id || "",
      discord_user_id: d.discord_user_id || "",
      discord_chat_id: d.discord_chat_id || "",
      firstname: d.firstname || "",
      lastname: d.lastname || "",
      username: d.UserID || "",
      phone_number: d.phone_number || "",
      notificationsEnabled: true,
      marketingEmails: false,
      compactMode: false,
      themeColor: "#3b82f6",
    };
  },

  // PUT /users/me
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const body: Record<string, any> = {};
    if (updates.tvid !== undefined) body.tvid = updates.tvid;
    if (updates.firstname !== undefined) body.firstname = updates.firstname;
    if (updates.lastname !== undefined) body.lastname = updates.lastname;
    if (updates.telegram_user_id !== undefined) body.telegram_user_id = updates.telegram_user_id;
    if (updates.telegram_chat_id !== undefined) body.telegram_chat_id = updates.telegram_chat_id;
    if (updates.discord_user_id !== undefined) body.discord_user_id = updates.discord_user_id;
    if (updates.discord_chat_id !== undefined) body.discord_chat_id = updates.discord_chat_id;

    const res = await fetchWithAuth(`${API_BASE_URL}/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return this.getProfile();
  },

  // PUT /users/me/password
  async changePassword(current: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/users/me/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: current, new_password: newPass }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to change password");
    }
    return { success: true, message: "Security credentials updated successfully." };
  },

  // GET /public/courses?skip=&limit=
  async getCourses(skip: number = 0, limit: number = 2): Promise<{ items: Course[]; hasMore: boolean }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/public/courses?skip=${skip}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch courses");
    const d = await res.json();
    const items: Course[] = (d.courses || []).map((c: any) => ({
      id: c.course_id || c.id,
      title: c.title,
      description: c.description,
      longDescription: c.longDescription || c.description,
      price: c.price,
      image: c.image || c.course_thumbnail || "",
      category: c.category || "Masterclass",
      features: c.features || [],
      duration: c.duration || "1 Month",
      lecturer: c.lecturer || "TBA",
      difficulty: c.difficulty || "Beginner",
      scheduled_at: c.scheduled_at,
      estimated_duration: c.estimated_duration,
    }));
    return { items, hasMore: skip + limit < (d.total || items.length) };
  },

  // GET /public/indicators?skip=&limit=
  async getIndicators(skip: number = 0, limit: number = 2): Promise<{ items: Indicator[]; hasMore: boolean }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/public/indicators?skip=${skip}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch indicators");
    const d = await res.json();
    const items: Indicator[] = (d.indicators || []).map((i: any) => ({
      id: i.indicator_id || i.id,
      title: i.title,
      description: i.description,
      longDescription: i.longDescription || i.description,
      price: i.price,
      image: i.image || "",
      category: i.category || "Scripts",
      features: i.features || [],
      scriptType: i.scriptType || "Pine Script",
      accuracy: i.accuracy,
      timeframe: i.timeframe,
    }));
    return { items, hasMore: skip + limit < (d.total || items.length) };
  },

  // GET /public/bots?skip=&limit=
  async getBots(skip: number = 0, limit: number = 2): Promise<{ items: Bot[]; hasMore: boolean }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/public/bots?skip=${skip}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch bots");
    const data = await res.json();
    const items: Bot[] = (Array.isArray(data) ? data : data.bots || []).map((b: any) => ({
      id: b.bot_id || b.id,
      title: b.title,
      description: b.description,
      longDescription: b.description,
      price: b.price,
      image: b.image || "",
      category: b.category || "Trading Bot",
      features: b.features || [],
      exchange: b.exchange || "Binance",
      apy: b.apy || "—",
      status: b.status,
    }));
    return { items, hasMore: items.length === limit };
  },

  // GET /search?q=
  async searchCatalog(query: string): Promise<{ courses: Course[]; indicators: Indicator[]; bots: Bot[] }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search");
    const data = await res.json();

    const courses: Course[] = data.filter((r: any) => r.section === "course").map((r: any) => ({
      id: String(r.id),
      title: r.title,
      description: r.description || "",
      longDescription: r.description || "",
      price: r.price,
      image: r.thumbnail || "",
      category: "Masterclass",
      features: [],
      duration: "1 Month",
      lecturer: "TBA",
      difficulty: "Beginner" as const,
      scheduled_at: r.scheduled_at,
      estimated_duration: r.estimated_duration,
    }));

    const indicators: Indicator[] = data.filter((r: any) => r.section === "indicator").map((r: any) => ({
      id: String(r.id),
      title: r.title,
      description: r.description || "",
      longDescription: r.description || "",
      price: r.price,
      image: r.thumbnail || "",
      category: "Scripts",
      features: [],
      scriptType: "Pine Script",
    }));

    const bots: Bot[] = data.filter((r: any) => r.section === "bot").map((r: any) => ({
      id: String(r.id),
      title: r.title,
      description: r.description || "",
      longDescription: r.description || "",
      price: r.price,
      image: r.thumbnail || "",
      category: "Trading Bot",
      features: [],
      exchange: "Binance",
      apy: "—",
    }));

    return { courses, indicators, bots };
  },

  // GET /my-purchases
  async getPurchasedIds(): Promise<{ courses: string[]; indicators: string[]; bots: string[] }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-purchases`);
    if (!res.ok) return { courses: [], indicators: [], bots: [] };
    return res.json();
  },

  // GET /my-library
  async getLibrary(): Promise<{ courses: Course[]; indicators: Indicator[]; bots: Bot[] }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-library`);
    if (!res.ok) return { courses: [], indicators: [], bots: [] };
    const d = await res.json();

    return {
      courses: (d.courses || []).map((c: any) => ({
        id: c.course_id,
        title: c.title,
        description: c.description || "",
        longDescription: c.description || "",
        price: 0,
        image: c.thumbnail || "",
        category: "Masterclass",
        features: [],
        duration: "1 Month",
        lecturer: "TBA",
        difficulty: "Beginner" as const,
      })),
      indicators: (d.indicators || []).map((i: any) => ({
        id: i.indicator_id,
        title: i.name || i.title,
        description: i.description || "",
        longDescription: i.description || "",
        price: 0,
        image: i.thumbnail || "",
        category: "Scripts",
        features: [],
        scriptType: "Pine Script",
      })),
      bots: (d.bots || []).map((b: any) => ({
        id: b.bot_id,
        title: b.name || b.title,
        description: b.description || "",
        longDescription: b.description || "",
        price: 0,
        image: b.thumbnail || "",
        category: "Trading Bot",
        features: [],
        exchange: "Binance",
        apy: "—",
      })),
    };
  },

  // GET /api/enrollment-status/:course_id
  async getEnrollmentStatus(courseId: string): Promise<EnrollmentStatus> {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/enrollment-status/${courseId}`);
    if (!res.ok) return { completedPercent: 0, status: "not-started", timeline: [] };
    const d = await res.json();

    if (!d.is_purchased) {
      return { completedPercent: 0, status: "not-started", timeline: [] };
    }

    return {
      completedPercent: 25,
      status: "enrolled",
      timeline: [
        { label: "Workshop Registration & API Credential Prep", completed: true, desc: "Initial credential setup validated under current trading account metrics." },
        { label: "Live Stream Block Room Entrance", completed: false, current: true, desc: "Next live transmission pending live schedule trigger." },
        { label: "Interactive Case Critique Seminar", completed: false, desc: "Peer-to-peer breakout code sharing and expert trade reviews." },
        { label: "Terminal Certification Test", completed: false, desc: "Take standard 20-question review to verify knowledge footprint." },
      ],
    };
  },

  // POST /purchase
  async purchaseItem(item: CartItem): Promise<{ success: boolean; message: string }> {
    const sectionMap: Record<string, string> = { course: "Course", indicator: "Indicator", bot: "Bot" };

    const res = await fetchWithAuth(`${API_BASE_URL}/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_section: sectionMap[item.type],
        product_id: item.id,
        amount: item.price,
        method: "Card",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.detail === "TVID_REQUIRED") throw new Error("TVID_REQUIRED");
      throw new Error(err.detail || "Purchase failed");
    }
    return { success: true, message: `Successfully purchased ${item.title}.` };
  },

  // GET /my-lessons
  async getLessons(): Promise<Lesson[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-lessons`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((l: any) => ({
      id: l.id,
      course_id: l.course_id,
      title: l.title,
      type: l.type,
      link: l.link,
      addedAt: l.addedAt || l.added_at,
      duration: l.duration,
      startTime: l.startTime || l.start_time,
    }));
  },

  // GET /my-transactions
  async getTransactions(): Promise<Transaction[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-transactions`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((t: any) => ({
      id: t.id,
      date: t.date,
      product_id: t.product_id,
      productTitle: t.productTitle || "Unknown Product",
      productImage: t.productImage || "https://picsum.photos/seed/default/600/400",
      type: t.type || "Purchase",
      amount: t.amount,
      status: t.status || "SUCCESSFUL",
      tvid: t.tvid || "",
      product_section: t.product_section,
      method: t.method,
    }));
  },

  // POST /my-transactions (save a manual transaction record — for UI-only actions)
  async saveTransaction(tx: Transaction): Promise<Transaction> {
    return tx;
  },

  // GET /my-expirations
  async getExpirations(): Promise<Record<string, string>> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-expirations`);
    if (!res.ok) return {};
    return res.json();
  },

  // POST /renew
  async renewProduct(productId: string, price: number, durationDays: number, section: "Indicator" | "Bot" = "Indicator"): Promise<{ success: boolean; expiration: string }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_section: section,
        product_id: productId,
        amount: price,
        duration_days: durationDays,
        method: "Card",
      }),
    });
    if (!res.ok) throw new Error("Renewal failed");
    const d = await res.json();
    return { success: true, expiration: d.expiration };
  },

  // POST /api/admin/courses/:course_id/lessons (admin add lesson)
  async adminAddLesson(courseId: string, title: string, type: 'youtube' | 'zoom' | 'meet', link: string, startTime?: string): Promise<Lesson> {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${courseId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        link,
        start_time: startTime || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to add lesson");
    const d = await res.json();
    return {
      id: String(d.id),
      course_id: courseId,
      title: d.title,
      type: d.type,
      link: d.link,
      addedAt: d.added_at,
      duration: d.duration,
      startTime: d.start_time,
    };
  },
};

export default API;
