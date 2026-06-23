# Indicators Pipeline — Data Requirements

---

## SQL Tables

### 1. `indicators` (19 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `indicator_id` | VARCHAR(64) UNIQUE | Admin slug e.g. "IND-201" |
| `title` | VARCHAR(255) | Required |
| `description` | TEXT | Short description |
| `long_description` | TEXT nullable | Full description |
| `price` | FLOAT | INR, default 0.0 |
| `image` | TEXT nullable | Base64 or URL |
| `category` | VARCHAR(128) | Default "General" |
| `features` | JSON nullable | Array of strings |
| `script_type` | VARCHAR(128) | Default "Pine Script (v6)" |
| `accuracy` | VARCHAR(32) nullable | e.g. "87.4%" |
| `timeframe` | VARCHAR(128) nullable | e.g. "M5 / M15" |
| `pine_id` | VARCHAR(128) nullable | TradingView pub ID |
| `session_id` | VARCHAR(128) nullable | TradingView Session ID |
| `status` | VARCHAR(16) | running / paused / unavailable |
| `purchased_count` | INT | Default 0, auto-increment on member add |
| `created_at` | DATETIME | Auto-set |
| `updated_at` | DATETIME | Auto-set, auto-update |

### 2. `indicator_members` (5 fields)

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `username` | VARCHAR(100) | FK→users.username (business key) |
| `indicator_id` | VARCHAR(64) | FK→indicators.indicator_id (business key) |
| `expiry` | DATETIME nullable | LIVE expiry for access control |
| `joined_at` | DATETIME | Auto-set |

UNIQUE(username, indicator_id) — one enrolment per user per indicator

> **Enrichment fields** (not stored, queried from `users` table via `username`): name (firstname+lastname), email, discord_user_id, access_type (derived: amount>0 → paid, else free)

---

## API Endpoints (8 total)

### Indicators CRUD (5)

| # | Method | Path | Description | Request Body | Response |
|---|---|---|---|---|---|
| 1 | GET | `/api/admin/indicators?skip=0&limit=100` | List all | — | `{ indicators: Indicator[], total, skip, limit }` |
| 2 | POST | `/api/admin/indicators` | Create | `{ indicator_id, title, description, long_description, price, image, category, features, script_type, accuracy, timeframe, pine_id, session_id, status }` | `Indicator` (purchased_count=0) |
| 3 | PUT | `/api/admin/indicators/{indicator_id}` | Update | Partial fields (NOT indicator_id) | `Indicator` |
| 4 | DELETE | `/api/admin/indicators/{indicator_id}` | Delete | — | `{ message, indicator_id }` (only if purchased_count=0, cascades members) |
| 5 | GET | `/api/admin/indicators/check-id/{indicator_id}` | Check uniqueness | — | `{ exists: bool }` |

### Indicator Members (3)

| # | Method | Path | Description | Request Body | Response |
|---|---|---|---|---|---|
| 6 | GET | `/api/admin/indicators/{indicator_id}/members` | List members | — | `[{ id, username, indicator_id, expiry, joined_at, name, email, discord_user_id, access_type }]` |
| 7 | POST | `/api/admin/indicators/{indicator_id}/members` | Enrol member | `{ username, expiry?, amount, method }` | Same as GET member (creates Transaction, increments purchased_count) |
| 8 | PATCH | `/api/admin/indicators/members/{member_id}` | Update expiry | `{ expiry }` | Same as GET member |

### User Search (shared) — already exists

| # | Method | Path |
|---|---|---|
| — | GET | `/api/users/search?q=` |

---

## Backend Changes Required

### Schemas (`app/schemas/indicator.py`)

1. **`IndicatorUpdate`** — remove `indicator_id` field (immutable after creation)
2. **`IndicatorMemberResponse`** — add: `name`, `email`, `discord_user_id`, `access_type`
3. **`AddIndicatorMemberRequest`** — replace with: `{ username, expiry?, amount, method }`
4. **Add `IndicatorMemberUpdate`** — `{ expiry: Optional[datetime] }`
5. **Add `PaginatedIndicatorsResponse`** — `{ indicators: Indicator[], total, skip, limit }`

### Router (`app/routers/indicators.py`) — Full rewrite

