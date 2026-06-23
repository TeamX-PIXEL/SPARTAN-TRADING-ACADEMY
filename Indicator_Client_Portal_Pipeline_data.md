# Indicators Client Portal Pipeline

## Page: `/portal/indicators` — Browse All Indicators (Paginated)

---

## 1. PAGE INITIALIZATION FLOW

```
AppProvider (AppContext.tsx)
  ├─ useEffect #1: API.getProfile()           → GET /users/me
  ├─ useEffect #2: API.getPurchasedIds()       → GET /my-purchases
  ├─ useEffect #2: API.getLibrary()            → GET /my-library
  │
  └─ IndicatorsPage (indicators/page.tsx)
       └─ useEffect: API.getIndicators(0, 2)  → GET /public/indicators?skip=0&limit=2
```

### Timeline (what fires on page load)

| Order | Component | API Call | Backend Endpoint | Purpose |
|-------|-----------|----------|------------------|---------|
| 1 | AppContext | `API.getProfile()` | `GET /users/me` | Load user profile |
| 2 | AppContext | `API.getPurchasedIds()` | `GET /my-purchases` | Load purchased indicator IDs |
| 3 | AppContext | `API.getLibrary()` | `GET /my-library` | Load full library objects |
| 4 | IndicatorsPage | `API.getIndicators(0, 2)` | `GET /public/indicators?skip=0&limit=2` | Load first page of indicators |

---

## 2. API CALL #1 — Load Profile

### Request
```
GET /users/me
Authorization: Bearer <token>
```

### Backend Handler
**File:** `backend/app/routers/auth.py:94`
```python
@router.get("/users/me", response_model=UserResponse)
def get_current_user_endpoint(current_user: User = Depends(get_current_user)):
    return current_user
```

### Response
```json
{
  "id": 1,
  "name": "Marcus Aurelius",
  "email": "marcus.a@stoic-trader.com",
  "avatar": "https://images.unsplash.com/...",
  "tvid": "stoic_trader_tv_99",
  "telegramid": "@stoic_trader",
  "discordid": "@stoic_discord_99",
  "firstname": "Marcus",
  "lastname": "Aurelius",
  "username": "stoic_trader",
  "phone_number": "+91-9876543210",
  "notificationsEnabled": true,
  "marketingEmails": false,
  "compactMode": false,
  "themeColor": "#3b82f6"
}
```

### Frontend Storage
```typescript
// AppContext.tsx
setUser(profile);  // → stores in AppContext state
```

---

## 3. API CALL #2 — Load Purchased IDs

### Request
```
GET /my-purchases
Authorization: Bearer <token>
```

### Backend Handler
**File:** `backend/app/routers/purchases.py:423`
```python
@router.get("/my-purchases")
def get_my_purchases(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    courses = [c.course_id for c in db.query(CourseMember).filter(CourseMember.username == current_user.UserID).all()]
    indicators = [i.indicator_id for i in db.query(IndicatorMember).filter(IndicatorMember.username == current_user.UserID).all()]
    bots = [b.bot_id for b in db.query(BotMember).filter(BotMember.username == current_user.UserID).all()]
    return {"courses": courses, "indicators": indicators, "bots": bots}
```

### Response
```json
{
  "courses": ["course-4"],
  "indicators": [],
  "bots": ["bot-2"]
}
```

### Frontend Storage
```typescript
// AppContext.tsx
setPurchasedIds(ids);  // → stored in AppContext
// accessed as: purchasedIds.indicators → ["ind-1", ...]
```

---

## 4. API CALL #3 — Load Library

### Request
```
GET /my-library
Authorization: Bearer <token>
```

### Backend Handler
**File:** `backend/app/routers/purchases.py:452`
```python
@router.get("/my-library")
def get_my_library(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Joins member tables with product tables to return full objects
    courses = [...]    # List[CourseResponse]
    indicators = [...] # List[IndicatorResponse]
    bots = [...]       # List[BotResponse]
    return {"courses": courses, "indicators": indicators, "bots": bots}
```

