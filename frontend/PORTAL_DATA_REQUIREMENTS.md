# Client Portal — Data Requirements (Page by Page)

> Every data field the UI reads, where it appears, and its source. This document is used to compare against the database/admin and identify what's missing or needs creating.

**Last verified:** 2026-06-16 — against actual component source code.

---

## Portal Routes

| Route | Component | File |
|-------|-----------|------|
| `/portal` | Redirect → `/portal/courses` | `src/app/portal/page.tsx` |
| `/portal/courses` | `CoursesPage` | `src/app/portal/courses/page.tsx` |
| `/portal/indicators` | `IndicatorsPage` | `src/app/portal/indicators/page.tsx` |
| `/portal/alerts` | `AlertsPage` (Bots) | `src/app/portal/alerts/page.tsx` |
| `/portal/library` | `LibraryPage` | `src/app/portal/library/page.tsx` |
| `/portal/history` | `HistoryPage` | `src/app/portal/history/page.tsx` |
| `/portal/settings` | `SettingsPage` | `src/app/portal/settings/page.tsx` |

---

## Shared Data Model

### `UserProfile` (from `src/types/portal.ts`)

| Field | Type | Used In |
|-------|------|---------|
| `name` | `string` | Header initials avatar fallback, Settings locked field |
| `email` | `string` | Settings locked field, History transaction card (course category) |
| `avatar` | `string` | (Unused currently — initials avatar used instead) |
| `tvid` | `string` | Header username fallback, Settings editable+locked, Cart checkout validation, History (indicator category), Discord renewal modal, Identity Card |
| `telegramid` | `string?` | Settings editable+locked, History (bot category), Identity Card |
| `discordid` | `string?` | Settings editable+locked, Identity Card |
| `firstname` | `string?` | Header button+dropdown, Identity Card |
| `lastname` | `string?` | Header button+dropdown, Identity Card |
| `username` | `string?` | Header button+dropdown, Identity Card |
| `notificationsEnabled` | `boolean` | (Not rendered in UI currently) |
| `marketingEmails` | `boolean` | (Not rendered in UI currently) |
| `compactMode` | `boolean` | (Not rendered in UI currently) |
| `themeColor` | `string` | (Not rendered in UI currently) |

### `Course` (extends `BaseProduct`)

| Field | Type | Used In |
|-------|------|---------|
| `uuid` | `string` | Card key, detail modal lookup, cart ID, library key, Discord days key, lessons filter |
| `title` | `string` | Card title, modal heading, library card, notification text |
| `description` | `string` | Card description (2-line clamp), library card |
| `longDescription` | `string` | Modal full description paragraph |
| `price` | `number` | Card price, modal bottom bar, cart, renewal pricing |
| `image` | `string` | Card thumbnail, modal hero, library card, transaction card |
| `category` | `string` | Card badge overlay, modal blue badge, library tag overlay |
| `features` | `string[]` | Card first 2 tags, modal first 4 inclusions (`.slice(0,4)`), each has "1 Year Free Discord Support" as last item |
| `duration` | `string` | Modal "Duration" widget, library card "Duration:" label |
| `lecturer` | `string` | Modal "Lecturer / Lead" widget, library card "Instructor:" label |
| `difficulty` | `"Beginner" \| "Intermediate" \| "Advanced"` | Modal "Difficulty Level" widget (blue), library card difficulty badge |
| `scheduled_at` | `string?` (ISO) | Card countdown badge (top-right), modal "Start Date & Time" widget, library "Started On:" / countdown component |
| `estimated_duration` | `number?` (minutes) | Card countdown timer calculation (`startTime + estimated_duration * 60000`) |

### `Indicator` (extends `BaseProduct`)

| Field | Type | Used In |
|-------|------|---------|
| `uuid` | `string` | Card key, detail modal, cart ID, library key, expiration key |
| `title` | `string` | Card title, modal heading, library card |
| `description` | `string` | Card description, library card |
| `longDescription` | `string` | Modal full description |
| `price` | `number` | Card price, modal bottom bar, cart, renewal pricing |
| `image` | `string` | Card thumbnail, modal hero, library card |
| `category` | `string` | Card badge, modal badge |
| `features` | `string[]` | Card first 2 tags, modal first 4 inclusions |
| `scriptType` | `string` | Card modal badge (green), modal "Script Target" widget, library card badge overlay |
| `accuracy` | `string?` | Card top-right "Accuracy: X%" badge, library card "Calculated Accuracy" |
| `timeframe` | `string?` | Modal "Recommended Bar" widget, library card "Timeframes" |

