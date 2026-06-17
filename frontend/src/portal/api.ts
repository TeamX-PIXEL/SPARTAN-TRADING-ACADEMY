import { Course, Indicator, Bot, UserProfile, EnrollmentStatus, ProductType, Product, CartItem, Lesson, Transaction } from '@/types/portal';
import { MOCK_COURSES, MOCK_INDICATORS, MOCK_BOTS } from './data';

// Small utility to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Active Local Storage Keys
const KEYS = {
  USER_PROFILE: 'dealdeck_user_profile',
  PURCHASED: 'dealdeck_purchases',
  CART: 'dealdeck_cart',
  LESSONS: 'dealdeck_lessons',
  TRANSACTIONS: 'dealdeck_transactions',
  EXPIRATIONS: 'dealdeck_expirations',
};

// Initial state setups
const DEFAULT_USER: UserProfile = {
  name: "Marcus Aurelius",
  email: "marcus.a@stoic-trader.com",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  tvid: "stoic_trader_tv_99", // Can be cleared in settings to test empty state / checkout block!
  telegramid: "@stoic_trader",
  discordid: "@stoic_discord_99",
  firstname: "Marcus",
  lastname: "Aurelius",
  username: "stoic_trader",
  notificationsEnabled: true,
  marketingEmails: false,
  compactMode: false,
  themeColor: "#3b82f6" // blue
};

const DEFAULT_PURCHASES = {
  courses: ["course-4"], // Start with 1 course pre-purchased (Completed / Scalping Blueprint)
  indicators: [] as string[],
  bots: ["bot-2"] // 1 Bot running
};

// Initial Lessons Seed
const INITIAL_LESSONS = [
  {
    id: "lesson-2-1",
    courseUuid: "course-2",
    title: "Microstructure Cointegration & Arbitrage Channels",
    type: "youtube" as const,
    link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    addedAt: "2026-06-11T12:00:00Z",
    duration: "45 mins"
  },
  {
    id: "lesson-2-2",
    courseUuid: "course-2",
    title: "Live Grid Alignment & Dynamic Spreads (Weekly Broadcast)",
    type: "zoom" as const,
    link: "https://zoom.us/j/9876543210",
    addedAt: "2026-06-12T14:30:00Z",
    duration: "Live Q&A"
  },
  {
    id: "lesson-4-1",
    courseUuid: "course-4",
    title: "High Probability Price Action Clusters & Wick Sweeps",
    type: "youtube" as const,
    link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    addedAt: "2026-06-09T08:00:00Z",
    duration: "35 mins"
  },
  {
    id: "lesson-4-2",
    courseUuid: "course-4",
    title: "Tape Acceleration & Delta Imbalance Indicators",
    type: "youtube" as const,
    link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    addedAt: "2026-06-10T10:00:00Z",
    duration: "50 mins"
  },
  {
    id: "lesson-4-3",
    courseUuid: "course-4",
    title: "Live Peer Breakout Strategy Review",
    type: "meet" as const,
    link: "https://meet.google.com/abc-defg-hij",
    addedAt: "2026-06-11T15:30:00Z",
    duration: "Recorded"
  }
];

// Initial Transactions Seed
const INITIAL_TRANSACTIONS = [
  {
    id: "TX-8192-41",
    date: "2026-06-08T10:30:00Z",
    productUuid: "course-4",
    productTitle: "The Scalping Blueprint: 5m Trend Crushing",
    productImage: "https://picsum.photos/seed/scalp/600/400",
    type: "Purchase" as const,
    amount: 199,
    status: "SUCCESSFUL" as const,
    tvid: "stoic_trader_tv_99"
  },
  {
    id: "TX-2713-09",
    date: "2026-06-10T15:45:00Z",
    productUuid: "bot-2",
    productTitle: "Trend-Rider EMA Breakout AutoBot",
    productImage: "https://picsum.photos/seed/bot2/600/400",
    type: "Purchase" as const,
    amount: 199,
    status: "SUCCESSFUL" as const,
    tvid: "stoic_trader_tv_99"
  }
];