### Response
```json
{
  "courses": [
    {
      "course_id": "course-4",
      "title": "The Scalping Blueprint: 5m Trend Crushing",
      "description": "High-probability scalp entries...",
      "price": 199,
      "image": "https://picsum.photos/seed/scalp/600/400",
      "category": "Price Action",
      "features": ["5-Minute Volume Delta Analyzer", "..."],
      "duration": "1 Month",
      "lecturer": "Marcus Vance",
      "difficulty": "Beginner",
      "scheduled_at": "2026-06-09T05:27:53",
      "estimated_duration": 120
    }
  ],
  "indicators": [],
  "bots": [
    {
      "bot_id": "bot-2",
      "title": "Trend-Rider EMA Breakout AutoBot",
      "description": "Auto-executes momentum breakouts...",
      "price": 199,
      "image": "https://picsum.photos/seed/bot2/600/400",
      "category": "Systematic Swing",
      "features": ["Dynamic trailing take-profit lock", "..."],
      "exchange": "Bybit, Kraken",
      "apy": "89.1%"
    }
  ]
}
```

### Frontend Storage
```typescript
// AppContext.tsx
setLibrary(libData);  // → stored in AppContext
```

---

## 5. API CALL #4 — Load Indicators (paginated)

### Request
```
GET /public/indicators?skip=0&limit=2
Authorization: Bearer <token>
```

### Backend Handler
**⚠️ DOES NOT EXIST YET — needs to be created**

Currently only admin endpoint exists:
**File:** `backend/app/routers/indicators.py:51`
```python
@router.get("/api/admin/indicators", response_model=PaginatedIndicatorsResponse)
def list_indicators(skip: int, limit: int, db, current_admin):
    # Requires admin auth — NOT public
```

### Frontend API Method
**File:** `frontend/src/portal/api.ts:234`
```typescript
async getIndicators(skip: number = 0, limit: number = 2): Promise<{ items: Indicator[]; hasMore: boolean }> {
    await delay(400);
    const items = MOCK_INDICATORS.slice(skip, skip + limit);  // ← MOCK DATA
    const hasMore = skip + limit < MOCK_INDICATORS.length;
    return { items, hasMore };
}
```

### Expected Response (when backend is built)
```json
{
  "items": [
    {
      "id": "ind-1",
      "title": "DealDeck Liquidity Radar",
      "description": "Bridges institutional dark pool orders...",
      "longDescription": "The definitive indicator to locate...",
      "price": 150,
      "category": "Scripts",
      "image": "https://picsum.photos/seed/radar/600/400",
      "features": [
        "Real-time institutional liquidity bars",
        "Dark pool sweep alerts",
        "TradingView Pine Script v5 optimized code",
        "Multitimeframe sweep metrics"
      ],
      "scriptType": "Pine Script (v5)",
      "accuracy": "84.2%",
      "timeframe": "1m, 5m, 15m, 1h"
    }
  ],
  "hasMore": true
}
```

### Frontend State
```typescript
// indicators/page.tsx
const [indicators, setIndicators] = useState<Indicator[]>([]);
const [skip, setSkip] = useState<number>(0);
const [hasMore, setHasMore] = useState<boolean>(true);

// On load:
setIndicators(res.items);      // → first 2 indicators
setSkip(limit);                 // → skip=2 for next page
setHasMore(res.hasMore);       // → true (more available)

// On scroll:
setIndicators(prev => [...prev, ...newItems]);  // → append new items
setSkip(prev => prev + limit);                   // → skip=4 for next page
```

---

## 6. INFINITE SCROLL PAGINATION

### Trigger
```typescript
// indicators/page.tsx:62-78
useEffect(() => {
  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {  // 200px from bottom
      fetchMoreIndicators();
    }
  };
  element.addEventListener('scroll', handleScroll);
}, [skip, hasMore, isLoadingMore]);
```

### Request
```
GET /public/indicators?skip=2&limit=2
```

