# Client Portal Mock Data Cleanup Plan

## Summary
Complete cleanup of all mock data in client portal, replacing with real API endpoints.

---

## 1. CURRENT MOCK FUNCTIONS vs REAL API ENDPOINTS

### ✅ ALREADY EXISTS (Backend Ready)

| Mock Function | Backend Endpoint | Status |
|---|---|---|
| `getProfile()` | `GET /users/me` | ✅ EXISTS |
| `updateProfile()` | `PUT /users/me` | ✅ EXISTS (limited fields) |
| `changePassword()` | `PUT /users/me/password` | ✅ EXISTS |
| `getBots()` | `GET /public/bots` | ✅ EXISTS |
| `searchCatalog()` | `GET /search` | ✅ EXISTS |
| `getPurchasedIds()` | `GET /my-purchases` | ✅ EXISTS |
| `getLibrary()` | `GET /my-library` | ✅ EXISTS |
| `getEnrollmentStatus()` | `GET /api/enrollment-status/{course_id}` | ✅ EXISTS |

### ❌ NEED TO CREATE (Backend Missing)

| Mock Function | Needed Endpoint | Purpose |
|---|---|---|
| `getCourses()` | `GET /public/courses` | Public course listing with pagination |
| `getIndicators()` | `GET /public/indicators` | Public indicator listing with pagination |
| `getTransactions()` | `GET /my-transactions` | User's transaction history |
| `saveTransaction()` | `POST /my-transactions` | Create transaction (renewals, etc.) |
| `getLessons()` | `GET /my-lessons` | User's lessons (enrolled courses) |
| `getExpirations()` | `GET /my-expirations` | User's product expirations |
| `renewProduct()` | `POST /renew` | Renew a product subscription |
| `purchaseItem()` | `POST /purchase` | Purchase a product |

---

## 2. BACKEND ENDPOINTS TO CREATE

### 2.1 Public Course Listing

**File:** `backend/app/routers/courses.py`

```python
@router.get("/public/courses")
def get_public_courses(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Returns courses visible to public (non-admin users)."""
    courses = db.query(Course).offset(skip).limit(limit).all()
    return courses
```

### 2.2 Public Indicator Listing

**File:** `backend/app/routers/indicators.py`

```python
@router.get("/public/indicators")
def get_public_indicators(
    skip: int = 0,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Returns indicators visible to public (non-admin users)."""
    indicators = db.query(Indicator).offset(skip).limit(limit).all()
    return indicators
```

### 2.3 My Transactions

**File:** `backend/app/routers/purchases.py`

```python
@router.get("/my-transactions")
def get_my_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the current user's transaction history with product titles and images."""
    txns = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
        Transaction.status == "completed"
    ).order_by(Transaction.created_at.desc()).all()

    results = []
    for txn in txns:
        # Get product title and image based on section
        product_title = None
        product_image = None
        product_id = None

        if txn.product_section == "Course" and txn.course_id:
            course = db.query(Course).filter(Course.course_id == txn.course_id).first()
            if course:
                product_title = course.title
                product_image = course.course_thumbnail
                product_id = course.course_id
        elif txn.product_section == "Indicator" and txn.indicator_id:
            indicator = db.query(Indicator).filter(Indicator.indicator_id == txn.indicator_id).first()
            if indicator:
                product_title = indicator.title
                product_image = indicator.image
                product_id = indicator.indicator_id
        elif txn.product_section == "Bot" and txn.bot_id:
            bot = db.query(Bot).filter(Bot.bot_id == txn.bot_id).first()
            if bot:
                product_title = bot.title
                product_image = bot.image
                product_id = bot.bot_id

        results.append({
            "id": str(txn.id),
            "date": txn.created_at.isoformat() if txn.created_at else None,
            "product_id": product_id,
            "productTitle": product_title,
            "productImage": product_image,
            "type": "Purchase",  # or derive from context
            "amount": txn.amount,
            "status": "SUCCESSFUL" if txn.status == "completed" else "PENDING",
            "tvid": current_user.tvid or "",
            "product_section": txn.product_section,
            "method": txn.method,
        })

    return results
```

### 2.4 My Lessons

**File:** `backend/app/routers/courses.py`