| Endpoint | Changes |
|---|---|
| `GET /api/admin/indicators` | Add pagination (`skip`, `limit` query params), return `PaginatedIndicatorsResponse` |
| `POST /api/admin/indicators` | Keep existing logic, add `created_at`/`updated_at` defaults |
| `GET /api/admin/indicators/check-id/{indicator_id}` | NEW — return `{ exists: bool }` |
| `PUT /api/admin/indicators/{indicator_id}` | Change from PATCH to PUT, exclude `indicator_id` from update |
| `DELETE /api/admin/indicators/{indicator_id}` | Add `purchased_count > 0` check, cascade delete members |
| `GET /api/admin/indicators/{indicator_id}/members` | JOIN users table for enrichment, return `IndicatorMemberResponse[]` |
| `POST /api/admin/indicators/{indicator_id}/members` | Accept `{ username, expiry, amount, method }`, create Transaction, increment purchased_count |
| `PATCH /api/admin/indicators/members/{member_id}` | NEW endpoint, update expiry only |

### Model (`app/models/indicator.py`)

- No changes needed — model already matches

### Schemas export (`app/schemas/__init__.py`)

- Add `IndicatorMemberUpdate`, `PaginatedIndicatorsResponse` to exports

---

## Frontend Changes Required

### Store (`lib/academy-store.ts`)

**Actions to convert from store-only to API:**

| Action | Current | New |
|---|---|---|
| `fetchIndicators()` | MISSING | `fetchWithAuth → GET /api/admin/indicators` |
| `fetchIndicatorMembers(indicatorId)` | MISSING | `fetchWithAuth → GET /api/admin/indicators/{id}/members` |
| `addIndicator(data)` | Store-only `set()` | `fetchWithAuth → POST /api/admin/indicators` |
| `updateIndicator(id, patch)` | Store-only `set()` | `fetchWithAuth → PUT /api/admin/indicators/{id}` |
| `removeIndicator(id)` | Store-only `set()` | `fetchWithAuth → DELETE /api/admin/indicators/{id}` |
| `addIndicatorMember(indicatorId, data)` | Store-only `set()` with fake delay | `fetchWithAuth → POST /api/admin/indicators/{id}/members` |
| `updateIndicatorMemberExpiry(memberId, expiry)` | MISSING | `fetchWithAuth → PATCH /api/admin/indicators/members/{id}` |

**Add `mapIndicatorMember(raw)` mapper:**

```
raw.id → id
raw.username → username
raw.name → name
raw.email → email
raw.discord_user_id → discordid
raw.expiry → indicatorExpiry
raw.access_type → accessType
raw.joined_at → joinedAt
raw.indicator_id → (stored for filtering)
```

### Components

**`indicators-view.tsx`:**
- Add `useEffect(() => { fetchIndicators(); }, [])` on mount
- `handleRemove()` → call async `removeIndicator()` instead of sync

**`indicator-form-dialog.tsx`:**
- `handleSubmit()` → call async `addIndicator()`/`updateIndicator()` with `await`

**`indicator-members-view.tsx`:**
- Add `useEffect(() => { fetchIndicatorMembers(indicator.id); }, [indicator.id])` on mount
- `handleAdd()` → call async `addIndicatorMember(indicator.indicator_id, data)` with `await`
- `handleSaveExpiry()` → call async `updateIndicatorMemberExpiry(memberId, expiry)` with `await`
- Pass `indicator.indicator_id` (string slug) not `indicator.id` (int PK) for API calls

### Files to DELETE (3)

| File | Reason |
|---|---|
| `add-indicator-user-dialog.tsx` | Redundant — `indicator-members-view.tsx` has full Add Client dialog |
| `indicator-participants-schema.ts` | Unused, references old `IndicatorUserRow` type |
| `indicator-participants-table.tsx` | Unused, imports deleted schema |

---

## Business Rules

1. **Indicator deletion blocked** if `purchased_count > 0`
2. **`indicator_id` immutable** after creation (disabled in edit form)
3. **`indicator_id` uniqueness** checked case-insensitively
4. **`purchased_count` auto-increments** on member enrol (no decrement — members not deleted)
5. **`indicator_id` format** — auto-uppercase, spaces→hyphens on every keystroke
6. **Required fields**: `indicator_id`, `title`, `price`
7. **Default values**: category="General", script_type="Pine Script (v6)", accuracy="—", timeframe="—", pine_id=null, session_id=null
8. **Access type derived from amount**: amount > 0 → "paid", amount = 0 → "free"
9. **Every enrolment creates a Transaction**: product_section="Indicator", indicator_id FK, amount, method, status="completed"
10. **Member expiry is LIVE**: updated via PATCH; transaction expiry is snapshot at purchase time

---

## Data Transformations (Frontend → Backend)

### Create/Update Indicator

| Field | Transformation |
|---|---|
| `indicator_id` | `.trim().toUpperCase().replace(/\s+/g, "-")` |
| `price` | `parseFloat(form.price) \|\| 0` |
| `features` | `.map(f => f.trim()).filter(Boolean)` — max 4 |
| `category` | `.trim()` with default `"General"` |
| `script_type` | `.trim()` with default `"Pine Script (v6)"` |
| `accuracy` | `.trim()` with default `"—"` |
| `timeframe` | `.trim()` with default `"—"` |
| `pine_id` | `.trim()` or `null` if empty |
| `session_id` | `.trim()` or `null` if empty |
| `long_description` | `.trim()` or `null` if empty |
| `image` | Base64 data-URL string or empty string |

