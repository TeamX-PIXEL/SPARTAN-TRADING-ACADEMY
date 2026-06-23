# Alert Bots Pipeline — Data Requirements

---

## SQL Tables

### 1. `bots` (16 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `bot_id` | VARCHAR(50) UNIQUE | e.g. "BOT-301" |
| `title` | VARCHAR(255) | Required |
| `description` | TEXT | Short description |
| `long_description` | TEXT | Full description |
| `price` | DECIMAL(12,2) | INR |
| `image` | TEXT nullable | Base64 or URL |
| `category` | VARCHAR(100) | Default "General" |
| `features` | JSON | Array of 4 strings |
| `exchange` | VARCHAR(100) | Default "Binance" |
| `apy` | VARCHAR(50) | Default "—" |
| `status` | VARCHAR(20) | Running / Idle / Paused |
| `token_env` | VARCHAR(255) nullable | Bot token env var name |
| `purchased_count` | INT | Default 0, auto-increment on member add |
| `created_at` | DATETIME | Auto-set |
| `updated_at` | DATETIME | Auto-set |

### 2. `bot_members` (5 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `username` | VARCHAR(100) | FK→users.username (business key) |
| `bot_id` | VARCHAR(50) | FK→bots.bot_id (business key) |
| `expiry` | DATETIME nullable | Bot access expiry |
| `joined_at` | TIMESTAMP | Auto-set |

UNIQUE(username, bot_id) — one enrolment per user per bot

> **Lookup fields** (not stored, queried from `users` table via `username`): name, email
> **Access type** (not stored, derived from `transactions` amount > 0 = "paid")

---

## API Endpoints (6 total)

### Bots CRUD (4)

| # | Method | Path | Description | Request Body | Response |
|---|---|---|---|---|---|
| 1 | GET | `/api/admin/bots` | List all | — | `Bot[]` (direct array) |
| 2 | POST | `/api/admin/bots` | Create | `{ bot_id, title, description, long_description, price, image, category, features, exchange, apy, status, token_env? }` | `Bot` (purchased_count=0) |
| 3 | PATCH | `/api/admin/edit/bot/{bot_id}` | Update by PK | Partial fields | `Bot` |
| 4 | DELETE | `/api/admin/delete/bot/{bot_id}` | Delete (blocks if purchased) | — | `{ message }` |

### Bot Members (3)

| # | Method | Path | Description | Request Body | Response |
|---|---|---|---|---|---|
| 5 | GET | `/api/admin/bots/{bot_id}/members` | List members (enriched from users + transactions) | — | `[{ id, username, bot_id, expiry, joined_at, name, email, access_type }]` |
| 6 | POST | `/api/admin/bots/{bot_id}/members` | Enrol member | `{ username, expiry?, amount, method }` | Enriched member + creates Transaction + purchased_count++ |
| 7 | PATCH | `/api/admin/bots/members/{member_id}` | Update expiry | `{ expiry }` | Enriched member |

---

## Business Rules

1. **`bot_id` immutable** after creation (disabled in edit form)
2. **`bot_id` uniqueness** checked case-insensitively
3. **`purchased_count` auto-increments** on member enrol (no decrement — members not deleted)
4. **Required fields**: `bot_id`, `title`, `price`
5. **Default values**: category="General", exchange="Binance", apy="—", status="Idle"
6. **`bot_id` format** — auto-uppercase, spaces→hyphens
7. **Member enrolment** creates a Transaction record (amount=0 → method="Free")
8. **Delete blocked** if purchased_count > 0

---

## Data Transformations (Frontend → Backend)

| Field | Transformation |
|---|---|
| `bot_id` | `.trim().toUpperCase().replace(/\s+/g, "-")` |
| `price` | `parseFloat(form.price) \|\| 0` |
| `features` | `.map(f => f.trim()).filter(Boolean)` — max 4 |
| `category` | `.trim()` with default `"General"` |
| `exchange` | `.trim()` with default `"Binance"` |
| `apy` | `.trim()` with default `"—"` |
| `token_env` | `.trim()` or `null` |
| `image` | Base64 data-URL string or empty string |

---

## Stat Cards (Members Page)

| Card | Computation |
|---|---|
| Total Members | `members.filter(m => m.botId === id).length` |
| Paid Access | `.filter(m => m.accessType === "paid").length` |
| Free Access | `.filter(m => m.accessType === "free").length` |
| Active Bots | `members.filter(m => m.botId === id).length` (same as Total) |

---

## Bot Table Columns

| Column | Field |
|---|---|
| # | Computed index |
| Bot | Thumbnail + title + bot_id |
| Category | Badge |
| Exchange | Badge "API Bound: {exchange}" |
| APY | Badge "{apy} APY" |
| Price | formatCurrency (INR) |
| Status | Badge with colored dot (Running/Idle/Paused) |
| Purchased | purchased_count badge |
| Action | Edit + Enrolled Members + Delete |

---

## Members Table Columns

| Column | Field |
|---|---|
| # | Computed index |
| Client | Avatar initial + name + @username |
| Email | Mail icon + email |
| Access | Free/Paid badge |
| Joined | formatDate(joinedAt) |
| Bot Expiry | Calendar icon + date |
| Action | Edit expiry button |

---

## Frontend Integration Status

### Wired to Real API ✅
- `GET /api/admin/bots` — fetchBots on mount
- `POST /api/admin/bots` — addBot (async)
- `PATCH /api/admin/edit/bot/{id}` — updateBot (async)
- `DELETE /api/admin/delete/bot/{id}` — removeBot (async)
- `GET /api/admin/bots/{id}/members` — fetchBotMembers on mount
- `POST /api/admin/bots/{id}/members` — addBotMember (async)
- `PATCH /api/admin/bots/members/{id}` — updateBotMemberExpiry (async)
- `GET /users/search?q=` — user search for member enrolment
