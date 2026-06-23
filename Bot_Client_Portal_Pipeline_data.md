# Bots Client Portal Pipeline

## Page: `/portal/alerts` — Browse All Bots (Paginated)

---

## 1. PAGE INITIALIZATION FLOW

```
AppProvider (AppContext.tsx)
  ├─ useEffect #1: API.getProfile()           → GET /users/me
  ├─ useEffect #2: API.getPurchasedIds()       → GET /my-purchases
  ├─ useEffect #2: API.getLibrary()            → GET /my-library
  │
  └─ AlertsPage (alerts/page.tsx)
       └─ useEffect: API.getBots(0, 2)         → GET /public/bots?skip=0&limit=2
```

### Timeline (what fires on page load)

| Order | Component | API Call | Backend Endpoint | Purpose |
|-------|-----------|----------|------------------|---------|
| 1 | AppContext | `API.getProfile()` | `GET /users/me` | Load user profile |
| 2 | AppContext | `API.getPurchasedIds()` | `GET /my-purchases` | Load purchased bot IDs |
| 3 | AppContext | `API.getLibrary()` | `GET /my-library` | Load full library objects |
| 4 | AlertsPage | `API.getBots(0, 2)` | `GET /public/bots?skip=0&limit=2` | Load first page of bots |

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
    txns = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
        Transaction.status == "completed",
    ).all()
    bot_ids = [t.bot_id for t in txns if t.product_section == "Bot" and t.bot_id]
    bots = db.query(Bot.bot_id).filter(Bot.bot_id.in_(bot_ids)).all() if bot_ids else []
    return {"courses": [...], "indicators": [...], "bots": [b[0] for b in bots]}
```

### Response
```json
{
  "courses": [],
  "indicators": [],
  "bots": ["bot-2"]
}
```

### Frontend Storage
```typescript
// AppContext.tsx
setPurchasedIds(ids);  // → stored in AppContext
// accessed as: purchasedIds.bots → ["bot-2", ...]
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
    # Joins bot_members with bots table to return full Bot objects
    bots = []
    if bot_ids:
        bot_objs = db.query(Bot).filter(Bot.bot_id.in_(bot_ids)).all()
        for b in bot_objs:
            member = db.query(BotMember).filter(
                BotMember.username == current_user.UserID,
                BotMember.bot_id == b.bot_id,
            ).first()
            txn = db.query(Transaction).filter(
                Transaction.username == current_user.UserID,
                Transaction.bot_id == b.bot_id,
            ).order_by(Transaction.created_at.desc()).first()
            bots.append({
                "id": b.id,
                "bot_id": b.bot_id,
                "name": b.title,
                "description": b.description,
                "thumbnail": b.image,
                "expiry": member.expiry.isoformat() if member and member.expiry else (
                    txn.expiry.isoformat() if txn and txn.expiry else None
                ),
                "purchased_at": txn.created_at.isoformat() if txn else None,
            })
    return {"courses": [...], "indicators": [...], "bots": bots}