### Response (page 2)
```json
{
  "items": [
    {
      "id": "ind-3",
      "title": "Smart Money Flow Analyzer",
      "description": "Tracks institutional order flow...",
      "price": 175,
      "category": "Flow Analysis",
      "image": "https://picsum.photos/seed/flow/600/400",
      "features": ["...", "..."],
      "scriptType": "Pine Script (v5)",
      "accuracy": "87.5%",
      "timeframe": "5m, 15m, 1h, 4h"
    }
  ],
  "hasMore": false
}
```

### Deduplication
```typescript
// indicators/page.tsx:47-51
setIndicators(prev => {
  const existingIds = new Set(prev.map(i => i.id));
  const newItems = res.items.filter(i => !existingIds.has(i.id));
  return [...prev, ...newItems];
});
```

---

## 7. PRODUCT CARD RENDERING

### Component
**File:** `frontend/src/components/portal/ProductCard.tsx`

### Props
```typescript
interface ProductCardProps {
  product: Product;         // Indicator object from API
  type: ProductType;        // "indicator"
  purchased: boolean;       // purchasedIds.indicators.includes(ind.id)
  onOpenDetails: (id: string) => void;  // → opens ProductDetailModal
}
```

### Render Logic
```typescript
// indicators/page.tsx:128-136
{indicators.map((ind) => (
  <ProductCard
    key={ind.id}                              // → "ind-1"
    product={ind}                             // → Indicator object
    type="indicator"                          // → static string
    purchased={purchasedIds.indicators.includes(ind.id)}  // → boolean
    onOpenDetails={openProduct}               // → sets URL param ?product=ind-1
  />
))}
```

### Card Features (indicator-specific)
```typescript
// ProductCard.tsx:117-121
{type === 'indicator' && (product as Indicator).accuracy && (
  <div className="absolute top-4 right-4 bg-emerald-900/60 backdrop-blur-md ...">
    Accuracy: {(product as Indicator).accuracy}
  </div>
)}
```

### Card Footer
- **If purchased:** Shows "Activated inside Portal" badge + "Manage" button
- **If not purchased:** Shows price + "Add to Cart" button
- **Add to Cart:** Calls `addToCart({ id: product.id, title, price, image, type: "indicator" })`

---

## 8. PRODUCT DETAIL MODAL

### Trigger
```typescript
// indicators/page.tsx:81-85
const openProduct = (id: string) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('product', id);   // → URL: /portal/indicators?product=ind-1
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
};
```

### Modal Component
**File:** `frontend/src/components/portal/ProductDetailModal.tsx`

### Product Lookup (MOCK — needs rewrite)
```typescript
// ProductDetailModal.tsx:39-57
const course = MOCK_COURSES.find(c => c.id === productUuid);    // → searches MOCK data
const indicator = MOCK_INDICATORS.find(i => i.id === productUuid);  // ← THIS ONE
const bot = MOCK_BOTS.find(b => b.id === productUuid);
```

### Indicator-Specific Display
```typescript
// ProductDetailModal.tsx:257-279
{productType === 'indicator' && (
  <>
    <div className="grid grid-cols-2 gap-4 font-mono">
      <div>Script Target: {(product as Indicator).scriptType}</div>
      <div>Recommended Bar: {(product as Indicator).timeframe}</div>
    </div>
  </>
)}
```

### Purchase Check
```typescript
// ProductDetailModal.tsx:49
bought = purchasedIds.indicators.includes(productUuid);
```

### Add to Cart from Modal
```typescript
// ProductDetailModal.tsx:85-93
const handleAddToCart = () => {
  addToCart({
    id: product.id,
    title: product.title,
    price: product.price,
    image: product.image,
    type: productType,  // "indicator"
  });
};
```

---

## 9. CART & CHECKOUT FLOW

### Add to Cart
```typescript
// AppContext.tsx:252-257
const addToCart = (item: CartItem) => {
  setCart((prev) => {
    if (prev.some((c) => c.id === item.id)) return prev;
    return [...prev, item];
  });
};
// Cart stored in localStorage: dealdeck_cart
```

### Checkout (when "Secure Checkout" clicked)
```typescript
// AppContext.tsx:283-306
const checkout = async () => {
  for (const item of cart) {
    await API.purchaseItem(item);  // → POST /purchase (per item)
  }
  clearCart();
  await refreshLibrary();  // → re-fetches purchasedIds + library + expirations
};
```

