# Library Client Portal Pipeline

## Page: `/portal/library` — Purchased Items, Lessons, License Management, Discord

---

## 1. USER'S QUESTION ANSWER

> "in library Courses for discord, indicators and bots for renew UI in available already?"

**YES — All three UIs already exist in the frontend:**

| Feature | UI Element | Line | Status |
|---|---|---|---|
| **Courses → Discord** | "Join Discord" button + "Extend +1 Yr" button | `page.tsx:668-686` | ✅ UI exists |
| **Courses → Discord Renewal Modal** | Full modal with ₹4,092 price | `page.tsx:1264-1313` | ✅ UI exists |
| **Indicators → Renew** | "Renew Script Subscription" button | `page.tsx:1016-1023` | ✅ UI exists |
| **Bots → Renew** | "Renew Bot License" button | `page.tsx:1165-1172` | ✅ UI exists |
| **Renewal Modal (Indicators/Bots)** | 30 Days (₹2,421) / 1 Year (₹16,617) options | `page.tsx:1188-1262` | ✅ UI exists |

**What's MOCK (needs backend):**
- `API.renewProduct()` → localStorage (line `api.ts:403`)
- `API.saveTransaction()` → localStorage (line `api.ts:388`)
- `API.getExpirations()` → localStorage (line `api.ts:397`)
- `API.getLessons()` → localStorage (line `api.ts:376`)
- `API.getTransactions()` → localStorage (line `api.ts:382`)
- Discord days tracking → localStorage `dealdeck_discord_days`

---

## 2. PAGE INITIALIZATION FLOW

```
AppProvider (AppContext.tsx)
  ├─ useEffect #1: API.getProfile()           → GET /users/me
  ├─ useEffect #2: API.getPurchasedIds()       → GET /my-purchases
  ├─ useEffect #2: API.getLibrary()            → GET /my-library
  │
  └─ LibraryPage (library/page.tsx)
       └─ useEffect: fetchLibraryDetails()
            ├─ API.getExpirations()            → GET /my-expirations
            ├─ API.getLessons()                → GET /my-lessons
            └─ API.getTransactions()           → GET /my-transactions
```

### Timeline (what fires on page load)

| Order | Component | API Call | Backend Endpoint | Purpose |
|-------|-----------|----------|------------------|---------|
| 1 | AppContext | `API.getProfile()` | `GET /users/me` | Load user profile |
| 2 | AppContext | `API.getPurchasedIds()` | `GET /my-purchases` | Load purchased IDs |
| 3 | AppContext | `API.getLibrary()` | `GET /my-library` | Load full library objects |
| 4 | LibraryPage | `API.getExpirations()` | `GET /my-expirations` | Load product expirations |
| 5 | LibraryPage | `API.getLessons()` | `GET /my-lessons` | Load course lessons |
| 6 | LibraryPage | `API.getTransactions()` | `GET /my-transactions` | Load transaction history |

---

## 3. API CALLS #1-3 — AppContext (Shared)

Same as other pages — `GET /users/me`, `GET /my-purchases`, `GET /my-library`. All exist ✅.

### Library Response Shape (from `GET /my-library`)
```json
{
  "courses": [
    {
      "id": 1,
      "course_id": "course-4",
      "title": "The Scalping Blueprint: 5m Trend Crushing",
      "description": "High-probability scalp entries...",
      "thumbnail": "https://picsum.photos/seed/scalp/600/400",
      "expiry": "2026-07-12T22:27:53.000Z",
      "purchased_at": "2026-06-12T22:27:53.000Z"
    }
  ],
  "indicators": [
    {
      "id": 2,
      "indicator_id": "ind-1",
      "name": "DealDeck Liquidity Radar",
      "description": "Bridges institutional dark pool orders...",
      "thumbnail": "https://picsum.photos/seed/radar/600/400",
      "expiry": "2026-07-12T22:27:53.000Z",
      "purchased_at": "2026-06-12T22:27:53.000Z"
    }
  ],
  "bots": [
    {
      "id": 2,
      "bot_id": "bot-2",
      "name": "Trend-Rider EMA Breakout AutoBot",
      "description": "Auto-executes momentum breakouts...",
      "thumbnail": "https://picsum.photos/seed/bot2/600/400",
      "expiry": "2026-07-12T22:27:53.000Z",
      "purchased_at": "2026-06-12T22:27:53.000Z"
    }
  ]
}
```