```

### Response
```json
{
  "courses": [],
  "indicators": [],
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

### Frontend Storage
```typescript
// AppContext.tsx
setLibrary(libData);  // → stored in AppContext
```

---

## 5. API CALL #4 — Load Bots (paginated)

### Request
```
GET /public/bots?skip=0&limit=2
Authorization: Bearer <token>
```

### Backend Handler
**File:** `backend/app/routers/bots.py:187` ✅ **EXISTS**
```python
@router.get("/public/bots", response_model=List[BotPublicResponse])
def get_public_bots(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    bots = db.query(Bot).filter(Bot.status == "Running").offset(skip).limit(limit).all()
    return bots
```

### Backend Response Schema
**File:** `backend/app/schemas/bot.py:48`
```python
class BotPublicResponse(BotBase):
    id: int
    is_purchased: bool = False
    expiry: Optional[datetime] = None
```

### Frontend API Method
**File:** `frontend/src/portal/api.ts:242`
```typescript
async getBots(skip: number = 0, limit: number = 2): Promise<{ items: Bot[]; hasMore: boolean }> {
    await delay(400);
    const items = MOCK_BOTS.slice(skip, skip + limit);  // ← MOCK DATA
    const hasMore = skip + limit < MOCK_BOTS.length;
    return { items, hasMore };
}
```

### Expected Response (from real backend)
```json
[
  {
    "id": 2,
    "bot_id": "bot-2",
    "title": "Trend-Rider EMA Breakout AutoBot",
    "description": "Auto-executes momentum breakouts across the top 15 highest-volume altcoins. Perfect for passive systematic swing traders.",
    "long_description": "Monitors custom triple exponential moving average cross structures on a server-side engine. Triggers automated market entries and trailing stops based on real-time relative strength metrics.",
    "price": 199,
    "image": "https://picsum.photos/seed/bot2/600/400",
    "category": "Systematic Swing",
    "features": [
      "Dynamic trailing take-profit lock",
      "Staggered position-sizing scaling ladder",
      "Maximum drawndown protection lock (3%)",
      "One-click sync with TradingView Webhooks"
    ],
    "exchange": "Bybit, Kraken",
    "apy": "89.1%",
    "status": "Running",
    "is_purchased": false,
    "expiry": null
  }
]
```

### Frontend State
```typescript
// alerts/page.tsx
const [bots, setBots] = useState<Bot[]>([]);
const [skip, setSkip] = useState<number>(0);
const [hasMore, setHasMore] = useState<boolean>(true);

// On load:
setBots(res.items);          // → first 2 bots
setSkip(limit);              // → skip=2 for next page
setHasMore(res.hasMore);     // → true (more available)

// On scroll:
setBots(prev => [...prev, ...newItems]);  // → append new bots
setSkip(prev => prev + limit);            // → skip=4 for next page
```

---

## 6. INFINITE SCROLL PAGINATION

### Trigger
```typescript
// alerts/page.tsx:61-79
useEffect(() => {
  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {  // 200px from bottom
      fetchMoreBots();
    }
  };
  element.addEventListener('scroll', handleScroll);
}, [skip, hasMore, isLoadingMore]);
```

### Request
```
GET /public/bots?skip=2&limit=2
```

### Response (page 2)
```json
[
  {
    "id": 1,
    "bot_id": "bot-1",
    "title": "Delta Drift Grid Executer",
    "description": "Dynamically updates grid widths using real-time Average True Range (ATR) fluctuations. High-performance stablecoin channel generator.",
    "price": 250,
    "image": "https://picsum.photos/seed/bot1/600/400",
    "category": "Grid Execution",
    "features": [
      "ATR-weighted multi-tier margins",
      "Emergency volatility circuit breaker",
      "Auto-hedging spot collateral mode",
      "Telegram instant webhook reporter"
    ],
    "exchange": "Binance, Bybit, OKX",
    "apy": "112.4%",
    "status": "Running",
    "is_purchased": false,
    "expiry": null
  }
]
```

### Deduplication
```typescript
// alerts/page.tsx:47-51
setBots(prev => {
  const existingIds = new Set(prev.map(b => b.id));
  const newItems = res.items.filter(b => !existingIds.has(b.id));
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
  product: Product;         // Bot object from API
  type: ProductType;        // "bot"
  purchased: boolean;       // purchasedIds.bots.includes(bot.id)
  onOpenDetails: (id: string) => void;  // → opens ProductDetailModal
}
```

### Render Logic
```typescript
// alerts/page.tsx:128-136
{bots.map((bot) => (
  <ProductCard
    key={bot.id}                              // → "bot-2"
    product={bot}                             // → Bot object
    type="bot"                                // → static string
    purchased={purchasedIds.bots.includes(bot.id)}  // → boolean
    onOpenDetails={openProduct}               // → sets URL param ?product=bot-2
  />
))}
```

### Card Features (bot-specific)
```typescript
// ProductCard.tsx:123-129
{type === 'bot' && (product as Bot).apy && (
  <div className="absolute top-4 right-4 bg-blue-900/60 backdrop-blur-md ...">
    <Sparkles className="w-3 h-3 text-blue-400" />
    <span>{(product as Bot).apy} APY</span>
  </div>
)}
```

### Card Footer
- **If purchased:** Shows "Activated inside Portal" badge + "Manage" button
- **If not purchased:** Shows price + "Add to Cart" button
- **Add to Cart:** Calls `addToCart({ id: product.id, title, price, image, type: "bot" })`

---

## 8. PRODUCT DETAIL MODAL

### Trigger
```typescript
// alerts/page.tsx:81-85
const openProduct = (id: string) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('product', id);   // → URL: /portal/alerts?product=bot-2
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
};
```

### Modal Component
**File:** `frontend/src/components/portal/ProductDetailModal.tsx`

### Product Lookup (MOCK — needs rewrite)
```typescript
// ProductDetailModal.tsx:51-56
const bot = MOCK_BOTS.find(b => b.id === productUuid);  // ← searches MOCK data
```

### Bot-Specific Display
```typescript
// ProductDetailModal.tsx:281-303
{productType === 'bot' && (
  <>
    <div className="grid grid-cols-2 gap-4 font-mono">
      <div>Target Exchange: {(product as Bot).exchange}</div>
      <div>Historical Return APY: {(product as Bot).apy}</div>
    </div>
  </>
)}
```

### Purchase Check
```typescript
// ProductDetailModal.tsx:55
bought = purchasedIds.bots.includes(productUuid);
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
    type: productType,  // "bot"
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
    // 3. Set expiration (30 days for bots)
    // 4. Create transaction record
    // → All localStorage-based (MOCK)
}
```

### Backend Endpoint (needs building)
```
POST /purchase
Authorization: Bearer <token>
Body: {
  "product_section": "Bot",
  "product_id": "bot-2",
  "amount": 199,
  "method": "Card"
}
```

### After Checkout
```typescript
// AppContext.tsx:294
await refreshLibrary();
// → re-calls API.getPurchasedIds() + API.getLibrary() + API.getExpirations()
// → updates purchasedIds.bots to include new bot
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
  children  // ← shows AlertsPage
)}
```

### Search Component
**File:** `frontend/src/components/portal/SearchResults.tsx`

### API Call
```typescript
// SearchResults.tsx:24-41
const results = await API.searchCatalog(query);
// → MOCK: filters MOCK_BOTS by title/description/category
```

### Backend Endpoint
```
GET /search?q=ema
```

**File:** `backend/app/routers/search.py:85-103`
```python
@router.get("/search", response_model=List[SearchResult])
def search_all(q: str = "", db: Session = Depends(get_db)):
    bots = db.query(Bot).filter(
        or_(Bot.title.ilike(search_term), Bot.description.ilike(search_term))
    ).all()
    for b in bots:
        results.append({
            "id": b.bot_id,
            "section": "bot",
            "title": b.title,
            "description": b.description,
            "price": b.price,
            "thumbnail": b.image,
        })
    return results
```

### Response
```json
[
  {
    "id": "bot-2",
    "section": "bot",
    "title": "Trend-Rider EMA Breakout AutoBot",
    "description": "Auto-executes momentum breakouts...",
    "price": 199,
    "thumbnail": "https://picsum.photos/seed/bot2/600/400"
  }
]
```

### Search Results Rendering
```typescript
// SearchResults.tsx:126-135
{bots.map(bot => (
  <ProductCard
    key={bot.id}
    product={bot}
    type="bot"
    purchased={purchasedIds.bots.includes(bot.id)}
    onOpenDetails={onOpenProduct}
  />
))}
```

---

## 11. ENROLLMENT STATUS CHECK

### When Used
When user clicks "Manage" on a purchased bot card.

### API Call
```
GET /api/enrollment-status/{bot_id}
```

**File:** `backend/app/routers/purchases.py:388`
```python
@router.get("/api/enrollment-status/{product_id}")
def get_enrollment_status(product_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Checks bot_members table
    # Returns completion status + timeline
```

### Response
```json
{
  "completedPercent": 50,
  "status": "enrolled",
  "timeline": [
    { "label": "Bot License Activated", "completed": true, "desc": "..." },
    { "label": "Exchange API Linked", "completed": true, "desc": "..." },
    { "label": "Grid Engine Running", "completed": false, "current": true, "desc": "..." },
    { "label": "Performance Review", "completed": false, "desc": "..." }
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
// → Record<string, string> — key is bot_id, value is ISO date
```

### Backend Endpoint (needs building)
```
GET /my-expirations
Authorization: Bearer <token>
```

### Response
```json
{
  "bot-2": "2026-07-12T22:27:53.000Z"
}
```

### Usage in Library
```typescript
// library/page.tsx
const expiry = expirations[bot.id];  // → "2026-07-12T22:27:53.000Z"
```

---

## 13. RENEWAL FLOW

### Trigger
User clicks "Renew" on a bot in the library with expired/expiring access.

### API Call
```
POST /renew
Authorization: Bearer <token>
Body: {
  "product_id": "bot-2",
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
│                         BOTS PAGE LOAD                              │
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
    │─────────────────────────────────────>│  SELECT bot_id FROM        │
    │                                      │  transactions WHERE        │
    │                                      │  product_section = 'Bot'   │
    │                                      │───────────────────────────>│
    │  { courses: [], indicators: [],      │                            │
    │    bots: ["bot-2"] }                │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-library                     │                            │
    │─────────────────────────────────────>│  SELECT b.* FROM           │
    │                                      │  bot_members bm            │
    │                                      │  JOIN bots b ON ...        │
    │                                      │───────────────────────────>│
    │  { bots: [{ bot_id: "bot-2",         │                            │
    │    name: "Trend-Rider...",           │                            │
    │    expiry: "2026-07-12T..." }] }     │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /public/bots?skip=0&limit=2     │                            │
    │─────────────────────────────────────>│  SELECT * FROM bots        │
    │                                      │  WHERE status = 'Running'  │
    │                                      │  OFFSET 0 LIMIT 2         │
    │                                      │───────────────────────────>│
    │  [{ bot_id: "bot-2", title: "..." }, │                            │
    │   { bot_id: "bot-1", title: "..." }] │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER: ProductCard × 2                              │        │
    │  │  • bot.id → "bot-2"                                  │        │
    │  │  • purchasedIds.bots.includes(bot.id) → true         │        │
    │  │  • Shows "Activated inside Portal" + "Manage"        │        │
    │  │  • bot.id → "bot-1"                                  │        │
    │  │  • purchasedIds.bots.includes(bot.id) → false        │        │
    │  │  • Shows price + Add to Cart button                  │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user scrolls to bottom)            │                            │
    │                                      │                            │
    │  GET /public/bots?skip=2&limit=2     │                            │
    │─────────────────────────────────────>│  SELECT * FROM bots        │
    │                                      │  OFFSET 2 LIMIT 2         │
    │                                      │───────────────────────────>│
    │  [] (no more bots)                   │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER: "Server-side grid models synchronized"       │        │
    │  │  (end of list indicator)                              │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user clicks bot-1 card)            │                            │
    │                                      │                            │
    │  URL: /portal/alerts?product=bot-1   │                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER: ProductDetailModal                           │        │
    │  │  • Looks up product from MOCK_BOTS                    │        │
    │  │  • Shows exchange, apy, features, price              │        │
    │  │  • Shows "Add to Cart" button                        │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user clicks "Add to Cart")         │                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ AppContext.addToCart({                                │        │
    │  │   id: "bot-1",                                       │        │
    │  │   title: "Delta Drift Grid Executer",                │        │
    │  │   price: 250,                                        │        │
    │  │   image: "...",                                      │        │
    │  │   type: "bot"                                        │        │
    │  │ })                                                   │        │
    │  │ → Stored in localStorage: dealdeck_cart              │        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  (user opens cart & clicks "Secure Checkout")                    │
    │                                      │                            │
    │  POST /purchase                      │                            │
    │─────────────────────────────────────>│  INSERT INTO               │
    │  { product_section: "Bot",           │  bot_members               │
    │    product_id: "bot-1",              │  (username, bot_id,        │
    │    amount: 250,                      │   expiry, joined_at)      │
    │    method: "Card" }                  │                            │
    │                                      │  INSERT INTO transactions  │
    │                                      │───────────────────────────>│
    │  { success: true }                   │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-purchases (re-fetch)        │                            │
    │─────────────────────────────────────>│                            │
    │  { bots: ["bot-1", "bot-2"] }        │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-library (re-fetch)          │                            │
    │─────────────────────────────────────>│                            │
    │  { bots: [{ bot_id: "bot-1", ... },  │                            │
    │           { bot_id: "bot-2", ... }] }│                            │
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
| `GET /my-purchases` | GET | User | `purchases.py:423` | Purchased bot IDs |
| `GET /my-library` | GET | User | `purchases.py:452` | Full bot library objects |
| `GET /search?q=` | GET | None | `search.py:26` | Unified search |
| `GET /api/enrollment-status/{id}` | GET | User | `purchases.py:388` | Bot enrollment status |
| `GET /public/bots` | GET | Optional | `bots.py:187` | Paginated bot listing |
| `GET /public/bots/{bot_id}` | GET | Optional | `bots.py:198` | Single bot detail |

### ❌ Needs to Be Built

| Endpoint | Method | Auth | Request Body | Response | Purpose |
|---|---|---|---|---|---|
| `POST /purchase` | POST | User | `{ product_section, product_id, amount, method }` | `{ success: bool }` | Process purchase |
| `GET /my-expirations` | GET | User | — | `{ "bot-1": "2027-06-21T..." }` | Bot expirations |
| `POST /renew` | POST | User | `{ product_id, duration_days }` | `{ success, expiration }` | Renew license |

---

## 16. MOCK DATA → REAL BACKEND FIELD MAPPING

| Frontend Field | Mock Value | Backend DB Column | Type |
|---|---|---|---|
| `id` | `"bot-1"` | `bots.bot_id` | `str` (business key) |
| `title` | `"Delta Drift Grid Executer"` | `bots.title` | `str` |
| `description` | `"Dynamically updates..."` | `bots.description` | `str` |
| `longDescription` | `"This advanced execution..."` | `bots.long_description` | `str` |
| `price` | `250` | `bots.price` | `float` |
| `category` | `"Grid Execution"` | `bots.category` | `str` |
| `image` | `"https://picsum.photos/..."` | `bots.image` | `str` |
| `features` | `["..."]` | `bots.features` | `list[str]` |
| `exchange` | `"Binance, Bybit, OKX"` | `bots.exchange` | `str` |
| `apy` | `"112.4%"` | `bots.apy` | `str` |
| `status` | `"Running"` | `bots.status` | `str` |
| — | — | `bots.id` | `int` (auto PK, exposed as `id` in `BotPublicResponse`) |
| — | — | `bots.purchased_count` | `int` |
| — | — | `bots.token_env` | `str` (nullable, not exposed to client) |
| — | — | `bots.created_at` | `datetime` |
| — | — | `bots.updated_at` | `datetime` |

---

## 17. REMAINING MOCK CALLS TO REWRITE

| File | Function | Current (MOCK) | Target (Real) |
|---|---|---|---|
| `portal/api.ts:242` | `getBots()` | `MOCK_BOTS.slice()` | `GET /public/bots?skip=&limit=` |
| `portal/api.ts:267` | `getPurchasedIds()` | `localStorage` | `GET /my-purchases` |
| `portal/api.ts:273` | `getLibrary()` | `MOCK_BOTS.filter()` | `GET /my-library` |
| `portal/api.ts:284` | `getEnrollmentStatus()` | `MOCK logic` | `GET /api/enrollment-status/{id}` |
| `portal/api.ts:324` | `purchaseItem()` | `localStorage` | `POST /purchase` |
| `portal/api.ts:397` | `getExpirations()` | `localStorage` | `GET /my-expirations` |
| `portal/api.ts:403` | `renewProduct()` | `localStorage` | `POST /renew` |
| `ProductDetailModal.tsx:51` | Product lookup | `MOCK_BOTS.find()` | Cache from API or fetch by ID |
