# Courses Client Portal Pipeline — Complete Data Flow

## Page: `/portal/courses` — Browse All Courses (Paginated)

---

## 1. API Calls Overview

| # | Frontend Call | Backend Endpoint | Status |
|---|---|---|---|
| 1 | `API.getCourses(skip, limit)` | `GET /public/courses?skip=&limit=` | ❌ MISSING |
| 2 | `API.getPurchasedIds()` | `GET /my-purchases` | ✅ EXISTS |
| 3 | `API.searchCatalog(query)` | `GET /search?q=` | ✅ EXISTS |
| 4 | `API.getProfile()` | `GET /users/me` | ❌ MISSING |
| 5 | `API.purchaseItem(item)` | `POST /purchase` | ❌ MISSING |

---

## 2. Detailed Call Chain — Courses Page Load

### Step 1: AppContext Initializes (on mount)

```
AppContext.tsx (line 196-227)
  → API.getProfile()              → GET /users/me              ❌ MISSING
  → API.getPurchasedIds()         → GET /my-purchases          ✅ EXISTS
  → API.getLibrary()              → GET /my-library            ✅ EXISTS
  → API.getExpirations()          → GET /my-expirations        ❌ MISSING
```

### Step 2: CoursesPage Component Mounts

```
portal/courses/page.tsx (line 26-41)
  → API.getCourses(0, 2)          → GET /public/courses?skip=0&limit=2   ❌ MISSING
```

### Step 3: User Scrolls to Bottom (Infinite Scroll)

```
portal/courses/page.tsx (line 44-63)
  → API.getCourses(skip, limit)   → GET /public/courses?skip=2&limit=2   ❌ MISSING
  → (repeats on each scroll near bottom)
```

### Step 4: User Clicks a Course Card → Product Detail Modal

```
portal/courses/page.tsx (line 88-92)
  → router.push(pathname?product=course-uuid)

ProductDetailModal.tsx (line 29-81)
  → reads `productUuid` from URL params
  → looks up course from MOCK_COURSES (hardcoded)
  → uses purchasedIds from AppContext to check purchase status
  → NO backend call — entirely client-side mock lookup
```

### Step 5: User Adds to Cart → Checkout → Razorpay

```
ProductCard.tsx (line 66-75)
  → addToCart({ id, title, price, image, type })  [AppContext]

CartLibraryPanel.tsx (line 32-43)
  → RazorpayModal opens
  → User fills payment form → clicks "Proceed to Pay"
  → validateAndPay() → simulated processing steps
  → onSuccess() → AppContext.checkout()

AppContext.tsx (line 283-306)
  → API.purchaseItem(item) for each cart item  → POST /purchase  ❌ MISSING
  → refreshLibrary() → API.getPurchasedIds() + API.getLibrary()
  → redirects to /portal/settings?success=purchase
```

### Step 6: User Searches via TopHeader

```
TopHeader.tsx (line 88-91)
  → setSearchQuery(value)

layout.tsx (line 96-103)
  → if searchQuery.trim() !== "" → renders <SearchResults query={searchQuery} />

SearchResults.tsx (line 23-42)
  → API.searchCatalog(query)  → GET /search?q=   ✅ EXISTS
  → debounced 300ms
```

---

## 3. Backend Endpoint #1: `GET /public/courses`

### MISSING — Needs to be created

**Purpose**: Return paginated list of public courses for client portal browsing

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `skip` | int | `0` | Offset for pagination |
| `limit` | int | `2` | Items per page |

**Response Schema**:
```json
{
  "items": [
    {
      "uuid": "course-abc123",
      "title": "Advanced Order Flow Mastery",
      "description": "Deconstruct market microstructures...",
      "longDescription": "Our signature high-intensity...",
      "price": 499.00,
      "image": "https://example.com/thumb.jpg",
      "category": "Masterclass",
      "features": ["Footprint Charts", "Liquidity Sweep Scanners"],
      "duration": "1 Month",
      "lecturer": "Marcus Vance",
      "difficulty": "Advanced",
      "scheduled_at": "2026-07-15T10:00:00Z",
      "estimated_duration": 120
    }
  ],
  "hasMore": true
}
```