### `Bot` (extends `BaseProduct`)

| Field | Type | Used In |
|-------|------|---------|
| `uuid` | `string` | Card key, detail modal, cart ID, library key, expiration key |
| `title` | `string` | Card title, modal heading, library card |
| `description` | `string` | Card description, library card |
| `longDescription` | `string` | Modal full description |
| `price` | `number` | Card price, modal bottom bar, cart, renewal pricing |
| `image` | `string` | Card thumbnail, modal hero, library card |
| `category` | `string` | Card badge, modal badge |
| `features` | `string[]` | Card first 2 tags, modal first 4 inclusions |
| `exchange` | `string` | Card modal "API Bound: {exchange}" badge, modal "Target Exchange" widget, library card badge "API Bound: {exchange}" |
| `apy` | `string` | Card top-right "{apy} APY" badge, modal "Historical Return APY" widget, library card bottom-left APY badge |
| `status` | `"Running" \| "Idle" \| "Paused"?` | Modal "Operation Status" widget (no modal currently — used in library "Operation Status") |
| `apiKey` | `string?` | (Not rendered in UI currently) |

---

## 1. Header (TopHeader)

**File:** `src/components/portal/TopHeader.tsx`

### Profile Button (left of dropdown)

| # | Field | Source | UI |
|---|-------|--------|-----|
| 1 | `user.name` | `API.getProfile()` | Avatar initial: `user.name.charAt(0).toUpperCase()` |
| 2 | `user.firstname` | Same | Button text: `{user.firstname \|\| user.name.split(' ')[0]} {user.lastname \|\| ''}` |
| 3 | `user.lastname` | Same | Button text (combined with firstname) |
| 4 | `user.username` | Same | Subtitle: `@{user.username}` or fallback `@{user.tvid}` or `'No TVID Key'` |
| 5 | `user.tvid` | Same | Fallback for subtitle when username is empty |

### Profile Dropdown Panel

| # | Field | Source | UI |
|---|-------|--------|-----|
| 6 | `user.firstname` | Same | Header: `{user.firstname} {user.lastname}` |
| 7 | `user.lastname` | Same | Header (combined) |
| 8 | `user.username` | Same | Sub-header: `@{user.username}` |

### Cart Icon

| # | Field | Source | UI |
|---|-------|--------|-----|
| 9 | `cart.length` | `localStorage("dealdeck_cart")` | Blue badge on cart icon |

### Notifications Bell

| # | Field | Source | UI |
|---|-------|--------|-----|
| 10 | `notifications[].id` | `localStorage("dealdeck_notifications")` | Card key |
| 11 | `notifications[].type` | Same | Icon: `'lesson'`=Film, `'alert'`=AlertOctagon, `'system'`=Info |
| 12 | `notifications[].title` | Same | Card title |
| 13 | `notifications[].message` | Same | Card body |
| 14 | `notifications[].createdAt` | Same | Relative time ("5m ago") |
| 15 | `notifications[].read` | Same | Opacity/unread dot |
| 16 | `notifications[].linkTo` | Same | Navigation on click |
| 17 | `unreadCount` | Derived: `filter(!read).length` | Green badge; "{N} active" |

### Theme Toggle

| # | Field | Source | UI |
|---|-------|--------|-----|
| 18 | `theme` | `localStorage("dealdeck_theme")` / `data-theme-mode` attr | Sun/Moon/Monitor icon; dropdown highlight |

### Search Input

| # | Field | Source | UI |
|---|-------|--------|-----|
| 19 | `searchQuery` | Layout state (props) | Search input value; triggers `API.searchCatalog()` |

---

## 2. Courses Page

**File:** `src/app/portal/courses/page.tsx`

### Page Header (static)

| Element | Value |
|---------|-------|
| Section title | "MASTER ARCHIVE" |
| Heading | "Advanced Live Masterclasses" |
| Description | "Acquire mathematical trading keys..." |
| Counter | "Active Streams Today: 1 Scheduled" |