// Initial Expirations Seed (30 days limit for bought scripts/bots)
const getInitialExpirations = () => {
  const futureDate = new Date("2026-06-12T22:27:53-07:00");
  futureDate.setDate(futureDate.getDate() + 30);
  return {
    "bot-2": futureDate.toISOString()
  };
};

// Helpers to get/set local database items
const getStoredProfile = (): UserProfile => {
  const data = localStorage.getItem(KEYS.USER_PROFILE);
  if (!data) {
    localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }
  return { ...DEFAULT_USER, ...JSON.parse(data) };
};

const saveProfile = (profile: UserProfile) => {
  localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
};

export const getStoredPurchases = () => {
  const data = localStorage.getItem(KEYS.PURCHASED);
  if (!data) {
    localStorage.setItem(KEYS.PURCHASED, JSON.stringify(DEFAULT_PURCHASES));
    return DEFAULT_PURCHASES;
  }
  return JSON.parse(data);
};

export const savePurchases = (purchases: typeof DEFAULT_PURCHASES) => {
  localStorage.setItem(KEYS.PURCHASED, JSON.stringify(purchases));
};

export const getStoredLessons = () => {
  const data = localStorage.getItem(KEYS.LESSONS);
  if (!data) {
    localStorage.setItem(KEYS.LESSONS, JSON.stringify(INITIAL_LESSONS));
    return INITIAL_LESSONS;
  }
  return JSON.parse(data);
};

export const saveLessons = (lessons: typeof INITIAL_LESSONS) => {
  localStorage.setItem(KEYS.LESSONS, JSON.stringify(lessons));
};

export const getStoredTransactions = () => {
  const data = localStorage.getItem(KEYS.TRANSACTIONS);
  if (!data) {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  }
  return JSON.parse(data);
};

export const saveTransactions = (txs: typeof INITIAL_TRANSACTIONS) => {
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
};

export const getStoredExpirations = (): Record<string, string> => {
  const data = localStorage.getItem(KEYS.EXPIRATIONS);
  if (!data) {
    const fresh = getInitialExpirations();
    localStorage.setItem(KEYS.EXPIRATIONS, JSON.stringify(fresh));
    return fresh;
  }
  return JSON.parse(data);
};

export const saveExpirations = (expirations: Record<string, string>) => {
  localStorage.setItem(KEYS.EXPIRATIONS, JSON.stringify(expirations));
};

