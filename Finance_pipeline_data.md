# Finance Pipeline — Data Requirements

---

## Current State

The finance page **synthesizes fake transactions** from aggregate data. No real payment table is used by the frontend.

| Source API | Fields Used | Finance Generates |
|---|---|---|
| `/api/admin/courses` | `price`, `purchased_count` | Fake course purchase rows |
| `/fetch/indicators` | `indicator_price`, `buyers` | Fake indicator purchase rows |
| `/api/admin/botusers` | expiry dates | Fake bot subscription rows |

**Problem:** All KPIs, charts, and payment history are fake data generated client-side.

---

## Target State

Frontend calls **3 real backend endpoints** that query the `transactions` table directly.

| # | Method | Path | Purpose | Response |
|---|---|---|---|---|
| 1 | GET | `/api/admin/transactions` | Payment history table | Transaction[] (with user + product names) |
| 2 | GET | `/api/admin/transactions/summary` | KPI cards + Revenue by Section | Summary with this/last month + by_section + topItems |
| 3 | GET | `/api/admin/transactions/monthly-revenue` | Monthly bar chart (stacked) | MonthlyRevenuePoint[] (12 months, broken down by section) |

---

## Backend Endpoints — Detailed Specs

### Endpoint 1: `GET /api/admin/transactions`

**Purpose:** Return all transactions with resolved user names and product titles for the payment history table.

**Existing in:** `backend/app/routers/purchases.py` (line 59)

**Current Response Shape:**
```json
[
  {
    "id": 1,
    "username": "john_doe",
    "product_section": "Course",
    "course_id": "CRS001",
    "indicator_id": null,
    "bot_id": null,
    "expiry": "2026-12-31T00:00:00",
    "amount": 999.0,
    "method": "Card",
    "status": "completed",
    "created_at": "2026-01-15T10:30:00",
    "user_email": "john@example.com",
    "user_firstname": "John",
    "user_lastname": "Doe"
  }
]
```

**Gap — Missing fields for frontend:**
| Frontend Field | Source | Status |
|---|---|---|
| `id` | `String(txn.id)` | ✅ Present |
| `date` | `txn.created_at` | ✅ Present |
| `section` | Map `product_section` → `"academy"` / `"indicators"` / `"bot_alerts"` | ⚠️ Needs mapping |
| `customer` | `user_firstname + " " + user_lastname` or `username` | ⚠️ Needs join (already done) |
| `item` | Product title from Course/Indicator/Bot table | ❌ Missing |
| `amount` | `txn.amount` | ✅ Present |
| `status` | `txn.status` | ✅ Present |
| `method` | `txn.method` | ✅ Present |

**Changes Needed:**
1. Join with Course/Indicator/Bot tables to get product `title`
2. Add `item_name` field to response
3. Add `section` field with mapped value (`"Course"` → `"academy"`)

---

### Endpoint 2: `GET /api/admin/transactions/summary`

**Purpose:** Return KPI stats and revenue-by-section breakdown for the 4 KPI cards + Revenue by Section panel.

**Existing in:** `backend/app/routers/purchases.py` (line 94)

**Current Response Shape:**
```json
{
  "total_revenue": 15000.0,
  "total_transactions": 45,
  "this_month_revenue": 2500.0,
  "this_month_transactions": 8,
  "by_section": [
    {"section": "Course", "revenue": 1200.0, "count": 5},
    {"section": "Indicator", "revenue": 800.0, "count": 2},
    {"section": "Bot", "revenue": 500.0, "count": 1}
  ]
}
```

**Gap — Missing fields for frontend:**
| Frontend KPI | Source | Status |
|---|---|---|
| `thisMonthRevenue` | `this_month_revenue` | ✅ Present |
| `thisMonthTransactions` | `this_month_transactions` | ✅ Present |
| `lastMonthRevenue` | Need last month SUM(amount) | ❌ Missing |
| `lastMonthTransactions` | Need last month COUNT(*) | ❌ Missing |
| `averageTransactionValue` | `this_month_revenue / this_month_transactions` | ⚠️ Can compute |
| `monthOverMonthChange` | `((this - last) / last) * 100` | ⚠️ Can compute |
| `by_section[].revenue` | Present | ✅ |
| `by_section[].count` | Present | ✅ |
| `by_section[].topItem` | Product title with highest revenue | ❌ Missing |