### API.purchaseItem
```typescript
// api.ts:324-373
async purchaseItem(item: CartItem): Promise<{ success: boolean; message: string }> {
    // 1. Check TVID exists
    // 2. Add to purchased list
    // 3. Set expiration (30 days for indicators/bots)
    // 4. Create transaction record
    // → All localStorage-based (MOCK)
}
```

### Backend Endpoint (needs building)
```
POST /purchase
Authorization: Bearer <token>
Body: {
  "product_section": "Indicator",
  "product_id": "ind-1",
  "amount": 150,
  "method": "Card"
}
```

### After Checkout
```typescript
// AppContext.tsx:294
await refreshLibrary();
// → re-calls API.getPurchasedIds() + API.getLibrary() + API.getExpirations()
// → updates purchasedIds.indicators to include new indicator
// → ProductCard now shows "Activated inside Portal"
```

---

## 10. SEARCH FLOW (when typing in search bar)

### Trigger
```typescript
// layout.tsx:96-101
{searchQuery.trim() !== "" ? (
  <SearchResults query={searchQuery} onOpenProduct={handleOpenProductDetail} />
) : (
  children  // ← shows IndicatorsPage
)}
```

### Search Component
**File:** `frontend/src/components/portal/SearchResults.tsx`

### API Call
```typescript
// SearchResults.tsx:24-41
const results = await API.searchCatalog(query);
// → MOCK: filters MOCK_INDICATORS by title/description/category
```

### Backend Endpoint
```
GET /search?q=liquidity
```

**File:** `backend/app/routers/search.py:26`
```python
@router.get("/search", response_model=List[SearchResult])
def search_all(q: str = "", db: Session = Depends(get_db)):
    indicators = db.query(Indicator).filter(
        or_(Indicator.title.ilike(search_term), Indicator.description.ilike(search_term))
    ).all()
    return results  # → [{ id: "ind-1", section: "indicator", title: "...", ... }]
```

### Response
```json
[
  {
    "id": "ind-1",
    "section": "indicator",
    "title": "DealDeck Liquidity Radar",
    "description": "Bridges institutional dark pool orders...",
    "price": 150,
    "thumbnail": "https://picsum.photos/seed/radar/600/400"
  }
]
```

### Search Results Rendering
```typescript
// SearchResults.tsx:100-117
{indicators.map(ind => (
  <ProductCard
    key={ind.id}
    product={ind}
    type="indicator"
    purchased={purchasedIds.indicators.includes(ind.id)}
    onOpenDetails={onOpenProduct}
  />
))}
```

---

## 11. ENROLLMENT STATUS CHECK

### When Used
When user clicks "Manage" on a purchased indicator card.

### API Call
```
GET /api/enrollment-status/{indicator_id}
```

**File:** `backend/app/routers/purchases.py:388`
```python
@router.get("/api/enrollment-status/{product_id}")
def get_enrollment_status(product_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Checks indicator_members or course_members table
    # Returns completion status + timeline
```

### Response
```json
{
  "completedPercent": 25,
  "status": "enrolled",
  "timeline": [
    { "label": "Indicator License Activated", "completed": true, "desc": "..." },
    { "label": "TradingView Sync", "completed": true, "desc": "..." },
    { "label": "Live Monitoring Active", "completed": false, "current": true, "desc": "..." },
    { "label": "Monthly Review", "completed": false, "desc": "..." }
  ]
}
```

---

## 12. EXPIRATION TRACKING

### Load Expirations
```typescript
// AppContext.tsx:274
const expData = await API.getExpirations();
setExpirations(expData);
// → Record<string, string> — key is indicator_id, value is ISO date
```

### Backend Endpoint (needs building)
```
GET /my-expirations
Authorization: Bearer <token>
```

### Response
```json
{
  "ind-1": "2026-07-12T22:27:53.000Z",
  "bot-2": "2026-07-12T22:27:53.000Z"
}
```