```python
@router.get("/my-lessons")
def get_my_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns lessons for courses the user is enrolled in."""
    # Get enrolled course IDs
    enrolled_courses = db.query(CourseMember).filter(
        CourseMember.username == current_user.UserID
    ).all()

    course_ids = [ec.course_id for ec in enrolled_courses]

    if not course_ids:
        return []

    # Get lessons for enrolled courses
    lessons = db.query(Lesson).filter(
        Lesson.course_id.in_(course_ids)
    ).order_by(Lesson.id.desc()).all()

    results = []
    for lesson in lessons:
        # Find course_id string from integer course_id
        course = db.query(Course).filter(Course.id == lesson.course_id).first()
        results.append({
            "id": str(lesson.id),
            "course_id": course.course_id if course else None,
            "title": lesson.title,
            "type": lesson.type,
            "link": lesson.link,
            "addedAt": lesson.created_at.isoformat() if lesson.created_at else None,
            "duration": lesson.duration,
            "startTime": lesson.start_time,
        })

    return results
```

### 2.5 My Expirations

**File:** `backend/app/routers/purchases.py`

```python
@router.get("/my-expirations")
def get_my_expirations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns expiration dates for indicators and bots."""
    # Get indicator expirations
    indicator_members = db.query(IndicatorMember).filter(
        IndicatorMember.username == current_user.UserID
    ).all()

    # Get bot expirations
    bot_members = db.query(BotMember).filter(
        BotMember.username == current_user.UserID
    ).all()

    expirations = {}
    for im in indicator_members:
        if im.expiry:
            expirations[im.indicator_id] = im.expiry.isoformat()

    for bm in bot_members:
        if bm.expiry:
            expirations[bm.bot_id] = bm.expiry.isoformat()

    return expirations
```

### 2.6 Purchase Item

**File:** `backend/app/routers/purchases.py`

```python
@router.post("/purchase")
def purchase_item(
    payload: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Purchase a course, indicator, or bot."""
    # Check if user has TVID
    if not current_user.tvid:
        raise HTTPException(status_code=400, detail="TVID_REQUIRED")

    # Check if already purchased
    existing = db.query(Transaction).filter(
        Transaction.username == current_user.UserID,
        Transaction.status == "completed",
    )

    if payload.product_section == "Course":
        existing = existing.filter(Transaction.course_id == payload.product_id)
    elif payload.product_section == "Indicator":
        existing = existing.filter(Transaction.indicator_id == payload.product_id)
    elif payload.product_section == "Bot":
        existing = existing.filter(Transaction.bot_id == payload.product_id)

    if existing.first():
        raise HTTPException(status_code=400, detail="Already purchased")

    # Create transaction
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expiry_date = now + timedelta(days=30)  # 30 day license

    txn = Transaction(
        username=current_user.UserID,
        product_section=payload.product_section,
        course_id=payload.product_id if payload.product_section == "Course" else None,
        indicator_id=payload.product_id if payload.product_section == "Indicator" else None,
        bot_id=payload.product_id if payload.product_section == "Bot" else None,
        expiry=expiry_date,
        amount=payload.amount,
        method=payload.method,
        status="completed",
    )
    db.add(txn)

    # Upsert member record
    if payload.product_section == "Course":
        existing_member = db.query(CourseMember).filter(
            CourseMember.username == current_user.UserID,
            CourseMember.course_id == payload.product_id,
        ).first()

        if not existing_member:
            db.add(CourseMember(
                username=current_user.UserID,
                course_id=payload.product_id,
                expiry=expiry_date,
            ))
            # Increment purchased_count
            course = db.query(Course).filter(Course.course_id == payload.product_id).first()
            if course:
                course.purchased_count = (course.purchased_count or 0) + 1

    elif payload.product_section == "Indicator":
        existing_member = db.query(IndicatorMember).filter(
            IndicatorMember.username == current_user.UserID,
            IndicatorMember.indicator_id == payload.product_id,
        ).first()

        if not existing_member:
            db.add(IndicatorMember(
                username=current_user.UserID,
                indicator_id=payload.product_id,
                expiry=expiry_date,
            ))
            indicator = db.query(Indicator).filter(Indicator.indicator_id == payload.product_id).first()
            if indicator:
                indicator.purchased_count = (indicator.purchased_count or 0) + 1

    elif payload.product_section == "Bot":
        existing_member = db.query(BotMember).filter(
            BotMember.username == current_user.UserID,
            BotMember.bot_id == payload.product_id,
        ).first()

        if not existing_member:
            db.add(BotMember(
                username=current_user.UserID,
                bot_id=payload.product_id,
                expiry=expiry_date,
            ))
            bot = db.query(Bot).filter(Bot.bot_id == payload.product_id).first()
            if bot:
                bot.purchased_count = (bot.purchased_count or 0) + 1

    db.commit()
    return {"success": True, "message": "Purchase successful"}
```

