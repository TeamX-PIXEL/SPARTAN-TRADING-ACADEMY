"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LineChart, Zap, Settings, ShoppingCart, Library, HelpCircle } from "lucide-react";
import { useApp } from "@/portal/AppContext";

export const MobileNav: React.FC<{ onOpenCart: () => void }> = ({ onOpenCart }) => {
  const { cart } = useApp();
  const pathname = usePathname();
  const currentPath = pathname;

  const navItems = [
    { path: "/portal/courses", label: "Courses", icon: BookOpen },
    { path: "/portal/indicators", label: "Scripts", icon: LineChart },
    { path: "/portal/alerts", label: "Bots", icon: Zap },
    { path: "/portal/library", label: "Library", icon: Library },
    { path: "/portal/support", label: "Support", icon: HelpCircle },
    { path: "/portal/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0c0d0f]/95 border-t border-[#1e222b] backdrop-blur-lg z-40 flex items-center justify-around px-4 select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.path === '/portal/settings' 
          ? currentPath.startsWith('/portal/settings') 
          : currentPath === item.path;

        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center gap-1 flex-1 text-center py-2 transition-colors duration-200 ${
              isActive ? "text-blue-400 font-semibold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Icon className="w-4.5 h-4.5" />
            <span className="text-[9px] uppercase tracking-wider">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenCart}
        className="flex flex-col items-center justify-center gap-1 flex-1 text-center py-2 text-neutral-500 relative cursor-pointer"
        id="mobile-nav-cart-trigger"
      >
        <div className="relative">
          <ShoppingCart className="w-4.5 h-4.5" />
          {cart.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-[8px] text-white font-mono w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#090a0f]">
              {cart.length}
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider">Cart</span>
      </button>
    </div>
  );
};

export default MobileNav;