### Data per ProductCard (uses shared `ProductCard` component)

| # | Field | Source | UI |
|---|-------|--------|-----|
| 1 | `course.uuid` | `API.getCourses()` | Card key, detail modal, cart item ID |
| 2 | `course.image` | Same | Card thumbnail |
| 3 | `course.title` | Same | Card title |
| 4 | `course.description` | Same | Card description (2-line clamp) |
| 5 | `course.price` | Same | Card price |
| 6 | `course.category` | Same | Badge overlay (top-left) |
| 7 | `course.features` | Same | First 2 as tags below description |
| 8 | `course.scheduled_at` | Same | Countdown badge (top-right); "Live Now!" / "Starts in Xd Xh Xm Xs" / "Recording Available" |
| 9 | `course.estimated_duration` | Same | Used in countdown: `startTime + estimated_duration * 60000` to compute end time |
| 10 | `course.features[4]` | Same | "Includes 1 Year Discord Support" tag (indigo, courses only) |
| 11 | `purchasedIds.courses` | Context | `purchased` prop → "Activated inside Portal" badge vs price button |

### Infinite Scroll / Pagination

| Field | Type | Purpose |
|-------|------|---------|
| `skip` | `number` | Current offset (starts 0, increments by 2) |
| `hasMore` | `boolean` | End-of-list message |
| `isLoading` | `boolean` | Initial skeleton loading |
| `isLoadingMore` | `boolean` | Spinner during fetch |
| `limit` | `number` | Fixed at 2 per batch |

### Course Filter Logic (in `API.getCourses()`)

```
scheduled_at > now + 5 minutes
```
Courses hidden until 5 minutes before their start time.

---

## 3. Indicators Page

**File:** `src/app/portal/indicators/page.tsx`

### Page Header (static)

| Element | Value |
|---------|-------|
| Section title | "INDICATOR MODULES" |
| Heading | "Institutional Technical indicators" |
| Description | "Plug direct dark pool feeds..." |
| Counter | "Active Licenses: Pine Script v5 Synced" |

### Data per ProductCard

Same as courses but type=`"indicator"`. Additional fields on card:

| # | Field | UI |
|---|-------|-----|
| 1 | `indicator.scriptType` | Modal badge (green) on card |
| 2 | `indicator.accuracy` | Top-right "Accuracy: 84.2%" badge |
| 3 | `indicator.features` | First 2 tags |

Pagination identical to courses (`skip`, `hasMore`, `limit=2`).

---

## 4. Alerts/Bots Page

**File:** `src/app/portal/alerts/page.tsx` (NOT `bots/`)

### Page Header (static)

| Element | Value |
|---------|-------|
| Section title | "AUTOMATED ALERTS & BOTS" |
| Heading | "High-Frequency Automated Bots" |
| Description | "Spin up remote server-side grid models..." |
| Counter | "Remote Servers Status: ALL ONLINE" |

### Data per ProductCard

Same as courses but type=`"bot"`. Additional fields on card:

| # | Field | UI |
|---|-------|-----|
| 1 | `bot.exchange` | Modal badge "API Bound: Binance" |
| 2 | `bot.apy` | Top-right "{apy} APY" badge |
| 3 | `bot.features` | First 2 tags |

Pagination identical (`skip`, `hasMore`, `limit=2`).

---

## 5. Product Detail Modal

**File:** `src/components/portal/ProductDetailModal.tsx`
**Trigger:** URL search param `?product={uuid}` on any catalog page

### Header

| Element | Value |
|---------|-------|
| Label | "Terminal Node Detail — {productType} profile" |

### Hero Section (all types)

| # | Field | UI |
|---|-------|-----|
| 1 | `product.image` | Hero image (2/5 width) |
| 2 | `product.category` | Blue badge next to title |
| 3 | `product.title` | Modal heading |
| 4 | `product.longDescription` | Full description paragraph |
| 5 | `indicator.scriptType` | Green badge (indicators only) |

### Course-Specific Widgets