### 2.7 Renew Product

**File:** `backend/app/routers/purchases.py`

```python
@router.post("/renew")
def renew_product(
    payload: RenewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Renew a product subscription."""
    # Find existing member record
    member = None
    if payload.product_section == "Indicator":
        member = db.query(IndicatorMember).filter(
            IndicatorMember.username == current_user.UserID,
            IndicatorMember.indicator_id == payload.product_id,
        ).first()
    elif payload.product_section == "Bot":
        member = db.query(BotMember).filter(
            BotMember.username == current_user.UserID,
            BotMember.bot_id == payload.product_id,
        ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Not enrolled in this product")

    # Calculate new expiry
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    current_expiry = member.expiry if member.expiry and member.expiry > now else now
    new_expiry = current_expiry + timedelta(days=payload.duration_days)

    # Update member expiry
    member.expiry = new_expiry

    # Create renewal transaction
    txn = Transaction(
        username=current_user.UserID,
        product_section=payload.product_section,
        indicator_id=payload.product_id if payload.product_section == "Indicator" else None,
        bot_id=payload.product_id if payload.product_section == "Bot" else None,
        expiry=new_expiry,
        amount=payload.amount,
        method=payload.method,
        status="completed",
    )
    db.add(txn)

    db.commit()

    return {
        "success": True,
        "expiration": new_expiry.isoformat()
    }
```

---

## 3. FRONTEND API LAYER UPDATE

### 3.1 Updated `api.ts` Structure

