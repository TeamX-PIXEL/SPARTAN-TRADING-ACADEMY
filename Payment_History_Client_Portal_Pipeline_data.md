# Payment History Client Portal Pipeline

## Page: `/portal/history` — Payment/Transaction History with Filters

---

## 1. PAGE INITIALIZATION FLOW

```
AppProvider (AppContext.tsx)
  ├─ useEffect #1: API.getProfile()           → GET /users/me
  ├─ useEffect #2: API.getPurchasedIds()       → GET /my-purchases
  ├─ useEffect #2: API.getLibrary()            → GET /my-library
  │
  └─ HistoryPage (history/page.tsx)
       └─ useEffect: fetchTransactions()
            └─ API.getTransactions()           → GET /my-transactions
```

### Timeline (what fires on page load)

| Order | Component | API Call | Backend Endpoint | Purpose |
|-------|-----------|----------|------------------|---------|
| 1 | AppContext | `API.getProfile()` | `GET /users/me` | Load user profile |
| 2 | AppContext | `API.getPurchasedIds()` | `GET /my-purchases` | Load purchased IDs |
| 3 | AppContext | `API.getLibrary()` | `GET /my-library` | Load full library objects |
| 4 | HistoryPage | `API.getTransactions()` | `GET /my-transactions` | Load transaction history |

---

## 2. API CALL #1 — Load Profile

Same as other pages. Exists ✅.

---

## 3. API CALL #2 — Load Purchased IDs

Same as other pages. Exists ✅.

---

## 4. API CALL #3 — Load Library

Same as other pages. Exists ✅.

---

## 5. API CALL #4 — Load Transactions

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

### Backend Transaction Model
**File:** `backend/app/models/transaction.py:6`
```python
class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), ForeignKey("users.username"), index=True)
    product_section = Column(String(20), nullable=False)  # Course, Discord, Indicator, Bot
    course_id = Column(String(50), ForeignKey("courses.course_id"), nullable=True)
    indicator_id = Column(String(64), ForeignKey("indicators.indicator_id"), nullable=True)
    bot_id = Column(String(50), ForeignKey("bots.bot_id"), nullable=True)
    expiry = Column(DateTime, nullable=True)
    amount = Column(Float, default=0)
    method = Column(String(50), nullable=True)
    status = Column(String(20), default="completed")
    created_at = Column(DateTime, default=...)
```

### Backend Transaction Schema
**File:** `backend/app/schemas/transaction.py:18`
```python
class TransactionResponse(BaseModel):
    id: int
    username: str
    product_section: str
    course_id: Optional[str] = None
    indicator_id: Optional[str] = None
    bot_id: Optional[str] = None
    expiry: Optional[datetime] = None
    amount: float
    method: Optional[str] = None
    status: str
    created_at: datetime
```

### Expected Response (from real backend)
```json
[
  {
    "id": 1,
    "username": "stoic_trader",
    "product_section": "Course",
    "course_id": "course-4",
    "indicator_id": null,
    "bot_id": null,
    "expiry": "2026-07-12T22:27:53.000Z",
    "amount": 199,
    "method": "Card",
    "status": "completed",
    "created_at": "2026-06-08T10:30:00.000Z"
  },
  {
    "id": 2,
    "username": "stoic_trader",
    "product_section": "Bot",
    "course_id": null,
    "indicator_id": null,
    "bot_id": "bot-2",
    "expiry": "2026-07-12T22:27:53.000Z",
    "amount": 199,
    "method": "Card",
    "status": "completed",
    "created_at": "2026-06-10T15:45:00.000Z"
  }
]
```

### Frontend State
```typescript
// history/page.tsx:29
const [transactions, setTransactions] = useState<Transaction[]>([]);
```

---

## 6. FRONTEND TRANSACTION TYPE vs BACKEND

