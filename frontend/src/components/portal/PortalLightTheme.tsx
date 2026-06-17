"use client";

export function PortalLightTheme() {
  return (
    <style
      id="portal-light-overrides"
      dangerouslySetInnerHTML={{
        __html: `
html[data-theme-mode="light"] body,
html[data-theme-mode="light"] main,
html[data-theme-mode="light"] .bg-\\[\\#07080a\\],
html[data-theme-mode="light"] .bg-neutral-950,
html[data-theme-mode="light"] .bg-\\[rgba\\(7\\,8\\,10\\,0\\.8\\)\\] {
  background-color: #f8fafc !important;
  color: #1e293b !important;
}

/* Sidebar and Header glassmorphism navigation panels */
html[data-theme-mode="light"] aside,
html[data-theme-mode="light"] header,
html[data-theme-mode="light"] nav,
html[data-theme-mode="light"] .bg-\\[\\#0c0d0f\\]\\/80,
html[data-theme-mode="light"] .bg-\\[\\#0c0d0f\\]\\/95,
html[data-theme-mode="light"] .bg-black\\/40 {
  background-color: rgba(255, 255, 255, 0.92) !important;
  border-color: #e2e8f0 !important;
}

/* Cards, inner containers, feed lists & panels */
html[data-theme-mode="light"] .bg-\\[\\#0c0d10\\],
html[data-theme-mode="light"] .bg-\\[\\#0c0d10\\]\\/50,
html[data-theme-mode="light"] .bg-\\[\\#12151c\\],
html[data-theme-mode="light"] .bg-\\[\\#12151c\\]\\/90,
html[data-theme-mode="light"] .bg-\\[\\#12151c\\]\\/50,
html[data-theme-mode="light"] .bg-\\[\\#12151c\\]\\/30,
html[data-theme-mode="light"] .bg-\\[\\#12151c\\]\\/40,
html[data-theme-mode="light"] .bg-\\[\\#12151c\\]\\/60,
html[data-theme-mode="light"] .bg-\\[\\#131720\\],
html[data-theme-mode="light"] .bg-neutral-900,
html[data-theme-mode="light"] .bg-neutral-900\\/50,
html[data-theme-mode="light"] .bg-neutral-800\\/20,
html[data-theme-mode="light"] .bg-\\[\\#090b0e\\],
html[data-theme-mode="light"] .bg-\\[\\#0a0c10\\],
html[data-theme-mode="light"] .bg-\\[\\#0c0d0f\\],
html[data-theme-mode="light"] .bg-\\[\\#0c0d0f\\]\\/50,
html[data-theme-mode="light"] .bg-\\[\\#07080a\\]\\/50 {
  background-color: #ffffff !important;
  border-color: #e2e8f0 !important;
}

/* Hover effects */
html[data-theme-mode="light"] .hover\\:bg-\\[\\#12151c\\]\\/30:hover,
html[data-theme-mode="light"] .hover\\:bg-\\[\\#12151c\\]\\/90:hover,
html[data-theme-mode="light"] .hover\\:bg-\\[\\#12151c\\]:hover,
html[data-theme-mode="light"] .hover\\:bg-\\[\\#1e222b\\]:hover,
html[data-theme-mode="light"] .hover\\:bg-\\[\\#181d26\\]:hover,
html[data-theme-mode="light"] .hover\\:bg-neutral-800\\/40:hover,
html[data-theme-mode="light"] .hover\\:bg-neutral-900:hover,
html[data-theme-mode="light"] .hover\\:bg-\\[\\#1e222b\\]\\/30:hover {
  background-color: #f1f5f9 !important;
}

/* Specific soft background alerts and labels */
html[data-theme-mode="light"] .bg-\\[\\#12151c\\]\\/10,
html[data-theme-mode="light"] .bg-neutral-900\\/40,
html[data-theme-mode="light"] .bg-neutral-950\\/40 {
  background-color: #f1f5f9 !important;
}

/* Form triggers, search bars, textareas, controls & selects */
html[data-theme-mode="light"] input,
html[data-theme-mode="light"] select,
html[data-theme-mode="light"] textarea,
html[data-theme-mode="light"] .bg-\\[\\#161a24\\],
html[data-theme-mode="light"] .bg-neutral-950\\/20,
html[data-theme-mode="light"] .bg-\\[\\#161a20\\],
html[data-theme-mode="light"] [type='text'],
html[data-theme-mode="light"] [type='search'],
html[data-theme-mode="light"] [type='number'],
html[data-theme-mode="light"] [type='datetime-local'],
html[data-theme-mode="light"] [type='email'],
html[data-theme-mode="light"] [type='password'],
html[data-theme-mode="light"] select option {
  background-color: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
}

/* Inputs, textareas, select focus effects */
html[data-theme-mode="light"] input:focus,
html[data-theme-mode="light"] select:focus,
html[data-theme-mode="light"] textarea:focus {
  border-color: #3b82f6 !important;
  outline: 2px solid transparent !important;
}

html[data-theme-mode="light"] input::placeholder,
html[data-theme-mode="light"] textarea::placeholder {
  color: #94a3b8 !important;
}

html[data-theme-mode="light"] select option {
  background-color: #ffffff !important;
  color: #0f172a !important;
}

/* Target modal overlays & drop menus */
html[data-theme-mode="light"] #notifications-dropdown-menu,
html[data-theme-mode="light"] #notifications-dropdown-menu *,
html[data-theme-mode="light"] #theme-dropdown-menu,
html[data-theme-mode="light"] #theme-dropdown-menu *,
html[data-theme-mode="light"] #profile-dropdown-menu,
html[data-theme-mode="light"] #profile-dropdown-menu * {
  border-color: #e2e8f0 !important;
}

html[data-theme-mode="light"] #notifications-dropdown-menu,
html[data-theme-mode="light"] #theme-dropdown-menu,
html[data-theme-mode="light"] #profile-dropdown-menu {
  background-color: rgba(255, 255, 255, 0.98) !important;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.06) !important;
}

/* Text elements map to high-contrast slate colors */
html[data-theme-mode="light"] .text-white,
html[data-theme-mode="light"] .text-neutral-100 {
  color: #0f172a !important;
}

html[data-theme-mode="light"] .text-neutral-200 {
  color: #1e293b !important;
}

html[data-theme-mode="light"] .text-neutral-300,
html[data-theme-mode="light"] .text-neutral-400 {
  color: #334155 !important;
}

html[data-theme-mode="light"] .text-neutral-500,
html[data-theme-mode="light"] .text-\\[\\#4e5a70\\],
html[data-theme-mode="light"] .text-neutral-600 {
  color: #64748b !important;
}

html[data-theme-mode="light"] .text-neutral-700 {
  color: #475569 !important;
}

/* Keep warning or special alert texts prominent on light mode */
html[data-theme-mode="light"] .text-blue-400,
html[data-theme-mode="light"] .text-blue-500 {
  color: #1d4ed8 !important;
}

html[data-theme-mode="light"] .text-emerald-400,
html[data-theme-mode="light"] .text-emerald-500 {
  color: #047857 !important;
}

html[data-theme-mode="light"] .text-amber-400,
html[data-theme-mode="light"] .text-amber-500 {
  color: #b45309 !important;
}

/* Borders and visual dividers styling */
html[data-theme-mode="light"] .border-\\[\\#1e222b\\],
html[data-theme-mode="light"] .border-\\[\\#1e222b\\]\\/40,
html[data-theme-mode="light"] .border-\\[\\#1e222b\\]\\/50,
html[data-theme-mode="light"] .border-neutral-800,
html[data-theme-mode="light"] .border-\\[\\#131720\\],
html[data-theme-mode="light"] .border-neutral-800\\/60,
html[data-theme-mode="light"] .border-neutral-700,
html[data-theme-mode="light"] .border-white\\/5,
html[data-theme-mode="light"] .border-white\\/10 {
  border-color: #cbd5e1 !important;
}

/* Modals overlays & blurs */
html[data-theme-mode="light"] .bg-black\\/60,
html[data-theme-mode="light"] .bg-black\\/80,
html[data-theme-mode="light"] .bg-\\[\\#07080a\\]\\/80 {
  background-color: rgba(255, 255, 255, 0.12) !important;
  backdrop-filter: blur(8px) !important;
}

html[data-theme-mode="light"] #billing-pagination-controls {
  background-color: #ffffff !important;
  border-color: #cbd5e1 !important;
}

/* Profile terminal status card background */
html[data-theme-mode="light"] .bg-neutral-900\\/60 {
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}

/* Sidebar collapse toggle TAB badge */
html[data-theme-mode="light"] .bg-\\[\\#1c202a\\]\\/80 {
  background-color: #e2e8f0 !important;
  color: #334155 !important;
  border: 1px solid #cbd5e1 !important;
}

/* Header search query kbd command key badge */
html[data-theme-mode="light"] .bg-\\[\\#161a23\\] {
  background-color: #f1f5f9 !important;
}
html[data-theme-mode="light"] .border-\\[\\#2d3139\\] {
  border-color: #cbd5e1 !important;
}

/* Settings page disabled readonly inputs */
html[data-theme-mode="light"] input:disabled {
  background-color: #f1f5f9 !important;
  color: #64748b !important;
  border-color: #e2e8f0 !important;
  cursor: not-allowed !important;
}

/* Library page lessons expanded container */
html[data-theme-mode="light"] .bg-\\[\\#090b0e\\] {
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}

/* Library page administrative panel widget */
html[data-theme-mode="light"] .bg-\\[\\#12110c\\] {
  background-color: #fffbeb !important;
  border-color: #fcd34d !important;
}
html[data-theme-mode="light"] .text-\\[\\#e0a96d\\] {
  color: #92400e !important;
}

/* Light mode overrides for product cards */
html[data-theme-mode="light"] .bg-neutral-800 {
  background-color: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
  color: #475569 !important;
}
html[data-theme-mode="light"] .hover\\:bg-neutral-700:hover {
  background-color: #e2e8f0 !important;
  color: #0f172a !important;
}

html[data-theme-mode="light"] .bg-neutral-900\\/90 {
  background-color: rgba(255, 255, 255, 0.95) !important;
  color: #0f172a !important;
  border-color: #cbd5e1 !important;
}

html[data-theme-mode="light"] .absolute.top-4.left-4.bg-black\\/75 {
  background-color: rgba(255, 255, 255, 0.95) !important;
  color: #475569 !important;
  border-color: #cbd5e1 !important;
}

html[data-theme-mode="light"] .bg-gradient-to-t.from-\\[\\#0c0d0f\\],
html[data-theme-mode="light"] .from-\\[\\#0c0d0f\\] {
  background-image: linear-gradient(to top, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%) !important;
}

/* Profile Identity Card Avatar in Light Mode */
html[data-theme-mode="light"] .bg-gradient-to-br.from-blue-700.to-indigo-950 {
  background-image: linear-gradient(to bottom right, #3b82f6, #6366f1) !important;
  color: #ffffff !important;
  border-color: rgba(59, 130, 246, 0.25) !important;
}

html[data-theme-mode="light"] .bg-blue-950 {
  background-color: #eff6ff !important;
  color: #1d4ed8 !important;
  border-color: #bfdbfe !important;
}

html[data-theme-mode="light"] .bg-indigo-950 {
  background-color: #f5f3ff !important;
  color: #6d28d9 !important;
  border-color: #ddd6fe !important;
}

html[data-theme-mode="light"] .bg-emerald-950,
html[data-theme-mode="light"] [class*="bg-emerald-950"] {
  background-color: rgba(209, 250, 229, 0.95) !important;
  color: #065f46 !important;
  border-color: #a7f3d0 !important;
}

html[data-theme-mode="light"] .text-blue-400 {
  color: #1d4ed8 !important;
}

html[data-theme-mode="light"] .text-indigo-400 {
  color: #6d28d9 !important;
}

html[data-theme-mode="light"] .text-emerald-400 {
  color: #047857 !important;
}

html[data-theme-mode="light"] .border-blue-500\\/20 {
  border-color: #bfdbfe !important;
}
html[data-theme-mode="light"] .border-indigo-500\\/20 {
  border-color: #ddd6fe !important;
}
html[data-theme-mode="light"] .border-indigo-500\\/15,
html[data-theme-mode="light"] .border-indigo-500\\/10 {
  border-color: #e0d4fc !important;
}
html[data-theme-mode="light"] .border-indigo-500\\/30 {
  border-color: #c4b5fd !important;
}

html[data-theme-mode="light"] .bg-indigo-950\\/25,
html[data-theme-mode="light"] .bg-indigo-950\\/15,
html[data-theme-mode="light"] .bg-indigo-950\\/40 {
  background-color: #ede9fe !important;
}
html[data-theme-mode="light"] .bg-indigo-900\\/45 {
  background-color: #ddd6fe !important;
  border-color: #c4b5fd !important;
}
html[data-theme-mode="light"] .bg-indigo-900\\/60 {
  background-color: #ddd6fe !important;
}
html[data-theme-mode="light"] .border-emerald-500\\/20 {
  border-color: #a7f3d0 !important;
}

html[data-theme-mode="light"] .bg-blue-900\\/60,
html[data-theme-mode="light"] .bg-emerald-900\\/60 {
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}

html[data-theme-mode="light"] .bg-neutral-950\\/20 {
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
  color: #475569 !important;
}

html[data-theme-mode="light"] .border-neutral-800\\/60 {
  border-color: #cbd5e1 !important;
}

/* Header profile avatar, initials, and dropdown button */
html[data-theme-mode="light"] #profile-dropdown-trigger {
  background-color: #ffffff !important;
  border-color: #cbd5e1 !important;
}
html[data-theme-mode="light"] #profile-dropdown-trigger:hover {
  background-color: #f1f5f9 !important;
}
html[data-theme-mode="light"] #header-initials-avatar {
  background-color: #2563eb !important;
  color: #ffffff !important;
}

/* In-cart and disabled purchase indicator buttons */
html[data-theme-mode="light"] .bg-\\[\\#1a1e27\\] {
  background-color: #ecfdf5 !important;
  color: #059669 !important;
  border-color: #a7f3d0 !important;
}
html[data-theme-mode="light"] .bg-\\[\\#1a1e27\\]:hover {
  background-color: #d1fae5 !important;
}
html[data-theme-mode="light"] .bg-\\[\\#12151c\\].text-neutral-400 {
  background-color: #f1f5f9 !important;
  color: #475569 !important;
  border-color: #cbd5e1 !important;
}

/* Details Popup container background, headers, and persistent bottom FAB bars */
html[data-theme-mode="light"] .bg-\\[\\#0c0d0f\\] {
  background-color: #ffffff !important;
  border-color: #cbd5e1 !important;
}
html[data-theme-mode="light"] .bg-\\[\\#0c0d0f\\]\\/50 {
  background-color: #f8fafc !important;
  border-color: #cbd5e1 !important;
}
html[data-theme-mode="light"] .bg-\\[\\#090b0e\\] {
  background-color: #f8fafc !important;
  border-color: #cbd5e1 !important;
}

/* Library page card image overlap labels and badges */
html[data-theme-mode="light"] .absolute.top-3.left-3.bg-\\[\\#07080a\\]\\/90 {
  background-color: rgba(255, 255, 255, 0.95) !important;
  color: #334155 !important;
  border: 1px solid #cbd5e1 !important;
  backdrop-filter: blur(4px) !important;
}

html[data-theme-mode="light"] .absolute.top-2\\.5.right-2\\.5.bg-blue-900\\/90 {
  background-color: rgba(219, 234, 254, 0.95) !important;
  color: #1e40af !important;
  border: 1px solid #bfdbfe !important;
  font-weight: 700 !important;
}

/* History Active Gateway label coloring & contrast boost */
html[data-theme-mode="light"] .text-white\\/90 {
  color: #1e293b !important;
}

/* Embedded High-Fidelity Razorpay Gateway Light Mode Support */
html[data-theme-mode="light"] .bg-\\[\\#0b0c10\\] {
  background-color: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  color: #0f172a !important;
}
html[data-theme-mode="light"] .bg-\\[\\#0c0d12\\] {
  background-color: #f8fafc !important;
  border-right: 1px solid #cbd5e1 !important;
  border-bottom: 1px solid #cbd5e1 !important;
}
html[data-theme-mode="light"] .bg-\\[\\#090a0d\\] {
  background-color: #ffffff !important;
}
html[data-theme-mode="light"] .bg-\\[\\#0a0c10\\] {
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}
html[data-theme-mode="light"] .border-white\\/5 {
  border-color: #cbd5e1 !important;
}
html[data-theme-mode="light"] .bg-white\\/2 {
  background-color: #f1f5f9 !important;
  border-color: #cbd5e1 !important;
}
html[data-theme-mode="light"] .bg-white\\/2:hover {
  background-color: #e2e8f0 !important;
}
html[data-theme-mode="light"] .bg-\\[\\#11131a\\] {
  background-color: #f8fafc !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
}
html[data-theme-mode="light"] input.bg-\\[\\#11131a\\],
html[data-theme-mode="light"] select.bg-\\[\\#11131a\\] {
  background-color: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
}
html[data-theme-mode="light"] input.bg-\\[\\#11131a\\]::placeholder {
  color: #94a3b8 !important;
}
html[data-theme-mode="light"] .bg-\\[\\#07080a\\] {
  background-color: #ffffff !important;
  color: #0f172a !important;
}

/* Product Card light mode overrides */
html[data-theme-mode="light"] [id^="product-card-"] {
  background-color: #ffffff !important;
  border-color: #e2e8f0 !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
}
html[data-theme-mode="light"] [id^="product-card-"]:hover {
  background-color: #f8fafc !important;
  border-color: #93c5fd !important;
  box-shadow: 0 8px 25px rgba(59,130,246,0.08) !important;
}
html[data-theme-mode="light"] [id^="product-card-"] img {
  opacity: 0.9 !important;
}
html[data-theme-mode="light"] [id^="product-card-"]:hover img {
  opacity: 1 !important;
}

/* Header button light mode overrides */
html[data-theme-mode="light"] #global-search-input {
  color: #0f172a !important;
}
html[data-theme-mode="light"] #global-search-input::placeholder {
  color: #94a3b8 !important;
}

/* Library tab count badges */
html[data-theme-mode="light"] .bg-blue-900\\/40 {
  background-color: rgba(219, 234, 254, 0.9) !important;
}
html[data-theme-mode="light"] .text-blue-300 {
  color: #1d4ed8 !important;
}
html[data-theme-mode="light"] .border-blue-500\\/20 {
  border-color: #bfdbfe !important;
}

/* Scrollbar light mode */
html[data-theme-mode="light"] .split-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
}
html[data-theme-mode="light"] .split-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}
html[data-theme-mode="light"] .split-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
        `,
      }}
    />
  );
}