| # | Field | UI |
|---|-------|-----|
| 6 | `course.lecturer` | "Lecturer / Lead" widget |
| 7 | `course.duration` | "Duration" widget |
| 8 | `course.difficulty` | "Difficulty Level" widget (blue text) |
| 9 | `course.scheduled_at` | "Start Date & Time" widget |
| 10 | Discord banner | "Direct Discord Support Portal" — static banner, always shown for courses |

### Indicator-Specific Widgets

| # | Field | UI |
|---|-------|-----|
| 11 | `indicator.scriptType` | "Script Target" widget (Terminal icon) |
| 12 | `indicator.timeframe` | "Recommended Bar" widget (Cpu icon) |

### Bot-Specific Widgets

| # | Field | UI |
|---|-------|-----|
| 13 | `bot.exchange` | "Target Exchange" widget (Globe icon) |
| 14 | `bot.apy` | "Historical Return APY" widget (Sparkles icon) |

### Inclusions Section (all types)

| # | Field | UI |
|---|-------|-----|
| 15 | `product.features.slice(0, 4)` | "Inclusions & Functionality Items" — max 4 items, 2-col grid |

### Bottom Bar

| # | Field | UI |
|---|-------|-----|
| 16 | `product.price` | "ONE TIME FEE ${price}" (or "Licensed Access Secured" if purchased) |
| 17 | `isPurchased` | Controls purchase button vs licensed badge |

---

## 6. My Library Page

**File:** `src/app/portal/library/page.tsx`

### Tab Counts

| Tab | Count Source |
|-----|-------------|
| All Items | `library.courses.length + library.indicators.length + library.bots.length` |
| My Courses | `library.courses.length` |
| My Indicators | `library.indicators.length` |
| My Bots | `library.bots.length` |

### 6a. Course Library Card

| # | Field | UI |
|---|-------|-----|
| 1 | `course.image` | Card thumbnail (left column) |
| 2 | `course.category` | Tag overlay on image |
| 3 | `course.lecturer` | "Instructor: {lecturer}" |
| 4 | `course.difficulty` | Color-coded difficulty badge |
| 5 | `course.title` | Card heading |
| 6 | `course.description` | Card description |
| 7 | `course.scheduled_at` | Determines "COURSE STARTED & ACTIVE" vs "NOT STARTED YET"; passes to `<CourseCountdown>` |
| 8 | `course.duration` | "Duration: {duration}" |
| 9 | `courseLessons.length` | "{N} Operational Lecture Links Published!" |
| 10 | `discordSupportDaysLeft[course.uuid]` | Discord badge: "{N} Days Left" (default 365) |
| 11 | `user.tvid` | Discord renewal modal: "Your TradingView ID [{tvid}]..." |

### Discord Support Block (per course card)

| # | Field | Source | UI |
|---|-------|--------|-----|
| 12 | `discordSupportDaysLeft[course.uuid]` | `localStorage("dealdeck_discord_days")` | Badge: "{N} Days Left" |
| 13 | `discord.gg/dealdeck` | Static link | "Join Discord" button |
| 14 | `setRenewingDiscordCourse(course)` | State | "Extend +1 Yr" button opens renewal modal |

### Discord Renewal Modal

| # | Field | UI |
|---|-------|-----|
| 15 | `renewingDiscordCourse.title` | Modal heading context |
| 16 | `user.tvid` | Info box: "Your TradingView ID [{tvid}]..." |
| 17 | Price: `$49` | Fixed price for 1-year extension |
| 18 | Transaction logged | `type: 'Renewal'`, `productTitle: "{title} (Discord 1-Yr Support Renewal)"` |

### Course Lessons (expandable per course)

| # | Field | UI |
|---|-------|-----|
| 19 | `lesson.id` | Lesson row key |
| 20 | `lesson.courseUuid` | Links to parent course |
| 21 | `lesson.title` | Lesson title |
| 22 | `lesson.type` | `'youtube'`→"YouTube Video" badge + rose CTA; `'zoom'`→"Live Zoom Stream" badge + blue CTA; `'meet'`→"Google Meet Room" badge + teal CTA |
| 23 | `lesson.link` | "Stream Recorded Video" / "Enter Live Zoom Webinar" / "Join Google Meet Session" button href |
| 24 | `lesson.addedAt` | "Published: {date}" / "Created: {date}" |
| 25 | `lesson.duration` | Duration label (right of badge) |
| 26 | `lesson.startTime` | "Meeting Start Time" widget (zoom/meet only) |

