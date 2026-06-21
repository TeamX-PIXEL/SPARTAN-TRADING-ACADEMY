export type ProductType = 'course' | 'indicator' | 'bot';

export interface BaseProduct {
  id: string; // course_id / indicator_id / bot_id (string business key from backend)
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
  scheduled_at?: string;
  estimated_duration?: number;
}

export interface Indicator extends BaseProduct {
  scriptType: string;
  accuracy?: string;
  timeframe?: string;
}

export interface Bot extends BaseProduct {
  exchange: string;
  apy: string;
  status?: "Running" | "Idle" | "Paused";
  apiKey?: string;
}

export type Product = Course | Indicator | Bot;

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar: string;
  tvid: string;
  telegram_user_id?: string;
  telegram_chat_id?: string;
  discord_user_id?: string;
  discord_chat_id?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  phone_number?: string;
  notificationsEnabled: boolean;
  marketingEmails: boolean;
  compactMode: boolean;
  themeColor: string;
}

export interface CartItem {
  id: string;
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
  course_id: string;
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
  product_id: string;
  productTitle: string;
  productImage: string;
  type: 'Purchase' | 'Renewal' | 'Course Enrollment';
  amount: number;
  status: 'SUCCESSFUL' | 'PENDING';
  tvid: string;
  product_section: 'Course' | 'Indicator' | 'Bot';
  method?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'lesson' | 'alert' | 'system';
  createdAt: string;
  read: boolean;
  linkTo: string;
  course_id?: string;
}

