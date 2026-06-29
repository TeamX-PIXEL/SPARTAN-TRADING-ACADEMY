"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LineChart, Zap, Settings, Library, ChevronLeft, ChevronRight, CreditCard, HelpCircle } from "lucide-react";

interface SidebarProps {
  onOpenCart?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCart, isCollapsed, onToggleCollapse }) => {
  const pathname = usePathname();
  const currentPath = pathname;

  const navItems = [
    { path: "/portal/courses", label: "Courses Masterclass", icon: BookOpen },
    { path: "/portal/indicators", label: "Indicators & Scripts", icon: LineChart },
    { path: "/portal/alerts", label: "Automated Bots", icon: Zap },
    { path: "/portal/library", label: "My Library", icon: Library },
    { path: "/portal/history", label: "Payment History", icon: CreditCard },
    { path: "/portal/support", label: "Support", icon: HelpCircle },
    { path: "/portal/settings", label: "Portal Settings", icon: Settings },
  ];

  const activeIndex = navItems.findIndex((item) => {
    return currentPath.startsWith(item.path);
  });

  return (
    <aside
      className={`bg-[#0c0d0f]/95 border-r border-[#1e222b] flex-col h-screen fixed top-0 left-0 z-40 hidden md:flex font-sans select-none shadow-xl transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-[260px]"
      }`}
    >
      <div
        className={`h-20 flex items-center border-b border-[#1e222b] overflow-hidden transition-all duration-300 ${
          isCollapsed ? "px-0 justify-center" : "px-6"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <span className="text-white font-mono font-black text-sm tracking-tighter">DD</span>
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
              <h1 className="text-white font-sans text-sm font-bold tracking-[0.2em] uppercase leading-none">
                DealDeck
              </h1>
              <span className="font-mono text-[9px] text-[#4e5a70] tracking-widest uppercase mt-1 block">
                Client Terminal
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex-1 py-8 relative flex flex-col justify-between transition-all duration-300 ${
          isCollapsed ? "px-2.5" : "px-4"
        }`}
      >
        <div className="space-y-1 relative">
          {activeIndex !== -1 && (
            <div
              className="absolute left-0 right-0 h-11 bg-gradient-to-r from-blue-900/40 to-blue-500/5 border-l-2 border-blue-500 rounded-r-lg transition-all duration-300 ease-out pointer-events-none"
              style={{ top: `${activeIndex * 48}px` }}
            />
          )}

          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;

            return (
              <Link
                key={item.path}
                id={`sidebar-nav-${item.path.replace('/portal/', '')}`}
                href={item.path}
                className={`relative h-11 flex items-center px-4 rounded-lg text-[13px] font-medium tracking-wide transition-colors duration-200 group overflow-hidden ${
                  isCollapsed ? "justify-center px-0" : "gap-3.5"
                } ${isActive ? "text-blue-400 font-semibold" : "text-neutral-400 hover:text-white"}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 shrink-0 ${
                    isActive ? "text-blue-400" : "text-neutral-400 group-hover:text-white"
                  }`}
                />
                {!isCollapsed && (
                  <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap text-left truncate">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="pt-4 mt-auto">
          {isCollapsed ? (
            <button
              type="button"
              id="sidebar-expand-button"
              onClick={onToggleCollapse}
              className="mx-auto w-11 h-11 flex items-center justify-center rounded-xl border border-[#1e222b] bg-[#12151c]/40 hover:bg-[#12151c] hover:border-blue-500/40 text-neutral-400 hover:text-white transition-all cursor-pointer group"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          ) : (
            <button
              type="button"
              id="sidebar-collapse-button"
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-[#1e222b] bg-[#12151c]/40 hover:bg-[#12151c] hover:border-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer font-mono group"
              title="Collapse Sidebar"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ChevronLeft className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 group-hover:-translate-x-0.5 transition-transform duration-200 shrink-0" />
                <span className="text-[11px] uppercase tracking-wider text-left truncate text-neutral-400 group-hover:text-neutral-200 font-medium">
                  Minimize Panel
                </span>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1c202a]/80 text-[#4e5a70] group-hover:text-neutral-400 font-mono shrink-0">
                TAB
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