### ⚠️ Field Mapping Issue
The backend `GET /my-library` returns:
- Courses: `thumbnail` (not `image`), `course_id` (not `id` for product key)
- Indicators: `name` (not `title`), `thumbnail` (not `image`), `indicator_id` (not `id`)
- Bots: `name` (not `title`), `thumbnail` (not `image`), `bot_id` (not `id`)

But the frontend `LibraryPage` accesses `library.courses`, `library.indicators`, `library.bots` using `BaseProduct` fields (`id`, `title`, `image`). This mismatch needs resolution.

---

## 4. API CALL #4 — Load Expirations

### Request
```
GET /my-expirations
Authorization: Bearer <token>
```

### Backend Handler
**⚠️ DOES NOT EXIST YET — needs to be created**

### Frontend API Method
**File:** `frontend/src/portal/api.ts:397`
```typescript
async getExpirations(): Promise<Record<string, string>> {
    await delay(150);
    return getStoredExpirations();  // ← localStorage
}
```

### Expected Response (when backend is built)
```json
{
  "ind-1": "2026-07-12T22:27:53.000Z",
  "bot-2": "2026-07-12T22:27:53.000Z"
}
```

### Frontend Usage
```typescript
// library/page.tsx:131
const [expirations, setExpirations] = useState<Record<string, string>>({});

// line 915 (indicators)
const expiry = expirations[ind.id];
const isLifetime = !expiry;
const daysRemaining = expiry ? Math.ceil((+new Date(expiry) - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
const isExpired = expiry && daysRemaining <= 0;

// line 1058 (bots)
const expiry = expirations[bot.id];
```

---

## 5. API CALL #5 — Load Lessons

### Request
```
GET /my-lessons
Authorization: Bearer <token>
```

### Backend Handler
**⚠️ DOES NOT EXIST YET — needs to be created**

Currently only admin endpoint exists:
**File:** `backend/app/routers/courses.py:83`
```python
@router.get("/api/admin/courses/{course_id}/lessons")
def get_course_lessons(course_id: str, db, current_admin):
    # Requires admin auth — NOT public
```

### Frontend API Method
**File:** `frontend/src/portal/api.ts:376`
```typescript
async getLessons(): Promise<Lesson[]> {
    await delay(150);
    return getStoredLessons();  // ← localStorage
}
```

### Expected Response (when backend is built)
```json
[
  {
    "id": "lesson-abc123",
    "course_id": "course-4",
    "title": "Order Block Theory Fundamentals",
    "type": "youtube",
    "link": "https://www.youtube.com/watch?v=abc123",
    "addedAt": "2026-06-09T10:00:00.000Z",
    "duration": "Recorded video"
  },
  {
    "id": "lesson-def456",
    "course_id": "course-4",
    "title": "Live Q&A Session",
    "type": "zoom",
    "link": "https://zoom.us/j/9876543210",
    "addedAt": "2026-06-10T14:00:00.000Z",
    "duration": "Live Stream",
    "startTime": "2026-06-12T18:30:00.000Z"
  }
]
```

### Frontend Usage
```typescript
// library/page.tsx:134
const [lessons, setLessons] = useState<Lesson[]>([]);

// line 543 — filter lessons per course
const courseLessons = lessons.filter(l => l.course_id === course.id);
```

### Backend Lesson Model
**File:** `backend/app/models/course.py:35`
```python
class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    title = Column(String(255))
    type = Column(String(50), default="youtube")  # youtube | zoom | meet
    link = Column(Text, nullable=True)
    duration = Column(String(50), nullable=True)
    start_time = Column(DateTime, nullable=True)
    added_at = Column(DateTime, default=...)
```

---

## 6. API CALL #6 — Load Transactions

### Request
```
GET /my-transactions
Authorization: Bearer <token>
```

### Backend Handler
**⚠️ DOES NOT EXIST YET — needs to be created**

### Frontend API Method
**File:** `frontend/src/portal/api.ts:382`
```typescript
async getTransactions(): Promise<Transaction[]> {
    await delay(150);
    return getStoredTransactions();  // ← localStorage
}
```