### 6b. Indicator Library Card

| # | Field | UI |
|---|-------|-----|
| 27 | `ind.image` | Card thumbnail |
| 28 | `ind.scriptType` | Badge overlay (top-right of image) |
| 29 | `ind.title` | Card title |
| 30 | `ind.description` | Card description |
| 31 | `ind.timeframe` | "Timeframes:" detail |
| 32 | `ind.accuracy` | "Calculated Accuracy:" detail |
| 33 | `expirations[ind.uuid]` | License expiry status + days remaining |
| 34 | Renewal button | "Renew Script Subscription" → opens renewal modal |

### 6c. Bot Library Card

| # | Field | UI |
|---|-------|-----|
| 35 | `bot.image` | Card thumbnail |
| 36 | `bot.exchange` | Badge "API Bound: {exchange}" |
| 37 | `bot.apy` | Bottom-left "{apy} APY" badge |
| 38 | `bot.title` | Card title |
| 39 | `bot.description` | Card description |
| 40 | `bot.status` | "Operation Status:" detail (green if Running) |
| 41 | `expirations[bot.uuid]` | License expiry + days remaining |
| 42 | Renewal button | "Renew Bot License" → opens renewal modal |

### License Renewal Modal (indicators & bots)

| # | Field | UI |
|---|-------|-----|
| 43 | `renewingProduct.title` | Modal heading context |
| 44 | Duration options | "30 Days Boost" = $29, "1 Year Standard" = $199 |
| 45 | `selectedDuration` | Determines price: 1 month=$29, 12 months=$199 |

### Admin Console (collapsible)

| # | Field | UI |
|---|-------|-----|
| 46 | `selectedCourseForAdmin` | Select dropdown (courses from library) |
| 47 | `adminLessonTitle` | Text input |
| 48 | `adminLessonType` | `'youtube'` / `'zoom'` / `'meet'` |
| 49 | `adminLessonLink` | URL input |
| 50 | `adminMeetingStartTime` | `datetime-local` input (zoom/meet only) |

---

## 7. Payment History Page

**File:** `src/app/portal/history/page.tsx`

### Stat Cards (3 cards)

| # | Field | UI |
|---|-------|-----|
| 1 | `totalSpent` | "Total Account Outlay" — `${totalSpent} USD` |
| 2 | `transactions.length` | "Logged Orders" — `{N} receipts` + "100% SUCCESS RATE" |
| 3 | Static | "Active Gateway" — "Razorpay Secure Terminal" + "PCI-DSS Compliant" |

### Transaction Card

| # | Field | Source | UI |
|---|-------|--------|-----|
| 4 | `tx.id` | `API.getTransactions()` | `#{tx.id}` transaction ID |
| 5 | `tx.productTitle` | Same | Product name heading |
| 6 | `tx.productImage` | Same | Card thumbnail |
| 7 | `tx.type` | Same | Type badge: `'Renewal'`→indigo, else→blue |
| 8 | `tx.amount` | Same | "Amount Charged" — `${tx.amount} USD` |
| 9 | `tx.date` | Same | Date/time display |
| 10 | `tx.status` | Same | Status badge: green "SUCCESSFUL" |
| 11 | Category (derived) | `getTransactionCategory(tx)` | Determines which ID field to show |

### Category-Based ID Display (per transaction)

| Category | Field Shown | Source |
|----------|-------------|--------|
| Indicator | `tx.tvid` | From transaction record |
| Bot | `user.telegramid` | From user profile; fallback "Not Configured" |
| Course | `user.email` | From user profile; fallback "Not Configured" |

### Category Derivation Logic

```
uuid starts with 'course' → courses
uuid starts with 'indicator' → indicators
uuid starts with 'bot' → bots
Fallback: check MOCK_COURSES/MOCK_INDICATORS/MOCK_BOTS arrays by uuid
Fallback: check productTitle for keywords ('blueprint', 'class', 'course', 'bot', 'indicator', 'script')
Default: courses
```

### Filter Tabs

