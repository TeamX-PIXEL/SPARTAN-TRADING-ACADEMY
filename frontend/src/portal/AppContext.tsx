"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, CartItem, ToastMessage, Course, Indicator, Bot, ProductType, AppNotification } from "@/types/portal";
import { API, getStoredPurchases } from "./api";

interface AppContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  cart: CartItem[];
  purchasedIds: { courses: string[]; indicators: string[]; bots: string[] };
  library: { courses: Course[]; indicators: Indicator[]; bots: Bot[] };
  expirations: Record<string, string>;
  isLoadingUser: boolean;
  isLoadingLibrary: boolean;
  toasts: ToastMessage[];
  notifications: AppNotification[];
  theme: "dark" | "light" | "system";
  setTheme: (theme: "dark" | "light" | "system") => void;
  addToast: (text: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  checkout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  addNotification: (title: string, message: string, type: "lesson" | "alert" | "system", linkTo: string, courseUuid?: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAllNotificationsAsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<{ courses: string[]; indicators: string[]; bots: string[] }>({
    courses: [],
    indicators: [],
    bots: [],
  });
  const [library, setLibrary] = useState<{ courses: Course[]; indicators: Indicator[]; bots: Bot[] }>({
    courses: [],
    indicators: [],
    bots: [],
  });
  const [expirations, setExpirations] = useState<Record<string, string>>({});
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [theme, setThemeState] = useState<"dark" | "light" | "system">(() => {
    if (typeof window !== "undefined") {
      // Check admin's data-theme-mode first (set by ThemeBootScript/cookie)
      const adminMode = document.documentElement.getAttribute("data-theme-mode") as "dark" | "light" | "system" | null;
      if (adminMode && (adminMode === "dark" || adminMode === "light" || adminMode === "system")) {
        return adminMode;
      }
      return (localStorage.getItem("dealdeck_theme") as "dark" | "light" | "system") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (currentTheme: "dark" | "light" | "system") => {
      let isDark = true;
      if (currentTheme === "light") {
        isDark = false;
      } else if (currentTheme === "system") {
        isDark = !window.matchMedia("(prefers-color-scheme: light)").matches;
      }
      root.classList.remove("light", "dark");
      root.classList.add(isDark ? "dark" : "light");
      root.setAttribute("data-theme-mode", currentTheme);
      root.style.colorScheme = isDark ? "dark" : "light";
    };
    applyTheme(theme);

    // Re-apply after a delay to override admin PreferencesStoreProvider
    // which uses classList.toggle("dark") but never adds "light"
    const timer = setTimeout(() => applyTheme(theme), 0);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
      const listener = () => applyTheme("system");
      mediaQuery.addEventListener("change", listener);
      return () => {
        mediaQuery.removeEventListener("change", listener);
        clearTimeout(timer);
      };
    }
    return () => clearTimeout(timer);
  }, [theme]);

  const setTheme = (newTheme: "dark" | "light" | "system") => {
    setThemeState(newTheme);
    localStorage.setItem("dealdeck_theme", newTheme);

    // Sync with the admin theme system so they don't fight each other
    const root = document.documentElement;
    root.setAttribute("data-theme-mode", newTheme);
    document.cookie = `theme_mode=${newTheme};path=/;max-age=31536000`;
  };

  useEffect(() => {
    const stored = localStorage.getItem("dealdeck_notifications");
    if (stored) {
      setNotifications(JSON.parse(stored));
    } else {
      const initial: AppNotification[] = [
        {
          id: "n-1",
          title: "System Access Key Dynamic Link",
          message: "TradingView webhook portal is fully functional, secure terminal linked.",
          type: "system",
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          read: false,
          linkTo: "/portal/settings",
        },
        {
          id: "n-2",
          title: "Dynamic Liquidity Tracker Bot Alert",
          message: "Orderbook imbalances detected on High Frequency Bot cluster. Auto-signals synced.",
          type: "alert",
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          read: false,
          linkTo: "/portal/indicators",
        },
        {
          id: "n-3",
          title: "Masterclass: Order Block Theory",
          message: "New video added. Learn structural mitigation pools from indicator signals.",
          type: "lesson",
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          read: false,
          linkTo: "/portal/courses",
        },
      ];
      setNotifications(initial);
      localStorage.setItem("dealdeck_notifications", JSON.stringify(initial));
    }
  }, []);

  const addNotification = (title: string, message: string, type: "lesson" | "alert" | "system", linkTo: string, courseUuid?: string) => {
    const newNotif: AppNotification = {
      id: `n-${Math.random().toString(36).substring(7)}`,
      title,
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false,
      linkTo,
      courseUuid,
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      localStorage.setItem("dealdeck_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem("dealdeck_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      localStorage.setItem("dealdeck_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.setItem("dealdeck_notifications", JSON.stringify([]));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem("dealdeck_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingUser(true);
        const profile = await API.getProfile();
        setUser(profile);
        setIsLoggedIn(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchPurchasesAndLibrary = async () => {
      try {
        setIsLoadingLibrary(true);
        const ids = await API.getPurchasedIds();
        setPurchasedIds(ids);
        const libData = await API.getLibrary();
        setLibrary(libData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingLibrary(false);
      }
    };
    fetchPurchasesAndLibrary();
  }, []);

  useEffect(() => {
    const storedCart = localStorage.getItem("dealdeck_cart");
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dealdeck_cart", JSON.stringify(cart));
  }, [cart]);

  const addToast = (text: string, type: "success" | "error" | "info" = "info") => {
    const id = `t-${Math.random().toString(36).substring(7)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      if (prev.some((c) => c.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const refreshLibrary = async () => {
    try {
      setIsLoadingLibrary(true);
      const ids = await API.getPurchasedIds();
      setPurchasedIds(ids);
      const libData = await API.getLibrary();
      setLibrary(libData);
      const expData = await API.getExpirations();
      setExpirations(expData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const checkout = async () => {
    if (cart.length === 0) {
      addToast("Your checkout cart is empty.", "info");
      return;
    }
    try {
      addToast("Validating API credentials and processing purchase...", "info");
      for (const item of cart) {
        await API.purchaseItem(item);
      }
      clearCart();
      await refreshLibrary();
      addToast("Checkout successful! Scripts successfully synchronized to your TradingView account.", "success");
      window.location.href = "/portal/settings?success=purchase";
    } catch (err: any) {
      if (err.message === "TVID_REQUIRED") {
        addToast("TradingView ID represents a mandatory parameter. Please register yours in account settings first.", "error");
        window.location.href = "/portal/settings?error=tvid";
      } else {
        addToast(err.message || "Checkout failed.", "error");
      }
      throw err;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updated = await API.updateProfile(updates);
      setUser(updated);
      addToast("Profile details updated.", "success");
    } catch (err: any) {
      addToast(err.message || "Failed to update profile", "error");
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn,
        cart,
        purchasedIds,
        library,
        expirations,
        isLoadingUser,
        isLoadingLibrary,
        toasts,
        notifications,
        theme,
        setTheme,
        addToast,
        removeToast,
        addToCart,
        removeFromCart,
        clearCart,
        checkout,
        updateUserProfile,
        refreshLibrary,
        addNotification,
        markNotificationAsRead,
        clearNotification,
        clearAllNotifications,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