### Frontend Type
**File:** `frontend/src/types/portal.ts:94`
```typescript
export interface Transaction {
  id: string;                    // ← string (e.g. "TX-8192-41")
  date: string;                  // ← "date" field
  product_id: string;            // ← "product_id" (was productUuid)
  productTitle: string;          // ← human-readable title
  productImage: string;          // ← thumbnail URL
  type: 'Purchase' | 'Renewal' | 'Course Enrollment';
  amount: number;
  status: 'SUCCESSFUL' | 'PENDING';
  tvid: string;
  product_section: 'Course' | 'Indicator' | 'Bot';
  method?: string;
}
```

### Backend Schema
```python
class TransactionResponse:
    id: int                       # ← int (auto-increment PK)
    username: str
    product_section: str          # "Course" | "Indicator" | "Bot" | "Discord"
    course_id: Optional[str]
    indicator_id: Optional[str]
    bot_id: Optional[str]
    expiry: Optional[datetime]
    amount: float
    method: Optional[str]
    status: str                   # "completed"
    created_at: datetime          # ← "created_at" not "date"
```

### ⚠️ Field Mapping Mismatches

| Frontend Field | Backend Field | Issue |
|---|---|---|
| `id` (string "TX-8192-41") | `id` (int 1) | Type mismatch |
| `date` | `created_at` | Name mismatch |
| `product_id` | `course_id` / `indicator_id` / `bot_id` | Different structure |
| `productTitle` | — (not stored) | ❌ Missing |
| `productImage` | — (not stored) | ❌ Missing |
| `type` ("Purchase"/"Renewal") | — (not stored) | ❌ Missing |
| `tvid` | — (not stored) | ❌ Missing |
| `status` ("SUCCESSFUL") | `status` ("completed") | Value mismatch |

---

## 7. CATEGORY CLASSIFICATION LOGIC

### How Frontend Determines Transaction Category
```typescript
// history/page.tsx:69-92
const getTransactionCategory = (tx: Transaction) => {
  const id = tx.product_id;
  if (id && id.startsWith('course')) return 'courses';
  if (id && id.startsWith('indicator')) return 'indicators';
  if (id && id.startsWith('bot')) return 'bots';
  
  // Fallback: check MOCK arrays and title keywords
  const isCourse = MOCK_COURSES.some(c => c.id === id) || 
                   tx.productTitle.toLowerCase().includes('blueprint') || 
                   tx.productTitle.toLowerCase().includes('course');
  if (isCourse) return 'courses';
  
  const isBot = MOCK_BOTS.some(b => b.id === id) || 
                tx.productTitle.toLowerCase().includes('bot');
  if (isBot) return 'bots';
  
  const isIndicator = MOCK_INDICATORS.some(i => i.id === id) || 
                      tx.productTitle.toLowerCase().includes('indicator') || 
                      tx.productTitle.toLowerCase().includes('script');
  if (isIndicator) return 'indicators';
  
  return 'courses'; // default
};
```

### Backend Alternative
The backend `product_section` field directly tells the category:
- `"Course"` → courses
- `"Indicator"` → indicators
- `"Bot"` → bots
- `"Discord"` → courses (Discord is a course add-on)

---

## 8. SEARCH & FILTER

### Search
```typescript
// history/page.tsx:95-106
const filteredTransactions = transactions.filter(tx => {
  const matchesSearch = tx.productTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
                        tx.id.toLowerCase().includes(historySearch.toLowerCase()) ||
                        tx.type.toLowerCase().includes(historySearch.toLowerCase());
  if (!matchesSearch) return false;
  if (activeCategory === 'all') return true;
  return getTransactionCategory(tx) === activeCategory;
});
```

### Category Tabs
```typescript
// history/page.tsx:32
const [activeCategory, setActiveCategory] = useState<'all' | 'courses' | 'indicators' | 'bots'>('all');
```

### Counts
```typescript
// history/page.tsx:110-112
const coursesCount = transactions.filter(tx => getTransactionCategory(tx) === 'courses').length;
const indicatorsCount = transactions.filter(tx => getTransactionCategory(tx) === 'indicators').length;
const botsCount = transactions.filter(tx => getTransactionCategory(tx) === 'bots').length;
```

---

## 9. CLIENT-SIDE PAGINATION

### Setup
```typescript
// history/page.tsx:35-36
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 4;  // 4 receipts per page
```