### Expected Response (when backend is built)
```json
[
  {
    "id": "TX-5023-47",
    "date": "2026-06-12T22:27:53.000Z",
    "product_id": "ind-1",
    "productTitle": "DealDeck Liquidity Radar",
    "productImage": "https://picsum.photos/seed/radar/600/400",
    "type": "Purchase",
    "amount": 150,
    "status": "SUCCESSFUL",
    "tvid": "stoic_trader_tv_99",
    "product_section": "Indicator"
  }
]
```

---

## 7. COURSE SECTION — LESSONS DISPLAY

### Data Flow
```typescript
// library/page.tsx:539-543
library.courses.map((course) => {
  const courseLessons = lessons.filter(l => l.course_id === course.id);
  // renders lesson cards
})
```

### Lesson Types Rendered

**YouTube Lessons** (line 736-786):
```typescript
const youtubeLessons = courseLessons.filter(l => l.type === 'youtube');
// Renders: "Stream Recorded Video" button → external link
```

**Zoom/Meet Lessons** (line 789-876):
```typescript
const liveLessons = courseLessons.filter(l => l.type === 'zoom' || l.type === 'meet');
// Renders: "Enter Live Zoom Webinar" / "Join Google Meet Session" button → external link
// Shows meeting start time if available
```

---

## 8. COURSE SECTION — DISCORD SUPPORT

### Display
```typescript
// library/page.tsx:647-688
<div className="bg-indigo-950/15 border border-indigo-500/15 rounded-xl">
  <span>Days Left: {discordSupportDaysLeft[course.id] ?? 365}</span>
  <a href="https://discord.gg/dealdeck">Join Discord</a>
  <button onClick={() => setRenewingDiscordCourse(course)}>Extend +1 Yr</button>
</div>
```

### Discord Days Tracking
```typescript
// library/page.tsx:184-200
// Loaded from localStorage: dealdeck_discord_days
// Default: 365 days per course
useEffect(() => {
  const saved = localStorage.getItem('dealdeck_discord_days');
  // ... initializes 365 days for each purchased course
}, [library.courses]);
```

---

## 9. DISCORD RENEWAL FLOW

### Trigger
User clicks "Extend +1 Yr" on a course's Discord section.

### Modal
```typescript
// library/page.tsx:1264-1313
{renewingDiscordCourse && (
  <div> /* Discord renewal modal */
    <span>₹4,092 INR</span>  {/* 1 year extension */}
    <button onClick={handleRenewDiscord}>Extend Support</button>
  </div>
)}
```

### Handler
```typescript
// library/page.tsx:224-272
const handleRenewDiscord = async () => {
  // 1. Update discordSupportDaysLeft (+365 days)
  // 2. Save to localStorage: dealdeck_discord_days
  // 3. Create transaction record via API.saveTransaction()
  // 4. Add notification
};
```

### API Calls Made
```
POST /transactions/save  (MOCK — localStorage)
```

### Backend Endpoint (needs building)
```
POST /my-transactions
Authorization: Bearer <token>
Body: {
  "product_id": "course-4",
  "productTitle": "The Scalping Blueprint (Discord 1-Yr Support Renewal)",
  "type": "Renewal",
  "amount": 4092,
  "product_section": "Course"
}
```

---

## 10. INDICATOR/BOT RENEWAL FLOW

### Trigger
User clicks "Renew Script Subscription" (indicators) or "Renew Bot License" (bots).

### State Setup
```typescript
// library/page.tsx:1016-1023 (indicators)
onClick={() => setRenewingProduct({ id: ind.id, title: ind.title, price: ind.price })}

// library/page.tsx:1165-1172 (bots)
onClick={() => setRenewingProduct({ id: bot.id, title: bot.title, price: bot.price })}
```

### Modal
```typescript
// library/page.tsx:1188-1262
{renewingProduct && (
  <div> /* Renewal modal */
    <button onClick={() => setSelectedDuration(1)}>30 Days Boost — ₹2,421</button>
    <button onClick={() => setSelectedDuration(12)}>1 Year Standard — ₹16,617</button>
    <span>Total Due: ₹{selectedDuration === 1 ? '2,421' : '16,617'} INR</button>
    <button onClick={handleRenewLicense}>Pay & Renew</button>
  </div>
)}
```

### Handler
```typescript
// library/page.tsx:203-221
const handleRenewLicense = async () => {
  const price = selectedDuration === 1 ? 29 : 199;
  const durationDays = selectedDuration === 1 ? 30 : 365;
  const res = await API.renewProduct(renewingProduct.id, price, durationDays);
  // Note: price in handler uses $29/$199 but modal shows ₹2,421/₹16,617 — INCONSISTENCY
};
```