**Changes Needed:**
1. Add `last_month_revenue` and `last_month_transactions` to response
2. Add `top_item` to each `by_section` entry (query the product with highest sum(amount) per section)

---

### Endpoint 3: `GET /api/admin/transactions/monthly-revenue`

**Purpose:** Return 12-month revenue breakdown, broken down by section, for the stacked bar chart.

**Existing in:** `backend/app/routers/purchases.py` (line 139)

**Current Response Shape:**
```json
[
  {"year": 2026, "month": 1, "revenue": 2500.0, "count": 8},
  {"year": 2026, "month": 2, "revenue": 3200.0, "count": 12}
]
```

**Gap — Missing fields for frontend:**
| Frontend Field | Source | Status |
|---|---|---|
| `monthKey` | `"2026-01"` | ⚠️ Can compute |
| `monthLabel` | `"Jan 26"` | ⚠️ Can compute |
| `academy` | SUM(amount) WHERE section=Course AND month=1 | ❌ Missing (no section breakdown) |
| `indicators` | SUM(amount) WHERE section=Indicator AND month=1 | ❌ Missing |
| `bot_alerts` | SUM(amount) WHERE section=Bot AND month=1 | ❌ Missing |
| `total` | SUM(amount) per month | ✅ Present as `revenue` |

**Changes Needed:**
1. Group by `product_section` in addition to year/month
2. Return per-section revenue per month
3. Always return 12 months (fill missing months with 0)

---

## Frontend Component Data Flow

### Page Component (`finance/page.tsx`)

**Current (fake):**
```
fetchCourses() + fetchIndicators() + fetchBotUsers()
  → buildPayments()        // synthesizes fake Payment[]
  → buildKpis()            // derives KPIs from fake data
  → buildMonthlyRevenue()  // derives chart from fake data
  → buildSectionRevenue()  // derives section totals from fake data
```

**Target (real):**
```
GET /api/admin/transactions/summary       → summary
GET /api/admin/transactions/monthly-revenue → monthlyRevenue
GET /api/admin/transactions               → transactions
```

### KPI Cards

| Card | Prop | Source |
|---|---|---|
| `ThisMonthRevenue` | `amount` | `summary.this_month_revenue` |
| | `transactionCount` | `summary.this_month_transactions` |
| | `monthOverMonthChange` | `((this - last) / last) * 100` |
| `LastMonthRevenue` | `amount` | `summary.last_month_revenue` |
| `TransactionsKpi` | `thisMonth` | `summary.this_month_transactions` |
| | `lastMonth` | `summary.last_month_transactions` |
| `AvgTransactionKpi` | `amount` | `this_month_revenue / this_month_transactions` |
| | `totalTransactions` | `summary.this_month_transactions` |

### Monthly Revenue Chart

| Prop | Source |
|---|---|
| `data` | `monthlyRevenue.map(m => ({ monthKey, monthLabel, academy, indicators, bot_alerts, total }))` |

### Revenue by Section

| Prop | Source |
|---|---|
| `sections` | `summary.by_section.map(s => ({ section, label, revenue, transactionCount, topItem }))` |
| `totalRevenue` | `summary.total_revenue` (or sum of section revenues) |

### Payment History Table

| Prop | Source |
|---|---|
| `data` | `transactions.map(t => ({ id, date, section, customer, item, amount, status, method }))` |

---

## Data Shape Mappings

### `product_section` → frontend `section`
| Backend Value | Frontend Value | Label |
|---|---|---|
| `"Course"` | `"academy"` | `"Academy"` |
| `"Indicator"` | `"indicators"` | `"Indicators"` |
| `"Bot"` | `"bot_alerts"` | `"Bot Alerts"` |