```typescript
import { Course, Indicator, Bot, UserProfile, EnrollmentStatus, ProductType, Product, CartItem, Lesson, Transaction } from '@/types/portal';
import { API_BASE_URL, fetchWithAuth } from '@/lib/api-fetch';

// Remove all localStorage helpers and mock data imports

export const API = {
  // GET /users/me
  async getProfile(): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/me`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    const data = await response.json();
    return {
      id: data.id,
      name: `${data.firstname} ${data.lastname}`,
      email: data.email,
      avatar: '', // Add avatar logic if needed
      tvid: data.tvid || '',
      telegramid: data.telegram_user_id || '',
      discordid: data.discord_user_id || '',
      firstname: data.firstname,
      lastname: data.lastname,
      username: data.UserID,
      phone_number: data.phone_number || '',
      notificationsEnabled: true,
      marketingEmails: false,
      compactMode: false,
      themeColor: '#3b82f6',
    };
  },

  // PUT /users/me
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstname: updates.firstname,
        lastname: updates.lastname,
        tvid: updates.tvid,
        telegram_user_id: updates.telegramid,
        discord_user_id: updates.discordid,
      }),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return this.getProfile();
  },

  // PUT /users/me/password
  async changePassword(current: string, newPass: string): Promise<{ success: boolean; message: string }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: current,
        new_password: newPass,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to change password');
    }
    return { success: true, message: 'Password updated successfully' };
  },

  // GET /public/courses?skip=&limit=
  async getCourses(skip: number = 0, limit: number = 2): Promise<{ items: Course[]; hasMore: boolean }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/public/courses?skip=${skip}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    const data = await response.json();
    return {
      items: data.courses.map((c: any) => ({
        id: c.course_id,
        title: c.title,
        description: c.description,
        longDescription: c.description,
        price: c.price,
        image: c.course_thumbnail,
        category: c.category || 'Masterclass',
        features: c.features || [],
        duration: c.duration || '1 Month',
        lecturer: c.lecturer || 'Unknown',
        difficulty: c.difficulty || 'Beginner',
        scheduled_at: c.scheduled_at,
        estimated_duration: c.estimated_duration,
      })),
      hasMore: data.courses.length === limit,
    };
  },

  // GET /public/indicators?skip=&limit=
  async getIndicators(skip: number = 0, limit: number = 2): Promise<{ items: Indicator[]; hasMore: boolean }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/public/indicators?skip=${skip}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch indicators');
    const data = await response.json();
    return {
      items: data.indicators.map((i: any) => ({
        id: i.indicator_id,
        title: i.title,
        description: i.description,
        longDescription: i.description,
        price: i.price,
        image: i.image,
        category: i.category || 'Scripts',
        features: i.features || [],
        scriptType: i.script_type || 'Pine Script',
        accuracy: i.accuracy,
        timeframe: i.timeframe,
      })),
      hasMore: data.indicators.length === limit,
    };
  },

  // GET /public/bots?skip=&limit=
  async getBots(skip: number = 0, limit: number = 2): Promise<{ items: Bot[]; hasMore: boolean }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/public/bots?skip=${skip}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch bots');
    const data = await response.json();
    return {
      items: data.map((b: any) => ({
        id: b.bot_id,
        title: b.title,
        description: b.description,
        longDescription: b.description,
        price: b.price,
        image: b.image,
        category: b.category || 'Trading Bot',
        features: b.features || [],
        exchange: b.exchange || 'Binance',
        apy: b.apy || '—',
        status: b.status,
      })),
      hasMore: data.length === limit,
    };
  },

  // GET /search?q=
  async searchCatalog(query: string): Promise<{ courses: Course[]; indicators: Indicator[]; bots: Bot[] }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search');
    const data = await response.json();

    const courses = data.filter((r: any) => r.section === 'course').map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      longDescription: r.description,
      price: r.price,
      image: r.thumbnail,
      category: 'Masterclass',
      features: [],
      duration: '1 Month',
      lecturer: 'Unknown',
      difficulty: 'Beginner' as const,
      scheduled_at: r.scheduled_at,
      estimated_duration: r.estimated_duration,
    }));

    const indicators = data.filter((r: any) => r.section === 'indicator').map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      longDescription: r.description,
      price: r.price,
      image: r.thumbnail,
      category: 'Scripts',
      features: [],
      scriptType: 'Pine Script',
    }));

    const bots = data.filter((r: any) => r.section === 'bot').map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      longDescription: r.description,
      price: r.price,
      image: r.thumbnail,
      category: 'Trading Bot',
      features: [],
      exchange: 'Binance',
      apy: '—',
    }));

    return { courses, indicators, bots };
  },

  // GET /my-purchases
  async getPurchasedIds(): Promise<{ courses: string[]; indicators: string[]; bots: string[] }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/my-purchases`);
    if (!response.ok) throw new Error('Failed to fetch purchases');
    return response.json();
  },

  // GET /my-library
  async getLibrary(): Promise<{ courses: Course[]; indicators: Indicator[]; bots: Bot[] }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/my-library`);
    if (!response.ok) throw new Error('Failed to fetch library');
    const data = await response.json();

    return {
      courses: data.courses.map((c: any) => ({
        id: c.course_id,
        title: c.title,
        description: c.description,
        longDescription: c.description,
        price: 0,
        image: c.thumbnail,
        category: 'Masterclass',
        features: [],
        duration: '1 Month',
        lecturer: 'Unknown',
        difficulty: 'Beginner' as const,
      })),
      indicators: data.indicators.map((i: any) => ({
        id: i.indicator_id,
        title: i.name,
        description: i.description,
        longDescription: i.description,
        price: 0,
        image: i.thumbnail,
        category: 'Scripts',
        features: [],
        scriptType: 'Pine Script',
      })),
      bots: data.bots.map((b: any) => ({
        id: b.bot_id,
        title: b.name,
        description: b.description,
        longDescription: b.description,
        price: 0,
        image: b.thumbnail,
        category: 'Trading Bot',
        features: [],
        exchange: 'Binance',
        apy: '—',
      })),
    };
  },

  // GET /api/enrollment-status/:uuid
  async getEnrollmentStatus(courseUuid: string): Promise<EnrollmentStatus> {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/enrollment-status/${courseUuid}`);
    if (!response.ok) throw new Error('Failed to fetch enrollment status');
    const data = await response.json();

    return {
      completedPercent: data.is_purchased ? 25 : 0,
      status: data.is_purchased ? 'enrolled' : 'not-started',
      timeline: [
        { label: 'Workshop Registration', completed: data.is_purchased, desc: 'Initial registration' },
        { label: 'Live Broadcast', completed: false, current: data.is_purchased, desc: 'Live session' },
        { label: 'Practical Evaluation', completed: false, desc: 'Evaluation test' },
        { label: 'Certificate Issued', completed: false, desc: 'Completion certificate' },
      ],
    };
  },

  // POST /purchase
  async purchaseItem(item: CartItem): Promise<{ success: boolean; message: string }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_section: item.type === 'course' ? 'Course' : item.type === 'indicator' ? 'Indicator' : 'Bot',
        product_id: item.id,
        amount: item.price,
        method: 'Card',
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      if (error.detail === 'TVID_REQUIRED') throw new Error('TVID_REQUIRED');
      throw new Error(error.detail || 'Purchase failed');
    }
    return { success: true, message: 'Purchase successful' };
  },

  // GET /my-lessons
  async getLessons(): Promise<Lesson[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/my-lessons`);
    if (!response.ok) throw new Error('Failed to fetch lessons');
    const data = await response.json();
    return data.map((l: any) => ({
      id: l.id,
      course_id: l.course_id,
      title: l.title,
      type: l.type,
      link: l.link,
      addedAt: l.addedAt,
      duration: l.duration,
      startTime: l.startTime,
    }));
  },

  // GET /my-transactions
  async getTransactions(): Promise<Transaction[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/my-transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    const data = await response.json();
    return data.map((t: any) => ({
      id: t.id,
      date: t.date,
      product_id: t.product_id,
      productTitle: t.productTitle,
      productImage: t.productImage,
      type: t.type,
      amount: t.amount,
      status: t.status,
      tvid: t.tvid,
      product_section: t.product_section,
      method: t.method,
    }));
  },

  // GET /my-expirations
  async getExpirations(): Promise<Record<string, string>> {
    const response = await fetchWithAuth(`${API_BASE_URL}/my-expirations`);
    if (!response.ok) throw new Error('Failed to fetch expirations');
    return response.json();
  },

  // POST /renew
  async renewProduct(productUuid: string, price: number, durationDays: number): Promise<{ success: boolean; expiration: string }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_section: 'Indicator', // or 'Bot' based on context
        product_id: productUuid,
        amount: price,
        duration_days: durationDays,
        method: 'Card',
      }),
    });
    if (!response.ok) throw new Error('Renewal failed');
    const data = await response.json();
    return { success: true, expiration: data.expiration };
  },
};