### API Call
```
POST /renew
Authorization: Bearer <token>
Body: {
  "product_id": "ind-1",
  "duration_days": 30
}
```

### Backend Endpoint (needs building)
```
POST /renew
```

---

## 11. ADMIN LESSON SIMULATOR

### What It Does
A sandbox-only admin console that lets instructors simulate adding lessons to courses via localStorage.

### Form Fields
```typescript
// library/page.tsx:397-466
- Target Course (select from library.courses)
- Lesson Title (text input)
- Broadcaster Medium (select: youtube | zoom | meet)
- Meeting Start Time (datetime-local, only for zoom/meet)
- Submit → "Deploy Lesson Link"
```

### Handler
```typescript
// library/page.tsx:275-327
const handleAdminAddLesson = async (e) => {
  const newLesson = await API.adminAddLesson(
    selectedCourseForAdmin,
    adminLessonTitle,
    adminLessonType,
    finalLink,
    adminMeetingStartTime
  );
  // Creates notification, reloads lessons
};
```

### API Call
```
POST /admin/add-lesson  (MOCK — localStorage)
```

### Backend Endpoint (exists but admin-only)
```
POST /api/admin/courses/{course_id}/lessons  (requires admin auth)
```

---

## 12. BACKEND ENDPOINTS SUMMARY

### ✅ Already Exist

| Endpoint | Method | Auth | File | Purpose |
|---|---|---|---|---|
| `GET /users/me` | GET | User | `auth.py:94` | User profile |
| `GET /my-purchases` | GET | User | `purchases.py:423` | Purchased IDs |
| `GET /my-library` | GET | User | `purchases.py:452` | Full library objects |
| `GET /api/admin/courses/{id}/lessons` | GET | Admin | `courses.py:83` | Course lessons (admin) |
| `POST /api/admin/courses/{id}/lessons` | POST | Admin | `courses.py:91` | Create lesson (admin) |

### ❌ Needs to Be Built

| Endpoint | Method | Auth | Request Body | Response | Purpose |
|---|---|---|---|---|---|
| `GET /my-expirations` | GET | User | — | `{ "ind-1": "2027-06-21T..." }` | Product expirations |
| `GET /my-lessons` | GET | User | — | `Lesson[]` | User's course lessons |
| `GET /my-transactions` | GET | User | — | `Transaction[]` | Transaction history |
| `POST /my-transactions` | POST | User | `{ product_id, type, amount, ... }` | `Transaction` | Save new transaction |
| `POST /renew` | POST | User | `{ product_id, duration_days }` | `{ success, expiration }` | Renew license |

---

## 13. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LIBRARY PAGE LOAD                            │
└─────────────────────────────────────────────────────────────────────┘

  Browser                              Backend                      Database
    │                                      │                            │
    │  GET /users/me                       │                            │
    │─────────────────────────────────────>│  SELECT * FROM users       │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-purchases                   │                            │
    │─────────────────────────────────────>│  SELECT ... FROM           │
    │                                      │  transactions              │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-library                     │                            │
    │─────────────────────────────────────>│  SELECT ... FROM           │
    │                                      │  course_members/            │
    │                                      │  indicator_members/         │
    │                                      │  bot_members JOIN products │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-expirations                 │                            │
    │─────────────────────────────────────>│  SELECT ... FROM           │
    │  ⚠️ NEEDS BUILDING                   │  indicator_members +       │
    │                                      │  bot_members (expiry)      │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-lessons                     │                            │
    │─────────────────────────────────────>│  SELECT ... FROM lessons   │
    │  ⚠️ NEEDS BUILDING                   │  JOIN courses WHERE        │
    │                                      │  user is enrolled          │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-transactions                │                            │
    │─────────────────────────────────────>│  SELECT * FROM transactions│
    │  ⚠️ NEEDS BUILDING                   │  WHERE username = user     │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER: 4 tabs (All, Courses, Indicators, Bots)      │        │
    │  │                                                      │        │
    │  │ COURSES:                                             │        │
    │  │  • Thumbnail + title + instructor + difficulty       │        │
    │  │  • CourseCountdown (if not started)                  │        │
    │  │  • Lessons list (expandable, grouped by type)        │        │
    │  │  • Discord Support section with "Join" + "Extend"    │        │
    │  │                                                      │        │
    │  │ INDICATORS:                                          │        │
    │  │  • Thumbnail + title + scriptType + accuracy         │        │
    │  │  • License expiry status (expandable)                │        │
    │  │  • "Renew Script Subscription" button                │        │
    │  │                                                      │        │
    │  │ BOTS:                                                │        │
    │  │  • Thumbnail + title + exchange + APY + status       │        │
    │  │  • License expiry status (expandable)                │        │
    │  │  • "Renew Bot License" button                        │        │
    │  └──────────────────────────────────────────────────────┘        │
