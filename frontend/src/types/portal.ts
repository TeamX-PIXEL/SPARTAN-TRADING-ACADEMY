export type ProductType = 'course' | 'indicator' | 'bot';

export interface BaseProduct {
  uuid: string;
  title: string;
  description: string;
  longDescription: string;
  price: number;
  image: string;
  category: string;
  features: string[];
}

export interface Course extends BaseProduct {
  duration: string;
  lecturer: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  scheduled_at?: string; // ISO string for live startup
  estimated_duration?: number; // in minutes
}

export interface Indicator extends BaseProduct {
  scriptType: string; // e.g. "Pine Script (v5)", "MQL4"
  accuracy?: string; // e.g. "87.4%"
  timeframe?: string; // e.g. "5m, 1h, Daily"
}

export interface Bot extends BaseProduct {
  exchange: string; // e.g. "Binance", "Bybit"
  apy: string; // e.g. "142.5%"
  status?: "Running" | "Idle" | "Paused";
  apiKey?: string; // Shows when purchased
}

export type Product = Course | Indicator | Bot;

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  tvid: string; // TradingView ID, required for checkout validation!
  telegramid?: string; // Telegram ID
  discordid?: string; // Discord Username / ID
  firstname?: string;
  lastname?: string;
  username?: string;
  notificationsEnabled: boolean;
  marketingEmails: boolean;
  compactMode: boolean;
  themeColor: string;
}

export interface CartItem {
  id: string; // uuid
  title: string;
  price: number;
  image: string;
  type: ProductType;
}

export interface EnrollmentStep {
  label: string;
  completed: boolean;
  current?: boolean;
  date?: string;
  desc: string;
}

export interface EnrollmentStatus {
  completedPercent: number;
  status: 'enrolled' | 'completed' | 'not-started';
  timeline: EnrollmentStep[];
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export interface Lesson {
  id: string;
  courseUuid: string;
  title: string;
  type: 'youtube' | 'zoom' | 'meet';
  link: string;
  addedAt: string;
  duration?: string;
  startTime?: string;
}

export interface Transaction {
  id: string;
  date: string;
  productUuid: string;
  productTitle: string;
  productImage: string;
  type: 'Purchase' | 'Renewal' | 'Course Enrollment';
  amount: number;
  status: 'SUCCESSFUL' | 'PENDING';
  tvid: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'lesson' | 'alert' | 'system';
  createdAt: string;
  read: boolean;
  linkTo: string;
  courseUuid?: string;
}