### `customer` name resolution
```
if (user_firstname || user_lastname):
  customer = `${user_firstname || ""} ${user_lastname || ""}`.trim()
else:
  customer = username
```

### `item` name resolution
```
if (product_section == "Course" && course_id):
  item = Course.title where Course.course_id == course_id
elif (product_section == "Indicator" && indicator_id):
  item = Indicator.title where Indicator.indicator_id == indicator_id
elif (product_section == "Bot" && bot_id):
  item = Bot.title where Bot.bot_id == bot_id
```

### `method` enum
Backend: `String(50)` — free text
Frontend: `"Card" | "Crypto" | "Bank Transfer" | "UPI" | "Free" | "Other"`

**Note:** Current frontend schema uses `"Telegram"` instead of `"UPI"`. Must update to match admin form which uses: Card, UPI, Bank Transfer, Crypto, Free, Other.

---

## Transaction Creation (Already Working)

Every member enrolment already creates a transaction:

| Endpoint | Creates | Section Value |
|---|---|---|
| `POST /api/admin/courses/{id}/members` | Transaction + CourseMember | `"Course"` |
| `POST /api/admin/indicators/{id}/members` | Transaction + IndicatorMember | `"Indicator"` |
| `POST /api/admin/bots/{id}/members` | Transaction + BotMember | `"Bot"` |

All 3 endpoints accept `amount` and `method` in the request body.

---

## Finance Page Layout

```
┌─────────────────────────────────────────────┐
│  KPI Cards (4)                              │
│  [This Month Revenue] [Last Month Revenue]  │
│  [Transactions] [Avg Transaction]           │
├─────────────────────────────────────────────┤
│  Monthly Revenue Bar Chart (12 months)      │
│  Stacked: Academy / Indicators / Bots       │
├─────────────────────────────────────────────┤
│  Revenue by Section                         │
│  [Academy] [Indicators] [Bot Alerts]        │
├─────────────────────────────────────────────┤
│  Payment History Table (paginated)          │
│  Columns: Date, Section, Customer, Item,    │
│           Method, Amount, Status            │
└─────────────────────────────────────────────┘
```

---

## Stat Card Computations

| Card | Formula |
|---|---|
| This Month Revenue | `SUM(amount) WHERE created_at >= startOfMonth(NOW()) AND status != "refunded"` |
| Last Month Revenue | `SUM(amount) WHERE created_at >= startOfMonth(NOW()-1) AND created_at < startOfMonth(NOW()) AND status != "refunded"` |
| Transactions | `COUNT(*) WHERE created_at >= startOfMonth(NOW()) AND status != "refunded"` |
| Avg Transaction | `This Month Revenue / Transactions` |
| MoM Change | `((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100` |

---

## Changes Required

### Backend (`purchases.py`)

1. **`GET /api/admin/transactions`** — Add joins to Course/Indicator/Bot for `item_name`; add mapped `section` field
2. **`GET /api/admin/transactions/summary`** — Add `last_month_revenue`, `last_month_transactions`; add `top_item` to `by_section`
3. **`GET /api/admin/transactions/monthly-revenue`** — Group by `product_section`; return per-section breakdown; always 12 months

### Frontend (`finance/page.tsx`)

1. Remove all `derive-payments.ts` imports and `buildPayments`/`buildKpis`/`buildMonthlyRevenue`/`buildSectionRevenue` calls
2. Fetch from 3 real backend endpoints
3. Map backend response shapes to component props
4. Update `Payment` interface: add `section` mapping, `item` from product title
5. Update `paymentSchema`: change `"Telegram"` → `"UPI" | "Free"` in method enum
6. Remove `derive-payments.ts` file (no longer needed)
7. Remove 8 orphan components (savings-rate, primary-account, net-worth, monthly-cash-flow, card-overview, cash-flow-overview, income-reliability, spending-breakdown)
