# Finance Pipeline — Data Requirements

---

## Current State

The finance page synthesizes fake transactions from aggregate data. No real payment table exists.

| Source API | Fields Used | Finance Generates |
|---|---|---|
| `/api/admin/courses` | `price`, `purchased_count` | Fake course purchase rows |
| `/fetch/indicators` | `indicator_price`, `buyers` | Fake indicator purchase rows |
| `/api/admin/botusers` | expiry dates | Fake bot subscription rows |

---

## SQL Table

### `transactions` (12 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `section` | ENUM | academy / indicators / bot_alerts |
| `customer_name` | VARCHAR(255) | Display name from user |
| `item_name` | VARCHAR(255) | Course/indicator/bot title |
| `amount` | DECIMAL(12,2) | INR — product price if paid, 0 if free |
| `status` | ENUM | completed / pending / refunded |
| `method` | ENUM | Card / Crypto / Bank Transfer / UPI / Free / Other |
| `course_id` | INT nullable FK→courses | Set when section=academy |
| `indicator_id` | INT nullable FK→indicators | Set when section=indicators |
| `bot_id` | INT nullable FK→bots | Set when section=bot_alerts |
| `user_id` | INT nullable FK→users | The enrolled user |
| `created_at` | TIMESTAMP | When payment was recorded |

---

## API Endpoints (3 total)

| # | Method | Path | Description | Response |
|---|---|---|---|---|
| 1 | GET | `/api/finance/transactions` | List all transactions | `{ items: Transaction[], total: number }` |
| 2 | GET | `/api/finance/summary` | KPI stats | `{ thisMonthRevenue, lastMonthRevenue, thisMonthTransactions, lastMonthTransactions, avgTransaction }` |
| 3 | GET | `/api/finance/monthly-revenue` | Monthly by section (12 months) | `{ months: [{ month, academy, indicators, bot_alerts }] }` |

---

## Transaction Creation on Enrolment

Every member enrolment MUST create a transaction record:

### Paid Enrolment
| Field | Value |
|---|---|
| `section` | academy / indicators / bot_alerts (depending on product type) |
| `customer_name` | User's name from search |
| `item_name` | Product title |
| `amount` | Product price (from course/indicator/bot) |
| `status` | `"completed"` |
| `method` | Selected by admin during enrolment (Card/Crypto/Bank Transfer/UPI/Other) |
| `course_id` / `indicator_id` / `bot_id` | The product's ID |
| `user_id` | Enrolled user's ID |

### Free Enrolment
| Field | Value |
|---|---|
| `section` | academy / indicators / bot_alerts |
| `customer_name` | User's name |
| `item_name` | Product title |
| `amount` | `0` |
| `status` | `"completed"` |
| `method` | `"Free"` |
| `course_id` / `indicator_id` / `bot_id` | The product's ID |
| `user_id` | Enrolled user's ID |

### Enrolment API Calls (updated)

Each enrolment endpoint must accept `amount` and `method` in the request body:

| Endpoint | Request Body additions | Also Creates |
|---|---|---|
| `POST /api/academy/courses/:id/members` | `{ ..., amount: number, method: string }` | Transaction (section=academy) |
| `POST /api/indicators/:id/members` | `{ ..., amount: number, method: string }` | Transaction (section=indicators) |
| `POST /api/bots/:id/members` | `{ ..., amount: number, method: string }` | Transaction (section=bot_alerts) |

**Logic:**
- If `accessType === "paid"` → `amount` = product price, `method` = admin-selected
- If `accessType === "free"` → `amount` = 0, `method` = "Free"

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

## Payment History Table Columns

| Column | Field | Display |
|---|---|---|
| Date | `created_at` | "MMM d, yyyy" |
| Section | `section` | Badge (Academy/Indicators/Bot Alerts) |
| Customer | `customer_name` | Plain text |
| Item | `item_name` | Plain text |
| Method | `method` | Badge (Card/Crypto/Bank Transfer/UPI/Free/Other) |
| Amount | `amount` | ₹ INR format |
| Status | `status` | Badge (Completed/Pending/Refunded) |

---

## Stat Cards

| Card | Computation |
|---|---|
| This Month Revenue | SUM(amount) WHERE created_at >= startOfMonth(NOW()) AND status != refunded |
| Last Month Revenue | SUM(amount) WHERE created_at >= startOfMonth(NOW()-1month) AND created_at < startOfMonth(NOW()) AND status != refunded |
| Transactions | COUNT(*) WHERE created_at >= startOfMonth(NOW()) AND status != refunded |
| Avg Transaction | This Month Revenue / Transactions |

---

## Monthly Revenue Chart

- X-axis: 12 months (Jan→Dec)
- Y-axis: Revenue (₹ INR)
- Stacks: Academy (color 1), Indicators (color 2), Bot Alerts (color 3)
- Excludes refunded payments

---

## Revenue by Section

| Section | Shows |
|---|---|
| Academy | Revenue, transaction count, top course |
| Indicators | Revenue, transaction count, top indicator |
| Bot Alerts | Revenue, transaction count, top bot |

---

## Frontend Integration Status

### Currently Wired ⚠️
- Finance page calls 3 APIs on server-side (courses, indicators, botusers)
- But payments are SYNTHESIZED client-side (not real transactions)

### What Needs to Change
1. Replace `derive-payments.ts` with real `GET /api/finance/transactions` call
2. KPI cards read from `/api/finance/summary` instead of derived data
3. Monthly chart reads from `/api/finance/monthly-revenue`
4. Revenue by section reads from transactions table
5. Remove all orphan mock components (card-overview, spending-breakdown, etc.)
6. Enrolment APIs (academy/indicators/bots) must create transaction records