export default API;
```

---

## 4. FILES TO MODIFY

### 4.1 Backend Files

| File | Changes |
|---|---|
| `backend/app/routers/courses.py` | Add `GET /public/courses`, `GET /my-lessons` |
| `backend/app/routers/indicators.py` | Add `GET /public/indicators` |
| `backend/app/routers/purchases.py` | Add `GET /my-transactions`, `POST /purchase`, `POST /renew`, `GET /my-expirations` |
| `backend/app/schemas/purchases.py` | Add `PurchaseRequest`, `RenewRequest` schemas |

### 4.2 Frontend Files

| File | Changes |
|---|---|
| `frontend/src/portal/api.ts` | Complete rewrite to use real API calls |
| `frontend/src/portal/data.ts` | DELETE (mock data no longer needed) |
| `frontend/src/portal/AppContext.tsx` | Update to handle async API calls properly |

---

## 5. IMPLEMENTATION ORDER

1. **Backend: Add missing schemas** (`PurchaseRequest`, `RenewRequest`)
2. **Backend: Add public endpoints** (`/public/courses`, `/public/indicators`)
3. **Backend: Add user endpoints** (`/my-transactions`, `/my-lessons`, `/my-expirations`, `/purchase`, `/renew`)
4. **Frontend: Rewrite `api.ts`** to use real API calls
5. **Frontend: Update `AppContext.tsx`** to handle async initialization
6. **Frontend: Delete `data.ts`** (mock data)
7. **Test complete flow** with real data

---

## 6. TESTING CHECKLIST

- [ ] User can load profile from backend
- [ ] User can update profile (TVID, Telegram, Discord)
- [ ] User can change password
- [ ] Courses page loads from backend
- [ ] Indicators page loads from backend
- [ ] Bots page loads from backend
- [ ] Search works across all products
- [ ] Purchase flow creates transaction and member record
- [ ] Library shows enrolled products
- [ ] Transaction history shows all purchases
- [ ] Expiration dates are tracked correctly
- [ ] Renewal extends expiry correctly
- [ ] Lessons show for enrolled courses
