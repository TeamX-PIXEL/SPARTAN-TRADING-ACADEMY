import {
  Banknote,
  Bot,
  BarChart3,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: LayoutDashboard,
      },
      {
        title: "Academy",
        url: "/dashboard/academy",
        icon: GraduationCap,
      },
      {
        title: "Indicators",
        url: "/dashboard/indicators",
        icon: BarChart3,
      },
      {
        title: "Alert Bots",
        url: "/dashboard/botalerts",
        icon: Bot,
      },
      {
        title: "Clients Manage",
        url: "/dashboard/clients",
        icon: Users,
      },
      {
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