**Backend Implementation** (`courses.py`):
```python
@router.get("/public/courses")
def get_public_courses(skip: int = 0, limit: int = 2, db: Session = Depends(get_db)):
    now = datetime.now()
    five_min_from_now = now + timedelta(minutes=5)

    # Filter: scheduled_at > now + 5 minutes (upcoming courses only)
    query = db.query(Course).filter(
        Course.scheduled_at > five_min_from_now
    ).order_by(Course.scheduled_at.asc())

    total = query.count()
    courses = query.offset(skip).limit(limit).all()

    items = []
    for c in courses:
        items.append({
            "uuid": c.course_id,
            "title": c.title,
            "description": c.description,
            "longDescription": c.long_description or "",
            "price": c.price,
            "image": c.course_thumbnail or c.image or "",
            "category": c.category,
            "features": c.features or [],
            "duration": f"{c.duration_months} Month{'s' if c.duration_months > 1 else ''}",
            "lecturer": c.lecturer,
            "difficulty": c.difficulty,
            "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
            "estimated_duration": c.duration_months * 30 * 24 * 60,  # rough minutes
        })

    return {"items": items, "hasMore": skip + limit < total}
```

**DB Tables Hit**:
- `courses` — `id`, `course_id`, `title`, `description`, `long_description`, `price`, `image`, `course_thumbnail`, `category`, `features`, `duration_months`, `lecturer`, `difficulty`, `scheduled_at`, `purchased_count`

---

## 4. Backend Endpoint #2: `GET /my-purchases`

### EXISTS at `purchases.py:423`

**Auth**: `get_current_user` (JWT Bearer token)

**Response Schema**:
```json
{
  "courses": ["course-abc123", "course-def456"],
  "indicators": ["ind-xyz789"],
  "bots": ["bot-123"]
}
```

**DB Tables Hit**:
- `transactions` — filtered by `username`, `status="completed"`
- `courses` — filtered by `course_id IN (...)`
- `indicators` — filtered by `indicator_id IN (...)`
- `bots` — filtered by `bot_id IN (...)`

---

## 5. Backend Endpoint #3: `GET /search`

### EXISTS at `search.py:26`

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search term (matches title, description) |

**Response Schema**:
```json
[
  {
    "id": "course-abc123",
    "section": "course",
    "title": "Advanced Order Flow Mastery",
    "description": "Deconstruct market microstructures...",
    "price": 499.00,
    "thumbnail": "https://example.com/thumb.jpg",
    "scheduled_at": "2026-07-15T10:00:00Z",
    "estimated_duration": "120",
    "course_link": "https://zoom.us/j/1234567890"
  }
]
```

**DB Tables Hit**:
- `courses` — `LIKE` search on `title`, `description`
- `lessons` (via `CourseSchedule`) — for `scheduled_at` and `course_link`
- `indicators` — `LIKE` search on `title`, `description`
- `bots` — `LIKE` search on `title`, `description`

---

## 6. Backend Endpoint #4: `GET /users/me`

### MISSING — Needs to be created

**Purpose**: Return current logged-in user's profile

**Auth**: `get_current_user` (JWT Bearer token)

**Response Schema**:
```json
{
  "id": 1,
  "username": "marcus_trader",
  "email": "marcus@example.com",
  "firstname": "Marcus",
  "lastname": "Aurelius",
  "tvid": "stoic_trader_tv_99",
  "telegram_user_id": "12345678",
  "discord_user_id": "987654321",
  "phone_number": "+91 98765 43210",
  "avatar": "",
  "is_verified": true,
  "created_at": "2026-01-15T08:30:00Z"
}
```

**Backend Implementation** (`users.py`):
```python
@router.get("/users/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
```

**DB Tables Hit**:
- `users` — single row by `user_id` (from JWT)

---

## 7. Backend Endpoint #5: `POST /purchase`

### MISSING — Needs to be created

**Purpose**: Process a course purchase (create Transaction + upsert CourseMember)

**Auth**: `get_current_user` (JWT Bearer token)