### Enrol Member

| Field | Source |
|---|---|
| `username` | From search result |
| `expiry` | Date picker, ISO string or null |
| `amount` | Number input (0 for free) |
| `method` | Select: Card/UPI/Bank Transfer/Crypto/Other/Free |

---

## Stat Cards (Members Page)

| Card | Computation |
|---|---|
| Total Members | `indicatorMembers.length` |
| Paid Access | `.filter(m => m.accessType === "paid").length` |
| Free Access | `.filter(m => m.accessType === "free").length` |

---

## Frontend Integration Status

### All Wired to Real API ✅
- `GET /api/admin/indicators` — fetchIndicators() on mount
- `POST /api/admin/indicators` — addIndicator()
- `PUT /api/admin/indicators/{indicator_id}` — updateIndicator()
- `DELETE /api/admin/indicators/{indicator_id}` — removeIndicator()
- `GET /api/admin/indicators/{indicator_id}/members` — fetchIndicatorMembers() on mount
- `POST /api/admin/indicators/{indicator_id}/members` — addIndicatorMember()
- `PATCH /api/admin/indicators/members/{member_id}` — updateIndicatorMemberExpiry()
- `GET /users/search?q=` — user search for member enrolment

---

## Endpoint-by-Endpoint Call Flow

### 1. Page Load — Indicators Table

```
indicators-view.tsx
  └→ useEffect(() => fetchIndicators(), [])
       └→ GET /api/admin/indicators?skip=0&limit=100
            └→ mapIndicator() for each → set({ indicators })
```

### 2. Create Indicator

```
indicator-form-dialog.tsx → handleSubmit()
  └→ addIndicator(payload)
       └→ POST /api/admin/indicators
            └→ mapIndicator(raw) → append to indicators[]
```

### 3. Edit Indicator

```
indicator-form-dialog.tsx → handleSubmit()
  └→ updateIndicator(indicator.id, payload)
       └→ PUT /api/admin/indicators/{indicator_id}
            └→ mapIndicator(raw) → replace in indicators[]
```

### 4. Delete Indicator

```
indicators-view.tsx → handleRemove()
  └→ removeIndicator(indicator.id)
       └→ DELETE /api/admin/indicators/{indicator_id}
            └→ remove from indicators[], remove related members
```

### 5. Page Load — Indicator Members

```
indicator-members-view.tsx
  └→ useEffect(() => fetchIndicatorMembers(indicator.id), [indicator.id])
       └→ GET /api/admin/indicators/{indicator_id}/members
            └→ mapIndicatorMember() for each → set({ members })
```

### 6. Enrol Member

```
indicator-members-view.tsx → handleAdd()
  └→ addIndicatorMember(indicator.indicator_id, { username, expiry, amount, method })
       └→ POST /api/admin/indicators/{indicator_id}/members
            └→ mapIndicatorMember(raw) → append to members[]
            └→ increment indicator.purchased_count in store
```

### 7. Edit Expiry

```
indicator-members-view.tsx → handleSaveExpiry()
  └→ updateIndicatorMemberExpiry(memberId, expiry)
       └→ PATCH /api/admin/indicators/members/{member_id}
            └→ mapIndicatorMember(raw) → update in members[]
```

---

## Implementation Order

### Phase 1: Backend (schemas + router rewrite)
1. Update `schemas/indicator.py` — add/update 5 schemas
2. Rewrite `routers/indicators.py` — 8 admin endpoints + public endpoints
3. Update `schemas/__init__.py` — export new schemas

### Phase 2: Frontend Store
4. Add `mapIndicatorMember()` mapper
5. Add `fetchIndicators()` action
6. Add `fetchIndicatorMembers()` action
7. Convert `addIndicator()` to API call
8. Convert `updateIndicator()` to API call
9. Convert `removeIndicator()` to API call
10. Convert `addIndicatorMember()` to API call
11. Add `updateIndicatorMemberExpiry()` action

### Phase 3: Frontend Components
12. `indicators-view.tsx` — add useEffect load, async removeIndicator
13. `indicator-form-dialog.tsx` — async handleSubmit
14. `indicator-members-view.tsx` — add useEffect load, async addMember, async expiry edit
15. Delete 3 unused files

### Phase 4: Verify
16. TypeScript compile check
17. Backend compile check
18. Update Indicators_pipeline_data.md status section