### Usage in Library
```typescript
// library/page.tsx
const expiry = expirations[ind.id];  // → "2026-07-12T22:27:53.000Z"
```

---

## 13. RENEWAL FLOW

### Trigger
User clicks "Renew" on an indicator in the library with expired/expiring access.

### API Call
```
POST /renew
Authorization: Bearer <token>
Body: {
  "product_id": "ind-1",
  "duration_days": 365
}
```

**File:** `backend/app/routers/purchases.py` (needs building)

### Response
```json
{
  "success": true,
  "expiration": "2027-06-21T22:27:53.000Z"
}
```

---

## 14. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INDICATORS PAGE LOAD                         │
└─────────────────────────────────────────────────────────────────────┘

  Browser                              Backend                      Database
    │                                      │                            │
    │  GET /users/me                       │                            │
    │─────────────────────────────────────>│  SELECT * FROM users       │
    │                                      │───────────────────────────>│
    │  { id, name, email, tvid, ... }     │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-purchases                   │                            │
    │─────────────────────────────────────>│  SELECT indicator_id FROM  │
    │                                      │  indicator_members WHERE   │
    │                                      │  username = current_user   │
    │                                      │───────────────────────────>│
    │  { courses: [...], indicators: [...],│                            │
    │    bots: [...] }                     │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-library                     │                            │
    │─────────────────────────────────────>│  SELECT i.* FROM           │
    │                                      │  indicator_members im      │
    │                                      │  JOIN indicators i ON ...  │
    │                                      │───────────────────────────>│
    │  { courses: [...], indicators: [...],│                            │
    │    bots: [...] }                     │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /public/indicators?skip=0&limit=2                          │
    │─────────────────────────────────────>│  SELECT * FROM indicators  │
    │                                      │  WHERE status != 'draft'  │
    │                                      │  OFFSET 0 LIMIT 2         │
    │                                      │───────────────────────────>│
    │  { items: [ind1, ind2], hasMore: true }                          │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER: ProductCard × 2                              │        │
    │  │  • ind.id → "ind-1"                                  │        │
    │  │  • purchasedIds.indicators.includes(ind.id) → false  │        │
    │  │  • Shows price + Add to Cart button                  │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user scrolls to bottom)            │                            │
    │                                      │                            │
    │  GET /public/indicators?skip=2&limit=2                          │
    │─────────────────────────────────────>│  SELECT * FROM indicators  │
    │                                      │  OFFSET 2 LIMIT 2         │
    │                                      │───────────────────────────>│
    │  { items: [ind3], hasMore: false }   │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER: ProductCard × 3 (appended)                   │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user clicks ind-1 card)            │                            │
    │                                      │                            │
    │  URL: /portal/indicators?product=ind-1                           │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER: ProductDetailModal                           │        │
    │  │  • Looks up product from MOCK_INDICATORS              │        │
    │  │  • Shows scriptType, timeframe, features, price      │        │
    │  │  • Shows "Add to Cart" button                        │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user clicks "Add to Cart")         │                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ AppContext.addToCart({                                │        │
    │  │   id: "ind-1",                                       │        │
    │  │   title: "DealDeck Liquidity Radar",                 │        │
    │  │   price: 150,                                        │        │
    │  │   image: "...",                                      │        │
    │  │   type: "indicator"                                  │        │
    │  │ })                                                   │        │
    │  │ → Stored in localStorage: dealdeck_cart              │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user opens cart & clicks "Secure Checkout")                    │
    │                                      │                            │
    │  POST /purchase                      │                            │
    │─────────────────────────────────────>│  INSERT INTO               │
    │  { product_section: "Indicator",     │  indicator_members         │
    │    product_id: "ind-1",              │  (username, indicator_id,  │
    │    amount: 150,                      │   expiry, joined_at)      │
    │    method: "Card" }                  │                            │
    │                                      │  INSERT INTO transactions  │
    │                                      │───────────────────────────>│
    │  { success: true }                   │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-purchases (re-fetch)        │                            │
    │─────────────────────────────────────>│                            │
    │  { indicators: ["ind-1"] }           │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-library (re-fetch)          │                            │
    │─────────────────────────────────────>│                            │
    │  { indicators: [{ indicator_id: "ind-1", ... }] }                │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ Re-render: ProductCard now shows                     │        │
    │  │  "Activated inside Portal" + "Manage" button         │        │
    │  └──────────────────────────────────────────────────────┘        │