**Request Body**:
```json
{
  "course_id": "course-abc123",
  "amount": 499.00,
  "method": "Card"
}
```

**Response Schema**:
```json
{
  "success": true,
  "message": "Successfully purchased course."
}
```

**Backend Implementation** (`purchases.py`):
```python
@router.post("/purchase")
def purchase_course(
    payload: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate course exists
    course = db.query(Course).filter(Course.course_id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 2. Check if already purchased (re-enrollment = just update expiry)
    existing = db.query(CourseMember).filter(
        CourseMember.username == current_user.UserID,
        CourseMember.course_id == payload.course_id,
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expiry = now + timedelta(days=30)  # 30-day access

    if existing:
        existing.expiry = expiry
    else:
        db.add(CourseMember(
            username=current_user.UserID,
            course_id=payload.course_id,
            expiry=expiry,
        ))
        course.purchased_count = (course.purchased_count or 0) + 1

    # 3. Create transaction record
    txn = Transaction(
        username=current_user.UserID,
        product_section="Course",
        course_id=payload.course_id,
        expiry=expiry,
        amount=payload.amount,
        method=payload.method or "Card",
        status="completed",
    )
    db.add(txn)
    db.commit()

    return {"success": True, "message": "Purchase successful"}
```

**DB Tables Hit**:
- `courses` — read + update `purchased_count`
- `course_members` — upsert (insert or update `expiry`)
- `transactions` — insert new row

---

## 8. Frontend API Layer (`portal/api.ts`)

### Current Mock Implementation (to be replaced):

```typescript
// Line 221-228 — CURRENTLY MOCK
async getCourses(skip: number = 0, limit: number = 2) {
  await delay(400);
  const upcomingCourses = MOCK_COURSES.filter(c =>
    c.scheduled_at && new Date(c.scheduled_at) > fiveMinFromNow
  );
  const items = upcomingCourses.slice(skip, skip + limit);
  return { items, hasMore: skip + limit < upcomingCourses.length };
}
```

### Target Real Implementation:

```typescript
import { API_BASE_URL } from '@/lib/api-fetch';
import { fetchWithAuth } from '@/lib/api-fetch';

async getCourses(skip: number = 0, limit: number = 2) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/public/courses?skip=${skip}&limit=${limit}`
  );
  if (!res.ok) throw new Error("Failed to fetch courses");
  return res.json(); // { items: Course[], hasMore: boolean }
}
```

---

## 9. Type Mapping — Frontend ↔ Backend

### Frontend `Course` type (`types/portal.ts`):
```typescript
interface Course {
  uuid: string;           // ← backend: course_id (string)
  title: string;          // ← backend: title
  description: string;    // ← backend: description
  longDescription: string;// ← backend: long_description
  price: number;          // ← backend: price (float)
  image: string;          // ← backend: course_thumbnail or image
  category: string;       // ← backend: category
  features: string[];     // ← backend: features (JSON array)
  duration: string;       // ← backend: duration_months (int → "1 Month")
  lecturer: string;       // ← backend: lecturer
  difficulty: string;     // ← backend: difficulty
  scheduled_at?: string;  // ← backend: scheduled_at (datetime → ISO string)
  estimated_duration?: number; // ← backend: calculated from duration_months
}
```

### Backend `Course` model fields:
| DB Column | Type | Frontend Field |
|-----------|------|----------------|
| `id` | Integer PK | not exposed (use `course_id`) |
| `course_id` | String(50) unique | `uuid` |
| `title` | String(255) | `title` |
| `description` | Text | `description` |
| `long_description` | Text nullable | `longDescription` |
| `price` | Float | `price` |
| `image` | Text nullable | `image` (fallback) |
| `course_thumbnail` | String(255) nullable | `image` (primary) |
| `category` | String(100) | `category` |
| `features` | JSON nullable | `features` |
| `duration_months` | Integer | `duration` (converted to string) |
| `lecturer` | String(255) | `lecturer` |
| `difficulty` | String(50) | `difficulty` |
| `scheduled_at` | DateTime nullable | `scheduled_at` |
| `purchased_count` | Integer | not exposed to client |
| `status` | String(50) | not exposed to client |
| `created_at` | DateTime | not exposed to client |
| `updated_at` | DateTime | not exposed to client |

---

## 10. Auth Flow

### JWT Token Requirements:
All client portal API calls require JWT Bearer token in `Authorization` header.

**Token Payload**:
```json
{
  "sub": "marcus_trader",   // UserID (username)
  "role": "user",
  "exp": 1234567890
}
```

**`get_current_user` dependency** (`app/core/deps.py`):
- Extracts token from `Authorization: Bearer <token>`
- Decodes JWT → looks up `User.UserID == token.sub`
- Returns `User` object or raises 401

---

## 11. Complete Request/Response Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT PORTAL                            │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ AppCtx   │  │ CoursesPage  │  │ ProductDetailModal       │  │
│  │ onMount  │  │ onMount      │  │ onProductClick           │  │
│  └────┬─────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│       │               │                        │                │
│       ▼               ▼                        ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    portal/api.ts                          │   │
│  │  API.getProfile()                                        │   │
│  │  API.getPurchasedIds()                                   │   │
│  │  API.getCourses(skip, limit)                             │   │
│  └───────────────────────┬──────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │  HTTP (JWT Bearer)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND API                               │
│                                                                  │
│  GET /users/me              → users.py        → User table       │
│  GET /my-purchases          → purchases.py    → Transaction +    │
│                                                  Course/Ind/Bot  │
│  GET /public/courses        → courses.py      → Course table     │
│  GET /search                → search.py       → Course+Ind+Bot   │
│  POST /purchase             → purchases.py    → Transaction +    │
│                                                  CourseMember +  │
│                                                  Course table    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. Summary — What Needs to Be Built

| # | Endpoint | Method | File | Priority |
|---|----------|--------|------|----------|
| 1 | `GET /public/courses` | GET | `courses.py` | 🔴 HIGH — core page data |
| 2 | `GET /users/me` | GET | `users.py` | 🔴 HIGH — user profile |
| 3 | `POST /purchase` | POST | `purchases.py` | 🔴 HIGH — checkout flow |
| 4 | `GET /my-expirations` | GET | `purchases.py` | 🟡 MEDIUM — library page |
| 5 | `GET /my-lessons` | GET | `courses.py` | 🟡 MEDIUM — library page |
| 6 | `GET /my-transactions` | GET | `purchases.py` | 🟡 MEDIUM — history page |
| 7 | Frontend `api.ts` rewrite | — | `portal/api.ts` | 🔴 HIGH — wire all calls |

---

## 13. Files to Modify

### Backend:
- `backend/app/routers/courses.py` — Add `GET /public/courses`
- `backend/app/routers/users.py` — Add `GET /users/me`
- `backend/app/routers/purchases.py` — Add `POST /purchase`
- `backend/app/schemas/course.py` — Add `PublicCoursesResponse` schema

### Frontend:
- `frontend/src/portal/api.ts` — Replace mock calls with real `fetchWithAuth`
- `frontend/src/types/portal.ts` — No changes needed (types already match)

---

## 14. Response Shape Comparison

### Mock (current) vs Real (target):

**`API.getCourses(0, 2)` response**:
```json
// CURRENT (mock)
{
  "items": [/* MOCK_COURSES objects */],
  "hasMore": true
}

// TARGET (real)
{
  "items": [
    {
      "uuid": "CRS-001",
      "title": "Advanced Order Flow Mastery",
      "description": "Deconstruct market microstructures...",
      "longDescription": "Our signature high-intensity...",
      "price": 499.00,
      "image": "/thumbnail/crs-001.jpg",
      "category": "Masterclass",
      "features": ["Footprint Charts", "Liquidity Sweep Scanners"],
      "duration": "1 Month",
      "lecturer": "Marcus Vance",
      "difficulty": "Advanced",
      "scheduled_at": "2026-07-15T10:00:00Z",
      "estimated_duration": 43200
    }
  ],
  "hasMore": true
}
```

**Key difference**: `uuid` field maps to `course_id` string in DB (not integer `id`). `image` prefers `course_thumbnail` over `image`. `duration` is derived from `duration_months`.