// Simulated Endpoints
export const API = {
  // GET /users/me
  async getProfile(): Promise<UserProfile> {
    await delay(400);
    return getStoredProfile();
  },

  // PUT /users/me
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await delay(500);
    const profile = getStoredProfile();
    const updated = { ...profile, ...updates };
    saveProfile(updated);
    return updated;
  },

  // PUT /users/me/password
  async changePassword(current: string, newPass: string): Promise<{ success: boolean; message: string }> {
    await delay(600);
    if (!current) {
      throw new Error("Current password is required.");
    }
    if (newPass.length < 6) {
      throw new Error("New password must be at least 6 characters.");
    }
    return { success: true, message: "Security credentials updated successfully." };
  },

  // GET /public/courses?skip=&limit=
  async getCourses(skip: number = 0, limit: number = 2): Promise<{ items: Course[]; hasMore: boolean }> {
    await delay(400);
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const upcomingCourses = MOCK_COURSES.filter(c => c.scheduled_at && new Date(c.scheduled_at) > fiveMinFromNow);
    const items = upcomingCourses.slice(skip, skip + limit);
    const hasMore = skip + limit < upcomingCourses.length;
    return { items, hasMore };
  },

  // GET /public/indicators?skip=&limit=
  async getIndicators(skip: number = 0, limit: number = 2): Promise<{ items: Indicator[]; hasMore: boolean }> {
    await delay(400);
    const items = MOCK_INDICATORS.slice(skip, skip + limit);
    const hasMore = skip + limit < MOCK_INDICATORS.length;
    return { items, hasMore };
  },

  // GET /public/bots?skip=&limit=
  async getBots(skip: number = 0, limit: number = 2): Promise<{ items: Bot[]; hasMore: boolean }> {
    await delay(400);
    const items = MOCK_BOTS.slice(skip, skip + limit);
    const hasMore = skip + limit < MOCK_BOTS.length;
    return { items, hasMore };
  },

  // GET /search?q=
  async searchCatalog(query: string): Promise<{ courses: Course[]; indicators: Indicator[]; bots: Bot[] }> {
    await delay(300);
    const lowercase = query.toLowerCase();
    
    const filterFn = (item: any) => 
      item.title.toLowerCase().includes(lowercase) || 
      item.description.toLowerCase().includes(lowercase) ||
      item.category.toLowerCase().includes(lowercase);

    return {
      courses: MOCK_COURSES.filter(c => filterFn(c) && c.scheduled_at && new Date(c.scheduled_at) > new Date(Date.now() + 5 * 60 * 1000)),
      indicators: MOCK_INDICATORS.filter(filterFn),
      bots: MOCK_BOTS.filter(filterFn),
    };
  },

  // GET /my-purchases
  async getPurchasedIds(): Promise<{ courses: string[]; indicators: string[]; bots: string[] }> {
    await delay(200);
    return getStoredPurchases();
  },

  // GET /my-library
  async getLibrary(): Promise<{ courses: Course[]; indicators: Indicator[]; bots: Bot[] }> {
    await delay(500);
    const purchases = getStoredPurchases();
    return {
      courses: MOCK_COURSES.filter(c => purchases.courses.includes(c.uuid)),
      indicators: MOCK_INDICATORS.filter(i => purchases.indicators.includes(i.uuid)),
      bots: MOCK_BOTS.filter(b => purchases.bots.includes(b.uuid)),
    };
  },

  // GET /api/enrollment-status/:uuid
  async getEnrollmentStatus(courseUuid: string): Promise<EnrollmentStatus> {
    await delay(650);
    const purchases = getStoredPurchases();
    if (!purchases.courses.includes(courseUuid)) {
      return {
        completedPercent: 0,
        status: 'not-started',
        timeline: []
      };
    }

    // Adapt responses based on specific course items
    if (courseUuid === 'course-4') {
      // Completed Course
      return {
        completedPercent: 100,
        status: 'completed',
        timeline: [
          { label: "Workshop Registration", completed: true, desc: "Successfully registered and verified TVID account.", date: "June 08, 2026" },
          { label: "Live Broadcast: Session 1", completed: true, desc: "Order blocks and acceleration thresholds.", date: "June 09, 2026" },
          { label: "Practical Evaluation Sheet", completed: true, desc: "Simulated execution test graded: 98/100.", date: "June 10, 2026" },
          { label: "Certificate Issued", completed: true, desc: "Standard Trend Crushing accreditation complete.", date: "June 11, 2026" },
        ]
      };
    }

    // Default In-Progress / Newly Purchased course
    return {
      completedPercent: 25,
      status: 'enrolled',
      timeline: [
        { label: "Workshop Registration & API Credential Prep", completed: true, current: false, desc: "Initial credential setup validated under current trading account metrics." },
        { label: "Live Stream Block Room Entrance", completed: false, current: true, desc: "Next live transmission pending live schedule trigger." },
        { label: "Interactive Case Critique Seminar", completed: false, desc: "Peer-to-peer breakout code sharing and expert trade reviews." },
        { label: "Terminal Certification Test", completed: false, desc: "Take standard 20-question review to verify knowledge footprint." }
      ]
    };
  },

  // POST /purchase
  async purchaseItem(item: CartItem): Promise<{ success: boolean; message: string }> {
    await delay(800);
    
    // First, strictly check if the user has a TradingView ID (TVID)!
    const profile = getStoredProfile();
    if (!profile.tvid || profile.tvid.trim() === "") {
      throw new Error("TVID_REQUIRED");
    }

    const purchases = getStoredPurchases();
    if (item.type === 'course') {
      if (!purchases.courses.includes(item.id)) purchases.courses.push(item.id);
    } else if (item.type === 'indicator') {
      if (!purchases.indicators.includes(item.id)) purchases.indicators.push(item.id);
    } else if (item.type === 'bot') {
      if (!purchases.bots.includes(item.id)) purchases.bots.push(item.id);
    }

    savePurchases(purchases);

    // Save Expiration timestamp if indicator or bot
    if (item.type === 'indicator' || item.type === 'bot') {
      const expirations = getStoredExpirations();
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 30); // 30 days starting license
      expirations[item.id] = expDate.toISOString();
      saveExpirations(expirations);
    }

    // Save Transaction record
    const transactions = getStoredTransactions();
    const newTx = {
      id: `TX-${Math.floor(1001 + Math.random() * 8999)}-${Math.floor(10 + Math.random() * 89)}`,
      date: new Date().toISOString(),
      productUuid: item.id,
      productTitle: item.title,
      productImage: item.image || "https://picsum.photos/seed/default/600/400",
      type: "Purchase" as const,
      amount: item.price,
      status: "SUCCESSFUL" as const,
      tvid: profile.tvid
    };
    transactions.unshift(newTx);
    saveTransactions(transactions);

    return {
      success: true,
      message: `Successfully purchased ${item.title}. The operational script features have been synced directly to TVID account "${profile.tvid}".`
    };
  },

  // GET /lessons
  async getLessons(): Promise<Lesson[]> {
    await delay(150);
    return getStoredLessons();
  },

  // GET /transactions
  async getTransactions(): Promise<Transaction[]> {
    await delay(150);
    return getStoredTransactions();
  },

  // POST /transactions/save (for Discord renewals, etc.)
  async saveTransaction(tx: Transaction): Promise<Transaction> {
    await delay(300);
    const transactions = getStoredTransactions();
    transactions.unshift(tx);
    saveTransactions(transactions);
    return tx;
  },

  // GET /expirations
  async getExpirations(): Promise<Record<string, string>> {
    await delay(150);
    return getStoredExpirations();
  },

  // POST /renew
  async renewProduct(productUuid: string, price: number, durationDays: number): Promise<{ success: boolean; expiration: string }> {
    await delay(600);
    const profile = getStoredProfile();
    const expirations = getStoredExpirations();
    
    // Calculate new expiration
    const currentExp = expirations[productUuid];
    let baseDate = new Date();
    if (currentExp && new Date(currentExp) > new Date()) {
      baseDate = new Date(currentExp);
    }
    baseDate.setDate(baseDate.getDate() + durationDays);
    const newExpStr = baseDate.toISOString();
    expirations[productUuid] = newExpStr;
    saveExpirations(expirations);

    // Get catalog title and image to log transaction
    let title = "Item Renewal";
    let img = "https://picsum.photos/seed/renew/600/400";
    const course = MOCK_COURSES.find(c => c.uuid === productUuid);
    const indicator = MOCK_INDICATORS.find(i => i.uuid === productUuid);
    const bot = MOCK_BOTS.find(b => b.uuid === productUuid);
    if (course) { title = course.title; img = course.image; }
    else if (indicator) { title = indicator.title; img = indicator.image; }
    else if (bot) { title = bot.title; img = bot.image; }

    // Save transaction
    const transactions = getStoredTransactions();
    const newTx = {
      id: `TX-${Math.floor(1001 + Math.random() * 8999)}-${Math.floor(10 + Math.random() * 89)}`,
      date: new Date().toISOString(),
      productUuid: productUuid,
      productTitle: `${title} (Renewal)`,
      productImage: img,
      type: "Renewal" as const,
      amount: price,
      status: "SUCCESSFUL" as const,
      tvid: profile.tvid || "N/A"
    };
    transactions.unshift(newTx);
    saveTransactions(transactions);

    return {
      success: true,
      expiration: newExpStr
    };
  },

  // POST /admin/add-lesson
  async adminAddLesson(courseUuid: string, title: string, type: 'youtube' | 'zoom' | 'meet', link: string, startTime?: string): Promise<Lesson> {
    await delay(500);
    const lessons = getStoredLessons();
    const newLesson: Lesson = {
      id: `lesson-${Math.random().toString(36).substring(4)}`,
      courseUuid,
      title,
      type,
      link,
      addedAt: new Date().toISOString(),
      duration: type === 'youtube' ? "Recorded video" : "Live Stream",
      startTime
    };
    lessons.unshift(newLesson);
    saveLessons(lessons);
    return newLesson;
  }
};
export default API;