### Computed Values
```typescript
// history/page.tsx:115-119
const totalItems = filteredTransactions.length;
const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
const pagedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
```

### Reset on Filter Change
```typescript
// history/page.tsx:39-41
useEffect(() => {
  setCurrentPage(1);
}, [historySearch, activeCategory]);
```

---

## 10. AGGREGATE METRICS

### Total Spent
```typescript
// history/page.tsx:108
const totalSpent = transactions.reduce((acc, curr) => acc + curr.amount, 0);
```

### Display
```typescript
// history/page.tsx:155
<span>₹{totalSpent.toLocaleString('en-IN')} INR</span>
```

### Total Orders
```typescript
// history/page.tsx:162
<span>{transactions.length} receipts</span>
```

---

## 11. INVOICE DOWNLOAD (Simulated)

### Handler
```typescript
// history/page.tsx:61-66
const handleDownloadInvoice = (txId: string) => {
  addToast(`Constructing digital invoice PDF for transaction ${txId}...`, "info");
  setTimeout(() => {
    addToast(`Invoice downloaded successfully!`, "success");
  }, 1200);
};
```

### Backend Endpoint (needs building)
```
GET /my-transactions/{tx_id}/invoice
Authorization: Bearer <token>
```

---

## 12. BACKEND ENDPOINTS SUMMARY

### ✅ Already Exist

| Endpoint | Method | Auth | File | Purpose |
|---|---|---|---|---|
| `GET /users/me` | GET | User | `auth.py:94` | User profile |
| `GET /my-purchases` | GET | User | `purchases.py:423` | Purchased IDs |
| `GET /my-library` | GET | User | `purchases.py:452` | Full library objects |

### ❌ Needs to Be Built

| Endpoint | Method | Auth | Request Body | Response | Purpose |
|---|---|---|---|---|---|
| `GET /my-transactions` | GET | User | — | `TransactionResponse[]` | Transaction history |
| `GET /my-transactions/{id}/invoice` | GET | User | — | PDF file | Download invoice |

---