| Tab | Category | Count Source |
|-----|----------|--------------|
| All | `all` | `transactions.length` |
| Courses | `courses` | Filtered count |
| Indicators | `indicators` | Filtered count |
| Bots | `bots` | Filtered count |

### Pagination

| Field | Type | Purpose |
|-------|------|---------|
| `currentPage` | `number` | Starts at 1 |
| `itemsPerPage` | `number` | Fixed at 4 |
| `totalPages` | `number` | `ceil(totalItems / itemsPerPage)` |

---

## 8. Settings Page

**File:** `src/app/portal/settings/page.tsx`

### Security Profile Details — Locked Fields

| # | Field | Source | UI | Behavior |
|---|-------|--------|-----|----------|
| 1 | `name` | `user.name` | "Full Name" input | Always disabled, lock icon |
| 2 | `email` | `user.email` | "Secured Email" input | Always disabled, lock icon |
| 3 | `mobileNumber` | Hardcoded `"+1 (555) 0168-912"` | "Mobile Number" input | Always disabled, lock icon |

### Security Profile Details — Editable Fields

| # | Field | Source | UI | Lock Behavior |
|---|-------|--------|-----|---------------|
| 4 | `tvid` | `user.tvid` | "TradingView ID (TVID)" input | Disabled+lock if `user.tvid` exists; editable if empty |
| 5 | `telegramid` | `user.telegramid` | "Telegram Username / ID" input | Disabled+lock if `user.telegramid` exists; editable if empty |
| 6 | `discordid` | `user.discordid` | "Discord Username / ID" input | Disabled+lock if `user.discordid` exists; editable if empty |

### Password Form

| # | Field | UI |
|---|-------|-----|
| 7 | `currentPass` | "Current Master Password" input (password type) |
| 8 | `newPass` | "New Password Key" input (password type) |
| 9 | `confirmPass` | "Confirm New Password" input (password type) |
| 10 | `showCurrentPass` | Eye toggle on current password |
| 11 | `showNewPass` | Eye toggle on new password |
| 12 | `showConfirmPass` | Eye toggle on confirm password |

Validation: All 3 required; `newPass === confirmPass`; min 6 chars.

### Identity Card (right sidebar)

| # | Field | Source | UI |
|---|-------|--------|-----|
| 13 | `name` / `user.name` | State / profile | Avatar initial: `(name \|\| user.name \|\| "M").charAt(0).toUpperCase()` |
| 14 | `firstname` / `user.firstname` | State / profile | Name heading: `{firstname \|\| user.firstname} {lastname \|\| user.lastname}` |
| 15 | `lastname` / `user.lastname` | State / profile | Name heading (combined) |
| 16 | `username` / `user.username` | State / profile | Display name: `@{username \|\| user.username}` |
| 17 | Terminal Status | Static | "ONLINE" (green) |
| 18 | `tvid` / `user.tvid` | State / profile | "Database TVID: @{tvid}" or "NOT REGISTERED" |
| 19 | `telegramid` | State / profile | "Telegram Contact: @{telegramid}" or "NOT BOUND" |
| 20 | `discordid` / `user.discordid` | State / profile | "Discord ID: @{discordid}" or "NOT BOUND" |

### Save Profile Action

Saves: `{ tvid, telegramid, discordid }` only (firstname/lastname/username are read-only display).

---

## 9. Cart (CartLibraryPanel)

**File:** `src/components/portal/CartLibraryPanel.tsx`

| # | Field | Source | UI |
|---|-------|--------|-----|
| 1 | `cart[].id` | `localStorage("dealdeck_cart")` | Item key, remove target |
| 2 | `cart[].title` | Same | Item name |
| 3 | `cart[].price` | Same | Item price + total |
| 4 | `cart[].image` | Same | Item thumbnail |
| 5 | `cart[].type` | Same | Uppercase type label |
| 6 | `cart.length` | Derived | "Cart ({N})" header |
| 7 | Subtotal | `cart.reduce(sum, price)` | Total price |
| 8 | Platform fee | Static "FREE" | Label |
| 9 | `user.tvid` | Context | Checkout validation — blocks if empty, redirects to `?error=tvid` |

---

## 10. Search Results (SearchResults)

**File:** `src/components/portal/SearchResults.tsx`