```

---

## 15. BACKEND ENDPOINTS SUMMARY

### ✅ Already Exist

| Endpoint | Method | Auth | File | Purpose |
|---|---|---|---|---|
| `GET /users/me` | GET | User | `auth.py:94` | User profile |
| `GET /my-purchases` | GET | User | `purchases.py:423` | Purchased IDs |
| `GET /my-library` | GET | User | `purchases.py:452` | Full library objects |
| `GET /search?q=` | GET | None | `search.py:26` | Unified search |
| `GET /api/enrollment-status/{id}` | GET | User | `purchases.py:388` | Enrollment status |

### ❌ Needs to Be Built

| Endpoint | Method | Auth | Request Body | Response | Purpose |
|---|---|---|---|---|---|
| `GET /public/indicators` | GET | User | `?skip=0&limit=2` | `{ items: Indicator[], hasMore: bool }` | Paginated indicator listing |
| `POST /purchase` | POST | User | `{ product_section, product_id, amount, method }` | `{ success: bool }` | Process purchase |
| `GET /my-expirations` | GET | User | — | `{ "ind-1": "2027-06-21T..." }` | Product expirations |
| `POST /renew` | POST | User | `{ product_id, duration_days }` | `{ success, expiration }` | Renew license |

---

## 16. MOCK DATA → REAL BACKEND FIELD MAPPING

| Frontend Field | Mock Value | Backend DB Column | Type |
|---|---|---|---|
| `id` | `"ind-1"` | `indicators.indicator_id` | `str` (business key) |
| `title` | `"DealDeck Liquidity Radar"` | `indicators.title` | `str` |
| `description` | `"Bridges institutional..."` | `indicators.description` | `str` |
| `longDescription` | `"The definitive indicator..."` | `indicators.long_description` | `str` |
| `price` | `150` | `indicators.price` | `float` |
| `category` | `"Scripts"` | `indicators.category` | `str` |
| `image` | `"https://picsum.photos/..."` | `indicators.image` | `str` |
| `features` | `["..."]` | `indicators.features` | `list[str]` |
| `scriptType` | `"Pine Script (v5)"` | `indicators.script_type` | `str` |
| `accuracy` | `"84.2%"` | `indicators.accuracy` | `str` |
| `timeframe` | `"1m, 5m, 15m, 1h"` | `indicators.timeframe` | `str` |
| — | — | `indicators.id` | `int` (auto PK, not exposed) |
| — | — | `indicators.purchased_count` | `int` |
| — | — | `indicators.status` | `str` |
| — | — | `indicators.created_at` | `datetime` |
| — | — | `indicators.updated_at` | `datetime` |

---

## 17. REMAINING MOCK CALLS TO REWRITE

| File | Function | Current (MOCK) | Target (Real) |
|---|---|---|---|
| `portal/api.ts:234` | `getIndicators()` | `MOCK_INDICATORS.slice()` | `GET /public/indicators?skip=&limit=` |
| `portal/api.ts:267` | `getPurchasedIds()` | `localStorage` | `GET /my-purchases` |
| `portal/api.ts:273` | `getLibrary()` | `MOCK_COURSES.filter()` | `GET /my-library` |
| `portal/api.ts:284` | `getEnrollmentStatus()` | `MOCK logic` | `GET /api/enrollment-status/{id}` |
| `portal/api.ts:324` | `purchaseItem()` | `localStorage` | `POST /purchase` |
| `portal/api.ts:397` | `getExpirations()` | `localStorage` | `GET /my-expirations` |
| `portal/api.ts:403` | `renewProduct()` | `localStorage` | `POST /renew` |
| `ProductDetailModal.tsx:39` | Product lookup | `MOCK_INDICATORS.find()` | Cache from API or fetch by ID |