```

---

## 14. MOCK → REAL BACKEND FIELD MAPPING

### Library Response Fields

| Frontend Access | Backend `GET /my-library` Field | Type |
|---|---|---|
| `course.id` | `courses.id` (int PK) or `courses.course_id` (str business key) | ⚠️ MISMATCH |
| `course.title` | `courses.title` | `str` |
| `course.image` | `courses.thumbnail` | ⚠️ MISMATCH |
| `course.description` | `courses.description` | `str` |
| `course.category` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `course.lecturer` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `course.difficulty` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `course.duration` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `course.scheduled_at` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `ind.id` | `indicators.indicator_id` (str) | ⚠️ MISMATCH |
| `ind.title` | `indicators.name` | ⚠️ MISMATCH |
| `ind.image` | `indicators.thumbnail` | ⚠️ MISMATCH |
| `ind.scriptType` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `ind.timeframe` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `ind.accuracy` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `bot.id` | `bots.bot_id` (str) | ⚠️ MISMATCH |
| `bot.title` | `bots.name` | ⚠️ MISMATCH |
| `bot.image` | `bots.thumbnail` | ⚠️ MISMATCH |
| `bot.exchange` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `bot.apy` | — (not returned by `/my-library`) | ⚠️ MISSING |
| `bot.status` | — (not returned by `/my-library`) | ⚠️ MISSING |

### ⚠️ Critical Issue
The `GET /my-library` endpoint returns **minimal data** (only `id`, `name`/`title`, `description`, `thumbnail`, `expiry`, `purchased_at`). It does NOT return:
- `category`, `lecturer`, `difficulty`, `duration`, `scheduled_at` (courses)
- `scriptType`, `timeframe`, `accuracy` (indicators)
- `exchange`, `apy`, `status` (bots)

**Solution options:**
1. Enrich `GET /my-library` to return full product fields
2. Or have frontend cross-reference with `GET /public/bots`, `GET /public/indicators` data

---

## 15. REMAINING MOCK CALLS TO REWRITE

| File | Function | Current (MOCK) | Target (Real) |
|---|---|---|---|
| `portal/api.ts:376` | `getLessons()` | `localStorage` | `GET /my-lessons` |
| `portal/api.ts:382` | `getTransactions()` | `localStorage` | `GET /my-transactions` |
| `portal/api.ts:388` | `saveTransaction()` | `localStorage` | `POST /my-transactions` |
| `portal/api.ts:397` | `getExpirations()` | `localStorage` | `GET /my-expirations` |
| `portal/api.ts:403` | `renewProduct()` | `localStorage` | `POST /renew` |
| `portal/api.ts:452` | `adminAddLesson()` | `localStorage` | `POST /api/admin/courses/{id}/lessons` (admin auth) |
| `library/page.tsx:184` | Discord days | `localStorage` | Backend `course_members.discord_expiry` or separate table |

---

## 16. INCONSISTENCIES TO FIX

| Issue | Location | Problem |
|---|---|---|
| **Price mismatch** | `handleRenewLicense` uses `$29/$199` but modal shows `₹2,421/₹16,617` | `$29 ≠ ₹2,421`, `$199 ≠ ₹16,617` |
| **`product_id` vs `productUuid`** | `api.ts:358,433` | Transaction uses `productUuid` but type definition uses `product_id` |
| **Library field names** | Backend returns `name`/`thumbnail`, frontend expects `title`/`image` | Type mismatch |
| **Discord days** | Tracked in `localStorage` only | Needs backend persistence |
| **`adminAddLesson`** | Uses `course_id: courseUuid` but Lesson model FK is `course.id` (int) | Type mismatch |
