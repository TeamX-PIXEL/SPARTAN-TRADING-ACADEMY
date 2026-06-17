"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp } from "@/portal/AppContext";
import { Search, Bell, ShoppingCart, LogOut, Shield, User, CreditCard, Trash2, CheckCircle2, X, AlertOctagon, Film, Info, Sun, Moon, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopHeaderProps {
  onOpenCart: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenCart, searchQuery, setSearchQuery }) => {
  const { 
    user, 
    cart, 
    notifications, 
    markNotificationAsRead, 
    clearNotification, 
    clearAllNotifications, 
    markAllNotificationsAsRead,
    theme,
    setTheme
  } = useApp();
  
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close menus if clicked outside
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    return () => document.removeEventListener('mousedown', clickHandler);
  }, []);

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Some time ago';
    }
  };

  const totalCartItems = cart.length;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-20 border-b border-[#1e222b] bg-[#0c0d0f]/80 backdrop-blur-md flex items-center justify-between px-6 md:px-8 sticky top-0 z-30 select-none">
      {/* Search Input Container */}
      <div className="flex-1 max-w-md relative mr-4 md:mr-0">
        <div
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-300 ${
            searchFocused
              ? 'bg-[#12151c] w-full border-blue-500 shadow-md shadow-blue-500/5'
              : 'bg-[#12151c]/40 w-[240px] md:w-[320px] border-[#1e222b]'
          }`}
        >
          <Search className={`w-4 h-4 ${searchFocused ? 'text-blue-400' : 'text-neutral-500'}`} />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Search classes, scripts, bots..."
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 outline-none border-none p-0 focus:ring-0 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-neutral-400 hover:text-white px-1"
            >
              Clear
            </button>
          )}
          {!searchFocused && !searchQuery && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#2d3139] bg-[#161a23] text-[9px] font-mono text-neutral-500">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Right utilities rail */}
      <div className="flex items-center gap-4">
        {/* Cart Trigger */}
        <button
          id="cart-trigger-button"
          type="button"
          onClick={onOpenCart}
          className="relative p-2.5 rounded-xl border border-[#1e222b] bg-[#12151c]/40 hover:bg-[#12151c] text-neutral-400 hover:text-white transition-all cursor-pointer group"
        >
          <ShoppingCart className="w-4 h-4 transition-transform group-hover:scale-110 duration-200" />
          {totalCartItems > 0 && (
            <span
              id="cart-badge-indicator"
              className="absolute -top-1 -right-1 bg-blue-600 text-[10px] text-white font-semibold font-mono w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#090a0f] transition-all duration-300 scale-100 bounce"
            >
              {totalCartItems}
            </span>
          )}
        </button>

        {/* Notifications Icon (Dropdown panel) */}
        <div className="relative" ref={notificationsRef}>
          <button
            id="notifications-trigger-button"
            type="button"
            onClick={() => setShowNotifications(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
              showNotifications 
                ? 'border-blue-500 bg-blue-600/10 text-white' 
                : 'border-[#1e222b] bg-[#12151c]/40 hover:bg-[#12151c] text-neutral-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-mono font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#090a0f]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              id="notifications-dropdown-menu"
              className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-xl border border-[#1e222b] bg-[#0c0d0f]/95 backdrop-blur-md shadow-2xl p-4.5 space-y-3 text-xs select-none z-50 text-neutral-200"
            >
              {/* Header inside popover */}
              <div className="flex items-center justify-between border-b border-[#1e222b] pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-neutral-300">
                    Live Alerts Log
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold">
                      {unreadCount} active
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllNotificationsAsRead();
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-0.5 hover:underline cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Read all</span>
                    </button>
                    <span className="text-neutral-700 font-mono">|</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllNotifications();
                      }}
                      className="text-[10px] text-neutral-500 hover:text-rose-400 transition-colors flex items-center gap-0.5 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Body item lists */}
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-0.5">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-neutral-500">
                    <div className="relative">
                      <Bell className="w-7 h-7 text-neutral-700" />
                      <div className="absolute inset-0 bg-neutral-500/5 rounded-full animate-ping" />
                    </div>
                    <div className="text-[11px] font-medium font-mono">Terminal Log Cleared</div>
                    <div className="text-[9px] text-neutral-600 max-w-[200px] leading-relaxed">
                      All system checkouts, alerts and video stream notifications are synchronized.
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    // Decide type specific layout
                    let IconComponent = Info;
                    let iconBg = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                    if (notif.type === 'lesson') {
                      IconComponent = Film;
                      iconBg = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    } else if (notif.type === 'alert') {
                      IconComponent = AlertOctagon;
                      iconBg = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                    }

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          setShowNotifications(false);
                          router.push(notif.linkTo);
                        }}
                        className={`flex gap-3 p-2.5 rounded-lg border transition-all cursor-pointer relative group text-left ${
                          notif.read
                            ? 'bg-[#12151c]/30 border-transparent hover:bg-[#12151c]/55 text-neutral-400 hover:text-neutral-200'
                            : 'bg-[#12151c] border-[#1e222b] hover:border-blue-500/30 text-neutral-200 hover:text-white shadow-sm'
                        }`}
                      >
                        {/* Type Icon */}
                        <div className={`p-2 rounded-lg shrink-0 w-8.5 h-8.5 flex items-center justify-center ${iconBg}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>

                        {/* Title and details */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center justify-between gap-1 mb-0.5 font-mono">
                            <h4 className={`text-xs font-semibold truncate ${
                              notif.read ? 'text-neutral-400' : 'text-neutral-200 group-hover:text-white'
                            }`}>
                              {notif.title}
                            </h4>
                            <span className="text-[9px] font-mono text-neutral-500 shrink-0">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>
                          <p className={`text-[10px] leading-relaxed truncate-2-lines select-none ${
                            notif.read ? 'text-neutral-500' : 'text-neutral-400 group-hover:text-neutral-300'
                          }`}>
                            {notif.message}
                          </p>
                        </div>

                        {/* Unread dot or trigger button details */}
                        <div className="absolute right-2 top-2.5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {!notif.read && (
                            <button
                              type="button"
                              title="Mark as read"
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notif.id);
                              }}
                              className="p-1 rounded bg-[#0c0d0f] border border-[#1e222b] hover:border-emerald-500/50 text-neutral-500 hover:text-emerald-400 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Dismiss Notification"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notif.id);
                            }}
                            className="p-1 rounded bg-[#0c0d0f] border border-[#1e222b] hover:border-rose-500/50 text-neutral-500 hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {!notif.read && (
                          <span className="absolute top-2.5 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full sm:group-hover:hidden" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer info message */}
              {notifications.length > 0 && (
                <div className="pt-2 border-t border-[#1e222b] text-[9px] text-neutral-600 font-mono flex items-center justify-between">
                  <span>SYSTEM FEED v1.42.0</span>
                  <span>TAP ALERT TO INTERACT</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme mode selection dropdown */}
        <div className="relative" ref={themeMenuRef}>
          <button
            id="theme-trigger-button"
            type="button"
            onClick={() => setShowThemeMenu(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex items-center justify-center ${
              showThemeMenu
                ? 'border-blue-500 bg-blue-600/10 text-white'
                : 'border-[#1e222b] bg-[#12151c]/40 hover:bg-[#12151c] text-neutral-400 hover:text-white'
            }`}
            title="Switch Theme"
          >
            {mounted ? (
              <>
                {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
                {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
                {theme === 'system' && <Monitor className="w-4 h-4 text-neutral-400" />}
              </>
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </button>

          {showThemeMenu && (
            <div
              id="theme-dropdown-menu"
              className="absolute right-0 mt-2.5 w-40 rounded-xl border border-[#1e222b] bg-[#0c0d0f]/95 backdrop-blur-md shadow-2xl p-1.5 space-y-1 text-xs select-none z-50 text-neutral-200"
            >
              {[
                { name: 'Light Mode', value: 'light', icon: Sun, color: 'text-amber-500' },
                { name: 'Dark Mode', value: 'dark', icon: Moon, color: 'text-blue-400' },
                { name: 'System Default', value: 'system', icon: Monitor, color: 'text-neutral-400' }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = theme === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setTheme(item.value as 'dark' | 'light' | 'system');
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#12151c] text-white font-bold border border-[#1e222b]'
                        : 'hover:bg-neutral-800/40 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span>{item.name}</span>
                    </div>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* User profile dropdown menu */}
        {user && (
          <div className="relative" ref={profileMenuRef}>
            <button
              id="profile-dropdown-trigger"
              type="button"
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-[#1e222b] bg-[#12151c]/40 hover:bg-[#12151c] transition-all cursor-pointer group"
            >
              <div
                className="w-7 h-7 rounded-lg bg-blue-700 font-bold text-white flex items-center justify-center text-xs group-hover:bg-blue-600 transition-colors shrink-0"
                id="header-initials-avatar"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors">
                  {user.firstname || user.name.split(' ')[0]} {user.lastname || ''}
                </p>
                <p className="text-[9px] font-mono font-medium text-neutral-500">
                  {user.username ? `@${user.username}` : (user.tvid ? `@${user.tvid}` : 'No TVID Key')}
                </p>
              </div>
            </button>

            {/* Float menu absolute details panel */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 w-56 rounded-xl border border-[#1e222b] bg-[#0c0d0f]/95 backdrop-blur-md shadow-2xl p-2.5 space-y-1 text-xs select-none">
                <div className="px-2 py-1.5 border-b border-[#1e222b] mb-1.5">
                  <p className="font-semibold text-neutral-200">{user.firstname} {user.lastname}</p>
                  <p className="text-[10px] text-neutral-500 font-mono overflow-hidden text-ellipsis">@{user.username}</p>
                </div>

                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); router.push('/portal/settings'); }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-neutral-800/40 text-neutral-300 hover:text-white transition-colors text-left"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Account Settings</span>
                </button>

                {/* Simulated logouts */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    // Just reset TVID to simulate a logged out or reset state
                    localStorage.removeItem('dealdeck_purchases');
                    localStorage.removeItem('dealdeck_cart');
                    window.location.reload();
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-rose-950/20 text-rose-400 hover:text-rose-350 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
export default TopHeader;