| # | Field | Source | UI |
|---|-------|--------|-----|
| 1 | `query` | Props (from header search) | "Catalog results for "{query}"" heading |
| 2 | `courses[]` | `API.searchCatalog(query)` | Course section cards |
| 3 | `indicators[]` | Same | Indicator section cards |
| 4 | `bots[]` | Same | Bot section cards |
| 5 | Section counts | `arr.length` | "Courses ({N})", "Indicators ({N})", "Bots ({N})" |
| 6 | `purchasedIds` | Context | `purchased` prop per card |

Search filter: matches against `title`, `description`, `category`. Courses additionally filtered by `scheduled_at > now + 5 min`.

---

## 11. Notification Dropdown (in Header)

Same as Header section notifications (items 10-17).

---

## Summary: All Data Sources

### From User Profile (`API.getProfile()`)

| Field | Used By |
|-------|---------|
| `name` | Header avatar initial, Settings locked field, Identity Card |
| `email` | Settings locked field, History (course transactions) |
| `avatar` | (Unused — initials used instead) |
| `tvid` | Header fallback, Settings editable+locked, Cart validation, History (indicator tx), Discord renewal, Identity Card |
| `telegramid` | Settings editable+locked, History (bot tx), Identity Card |
| `discordid` | Settings editable+locked, Identity Card |
| `firstname` | Header button+dropdown, Identity Card |
| `lastname` | Header button+dropdown, Identity Card |
| `username` | Header button+dropdown, Identity Card |

### From Products Catalog

| Source | Used By |
|--------|---------|
| `API.getCourses()` | Courses page, Search |
| `API.getIndicators()` | Indicators page, Search |
| `API.getBots()` | Alerts/Bots page, Search |
| `API.searchCatalog()` | Search Results |

### From Purchases/Library

| Source | Used By |
|--------|---------|
| `API.getPurchasedIds()` | All catalog pages (`purchased` prop) |
| `API.getLibrary()` | Library page |
| `API.getLessons()` | Library page (course expand) |
| `API.getExpirations()` | Library page (indicator/bot expiry) |
| `API.getTransactions()` | History page, Library page |

### From LocalStorage (non-API)

| Key | Type | Used By |
|-----|------|---------|
| `dealdeck_cart` | `CartItem[]` | Cart, Header badge, Checkout |
| `dealdeck_notifications` | `AppNotification[]` | Header bell |
| `dealdeck_theme` | `"dark" \| "light" \| "system"` | Header theme toggle, AppContext |
| `dealdeck_discord_days` | `Record<string, number>` | Library Discord days per course |
| `dealdeck_user_profile` | `UserProfile` | getStoredProfile() |

---

## Summary: API Endpoints Needed

| Endpoint | Method | Returns | Used By |
|----------|--------|---------|---------|
| `GET /users/me` | Profile | `UserProfile` | Header, Settings, History, Library |
| `PUT /users/me` | Update | `UserProfile` | Settings (tvid, telegramid, discordid) |
| `PUT /users/me/password` | Password | `{ success, message }` | Settings |
| `GET /public/courses` | List | `{ items, hasMore }` | Courses page |
| `GET /public/indicators` | List | `{ items, hasMore }` | Indicators page |
| `GET /public/bots` | List | `{ items, hasMore }` | Alerts/Bots page |
| `GET /search?q=` | Search | `{ courses, indicators, bots }` | Search Results |
| `GET /my-purchases` | Purchase IDs | `{ courses, indicators, bots }` | All catalog pages |
| `GET /my-library` | Library | `{ courses, indicators, bots }` | My Library |
| `GET /lessons` | Lessons | `Lesson[]` | Library (course expand) |
| `GET /transactions` | Transactions | `Transaction[]` | History, Library |
| `POST /transactions/save` | Save Tx | `Transaction` | Library (Discord renewal) |
| `GET /expirations` | Expirations | `Record<uuid, date>` | Library (expiry badges) |
| `POST /purchase` | Purchase | `{ success, message }` | Cart checkout |
| `POST /renew` | Renew | `{ success, expiration }` | Library renewal buttons |
| `POST /admin/add-lesson` | Add Lesson | `Lesson` | Library admin console |