## 13. COMPLETE DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                      HISTORY PAGE LOAD                              │
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
    │                                      │  members JOIN products     │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  GET /my-transactions                │                            │
    │─────────────────────────────────────>│  SELECT * FROM transactions│
    │  ⚠️ NEEDS BUILDING                   │  WHERE username = user     │
    │                                      │  ORDER BY created_at DESC  │
    │                                      │───────────────────────────>│
    │  [{ id: 1,                           │                            │
    │    product_section: "Course",        │                            │
    │    course_id: "course-4",            │                            │
    │    amount: 199,                      │                            │
    │    status: "completed",              │                            │
    │    created_at: "2026-06-08T..." }]   │                            │
    │<─────────────────────────────────────│                            │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ TRANSFORM: Backend → Frontend Transaction shape       │        │
    │  │  • id: int → string "TX-{id}-XX"                     │        │
    │  │  • created_at → date                                 │        │
    │  │  • course_id/indicator_id/bot_id → product_id        │        │
    │  │  • product_section → product_section                  │        │
    │  │  • status: "completed" → "SUCCESSFUL"                │        │
    │  │  • Lookup title/image from library or public endpoints│        │
    │  └──────────────────────────────────────────────────────┘        │
    │                                      │                            │
    │  ┌──────────────────────────────────────────────────────┐        │
    │  │ RENDER:                                               │        │
    │  │  • Summary cards: total spent, order count, gateway   │        │
    │  │  • Search bar (filter by title, tx ID, type)          │        │
    │  │  • Category tabs: All, Courses, Indicators, Bots      │        │
    │  │  • Transaction list (paginated, 4 per page)           │        │
    │  │    - Product image, TX ID, type badge, category       │        │
    │  │    - Product title, user identifier, date             │        │
    │  │    - Amount (₹ INR), status badge, download button   │        │
    │  │  • Pagination controls (first/prev/page# /next/last)  │        │
    │  └──────────────────────────────────────────────────────┘        │
```

---

## 14. MOCK → REAL BACKEND TRANSFORMATION

Since the backend `TransactionResponse` has a different shape, the frontend needs a transformation layer:

```typescript
// Proposed transformation in api.ts
async getTransactions(): Promise<Transaction[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/my-transactions`);
    const data: TransactionResponse[] = await res.json();
    
    return data.map(tx => ({
      id: `TX-${tx.id}-${String(Math.floor(10 + Math.random() * 89))}`,
      date: tx.created_at,
      product_id: tx.course_id || tx.indicator_id || tx.bot_id || '',
      productTitle: await lookupProductName(tx),  // needs extra lookup
      productImage: await lookupProductImage(tx),  // needs extra lookup
      type: tx.expiry ? 'Renewal' : 'Purchase',   // heuristic
      amount: tx.amount,
      status: tx.status === 'completed' ? 'SUCCESSFUL' : 'PENDING',
      tvid: user?.tvid || '',
      product_section: tx.product_section as 'Course' | 'Indicator' | 'Bot',
      method: tx.method,
    }));
}
```

### ⚠️ Missing Data Problem
The backend `transactions` table does NOT store:
- `productTitle` — must look up from `courses`/`indicators`/`bots` tables
- `productImage` — must look up from `courses`/`indicators`/`bots` tables
- `type` (Purchase vs Renewal) — not distinguishable from backend data
- `tvid` — must look up from `users` table

**Solution:** The `GET /my-transactions` endpoint should JOIN with product tables and include `title` and `image` in the response.

---

## 15. PROPOSED ENHANCED ENDPOINT

```python
@router.get("/my-transactions")
def get_my_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txns = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
    ).order_by(Transaction.created_at.desc()).all()
    
    results = []
    for tx in txns:
        title = "Unknown Product"
        image = None
        
        if tx.product_section == "Course" and tx.course_id:
            course = db.query(Course).filter(Course.course_id == tx.course_id).first()
            if course:
                title = course.title
                image = course.image
        elif tx.product_section == "Indicator" and tx.indicator_id:
            ind = db.query(Indicator).filter(Indicator.indicator_id == tx.indicator_id).first()
            if ind:
                title = ind.title
                image = ind.image
        elif tx.product_section == "Bot" and tx.bot_id:
            bot = db.query(Bot).filter(Bot.bot_id == tx.bot_id).first()
            if bot:
                title = bot.title
                image = bot.image
        
        results.append({
            "id": tx.id,
            "date": tx.created_at.isoformat(),
            "product_id": tx.course_id or tx.indicator_id or tx.bot_id,
            "productTitle": title,
            "productImage": image,
            "type": "Renewal" if tx.method == "Renewal" else "Purchase",
            "amount": tx.amount,
            "status": "SUCCESSFUL" if tx.status == "completed" else "PENDING",
            "tvid": current_user.tvid or "",
            "product_section": tx.product_section,
            "method": tx.method,
        })
    
    return results
```

---

## 16. REMAINING MOCK CALLS TO REWRITE

| File | Function | Current (MOCK) | Target (Real) |
|---|---|---|---|
| `portal/api.ts:382` | `getTransactions()` | `localStorage` | `GET /my-transactions` |
| `portal/api.ts:388` | `saveTransaction()` | `localStorage` | `POST /my-transactions` |
| `history/page.tsx:61` | `handleDownloadInvoice()` | `setTimeout` toast | `GET /my-transactions/{id}/invoice` |
| `history/page.tsx:69` | `getTransactionCategory()` | MOCK array lookups | Use `product_section` from backend |

---

## 17. INCONSISTENCIES TO FIX

| Issue | Location | Problem |
|---|---|---|
| **`productUuid` vs `product_id`** | `api.ts:97,358,433` | Mock uses `productUuid` but type uses `product_id` |
| **TX ID format** | Mock: `"TX-8192-41"` vs Backend: `int` | Need transformation |
| **Status values** | Mock: `"SUCCESSFUL"` vs Backend: `"completed"` | Need mapping |
| **Missing product data** | Backend transactions table | No `title`/`image` stored |
| **No `type` field** | Backend transactions table | Can't distinguish Purchase vs Renewal |
| **Invoice download** | `handleDownloadInvoice()` is toast-only | Needs real PDF generation |
