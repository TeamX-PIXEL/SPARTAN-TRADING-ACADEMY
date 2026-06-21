"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AppProvider } from "@/portal/AppContext";
import Sidebar from "@/components/portal/Sidebar";
import TopHeader from "@/components/portal/TopHeader";
import MobileNav from "@/components/portal/MobileNav";
import CartLibraryPanel from "@/components/portal/CartLibraryPanel";
import ProductDetailModal from "@/components/portal/ProductDetailModal";
import ToastSystem from "@/components/portal/ToastSystem";
import SearchResults from "@/components/portal/SearchResults";
import { PortalLightTheme } from "@/components/portal/PortalLightTheme";
import Lenis from "lenis";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("portal_sidebar_collapsed");
    if (saved === "true") setIsSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("portal_sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      duration: 1.2,
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const handleOpenProductDetail = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("product", id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCloseProductDetail = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("product");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const isDetailModalOpen = !!searchParams.get("product");

  return (
    <AppProvider>
      <PortalLightTheme />
      <div className="min-h-screen bg-[#07080a] text-white flex font-sans antialiased overflow-x-hidden">
        <ToastSystem />

        <Sidebar
          onOpenCart={() => setIsMobileCartOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />

        <div
          className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
            isSidebarCollapsed ? "md:pl-20" : "md:pl-[260px]"
          }`}
        >
          <TopHeader
            onOpenCart={() => setIsMobileCartOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <main className="flex-1 flex flex-col pb-16 md:pb-0 bg-[#07080a]">
            {searchQuery.trim() !== "" ? (
              <SearchResults
                query={searchQuery}
                onOpenProduct={handleOpenProductDetail}
              />
            ) : (
              children
            )}
          </main>
        </div>

        <CartLibraryPanel
          isOpen={isMobileCartOpen}
          onClose={() => setIsMobileCartOpen(false)}
          onOpenProduct={handleOpenProductDetail}
        />

        {isDetailModalOpen && (
          <ProductDetailModal onClose={handleCloseProductDetail} />
        )}

        <MobileNav onOpenCart={() => setIsMobileCartOpen(true)} />
      </div>
    </AppProvider>
  );
}
