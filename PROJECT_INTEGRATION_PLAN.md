# Sparten2 Project Integration Plan

## Current State Summary

| Component | Tech | Status | Location |
|-----------|------|--------|----------|
| Backend | Python/FastAPI + MySQL | ✅ Complete | `/backend/` |
| Admin Dashboard | Next.js 16 + Prisma/SQLite | ✅ Complete | `/frontend/` |
| Landing Page | Next.js 16 + Tailwind | ✅ Complete (no backend) | `/landing_page/` |
| Client Portal | Vite + React + Tailwind | ✅ Complete (mocked) | `/client_portal/` |

## Goal

Unify everything into `/frontend/` as a single Next.js app:
- Landing page → `/` route
- Client portal → `/portal/` route  
- Admin dashboard → `/dashboard/` route (existing)
- Connect all to the FastAPI backend

---

## Phase 1: Database Schema Updates

### New columns needed in existing tables:

**users table:**
- `avatar_url` (VARCHAR, nullable) - profile picture
- `telegram_username` (VARCHAR, nullable) - Telegram handle
- `mobile_number` (VARCHAR, nullable) - phone number
- `notifications_enabled` (BOOLEAN, default true)
- `marketing_emails` (BOOLEAN, default false)
- `theme_preference` (VARCHAR, default 'dark')

**courses table:**
- `long_description` (TEXT, nullable) - full description for product detail
- `difficulty` (ENUM: 'beginner','intermediate','advanced')
- `lecturer` (VARCHAR) - instructor name
- `estimated_duration` (INT, minutes)
- `features` (JSON) - feature list
- `is_active` (BOOLEAN, default true)

**indicators table:**
- `long_description` (TEXT, nullable)
- `script_type` (VARCHAR) - 'Pine Script v5', 'MQL4'
- `accuracy` (DECIMAL, nullable) - percentage
- `timeframe` (VARCHAR, nullable)
- `features` (JSON)
- `is_active` (BOOLEAN, default true)
- `category` (VARCHAR, nullable)

**bots table:**
- `long_description` (TEXT, nullable)
- `exchange` (VARCHAR) - 'Binance', 'Bybit'
- `apy` (DECIMAL, nullable) - annual percentage yield
- `features` (JSON)
- `server_region` (VARCHAR, default 'AWS US-East')
- `is_active` (BOOLEAN, default true)

### New tables needed:

**lessons table:**
- `id` (INT, PK)
- `course_uuid` (VARCHAR, FK)
- `title` (VARCHAR)
- `type` (ENUM: 'youtube', 'zoom', 'meet')
- `link` (VARCHAR)
- `sort_order` (INT)
- `duration` (INT, nullable)
- `start_time` (DATETIME, nullable)
- `created_by` (INT, nullable)
- `created_at` (DATETIME)

**transactions table:**
- `id` (INT, PK)
- `user_id` (INT, FK)
- `product_uuid` (VARCHAR)
- `product_title` (VARCHAR)
- `product_image` (VARCHAR)
- `product_type` (ENUM: 'course', 'indicator', 'bot')
- `type` (ENUM: 'Purchase', 'Renewal')
- `amount` (DECIMAL)
- `currency` (VARCHAR, default 'INR')
- `status` (ENUM: 'SUCCESSFUL', 'PENDING', 'FAILED')
- `tvid` (VARCHAR)
- `payment_method` (VARCHAR, nullable)
- `razorpay_order_id` (VARCHAR, nullable)
- `razorpay_payment_id` (VARCHAR, nullable)
- `created_at` (DATETIME)

**notifications table:**
- `id` (INT, PK)
- `user_id` (INT, FK)
- `title` (VARCHAR)
- `message` (TEXT)
- `type` (ENUM: 'lesson', 'alert', 'system')
- `link_to` (VARCHAR, nullable)
- `course_uuid` (VARCHAR, nullable)
- `is_read` (BOOLEAN, default false)
- `created_at` (DATETIME)

**reviews table:**
- `id` (INT, PK)
- `name` (VARCHAR)
- `content` (TEXT)
- `rating` (INT, 1-5)
- `avatar_url` (VARCHAR, nullable)
- `is_approved` (BOOLEAN, default false)
- `created_at` (DATETIME)

**pricing_plans table:**
- `id` (INT, PK)
- `name` (VARCHAR)
- `description` (TEXT)
- `price` (DECIMAL)
- `currency` (VARCHAR, default 'INR')
- `features` (JSON)
- `cta_text` (VARCHAR)
- `is_highlighted` (BOOLEAN, default false)
- `sort_order` (INT)
- `is_active` (BOOLEAN, default true)
- `created_at` (DATETIME)

---

## Phase 2: Backend API Additions

### Public endpoints (no auth):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/public/pricing` | Get active pricing plans |
| GET | `/api/public/reviews` | Get approved reviews (paginated) |
| GET | `/api/public/stats` | Get platform stats (students, alerts, etc.) |
| GET | `/api/public/batches/next` | Get next batch info |

### User endpoints (JWT required):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/api/users/me/avatar` | Upload profile avatar |
| PUT | `/api/users/me/notifications` | Update notification prefs |
| GET | `/api/users/me/transactions` | Get transaction history |
| GET | `/api/users/me/notifications` | Get user notifications |
| PUT | `/api/users/me/notifications/{id}/read` | Mark notification read |

### Existing endpoints that need updates:

- `GET /public/courses` → add `long_description`, `difficulty`, `lecturer`, `estimated_duration`, `features`
- `GET /public/indicators` → add `long_description`, `script_type`, `accuracy`, `timeframe`, `features`
- `GET /public/bots` → add `long_description`, `exchange`, `apy`, `features`, `server_region`

---

## Phase 3: Frontend Architecture

### Directory structure for unified `/frontend/`:

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page (from /landing_page)
│   │   ├── globals.css             # Global styles
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      # Login page
│   │   │   └── signup/page.tsx     # Signup page
│   │   │
│   │   ├── portal/                 # Client portal routes
│   │   │   ├── layout.tsx          # Portal layout (sidebar, header)
│   │   │   ├── courses/page.tsx
│   │   │   ├── indicators/page.tsx
│   │   │   ├── alerts/page.tsx
│   │   │   ├── library/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── (main)/dashboard/       # Admin dashboard (existing)
│   │   │   └── ... (keep as-is)
│   │   │
│   │   └── api/                    # Next.js API routes (proxy to backend)
│   │       └── ...
│   │
│   ├── components/
│   │   ├── landing/                # Landing page components (from /landing_page)
│   │   │   ├── hero-section.tsx
│   │   │   ├── features-section.tsx
│   │   │   ├── ... (all 17 components)
│   │   │   └── navigation.tsx
│   │   │
│   │   ├── portal/                 # Client portal components (from /client_portal)
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopHeader.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductDetailModal.tsx
│   │   │   ├── CartLibraryPanel.tsx
│   │   │   ├── RazorpayModal.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   ├── ToastSystem.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── MobileNav.tsx
│   │   │
│   │   └── ui/                     # shadcn/ui components (existing)
│   │       └── ... (keep as-is)
│   │
│   ├── lib/
│   │   ├── api.ts                  # API client (new, calls real backend)
│   │   ├── auth.ts                 # Auth utilities (existing)
│   │   └── utils.ts                # Shared utilities
│   │
│   ├── stores/
│   │   ├── portal-store.ts         # Portal state (Zustand)
│   │   └── cart-store.ts           # Cart state (Zustand)
│   │
│   └── types/
│       ├── portal.ts               # Portal types (from client_portal types.ts)
│       └── index.ts                # Shared types
```

### Key migration steps:

1. Copy landing page components to `src/components/landing/`
2. Copy client portal components to `src/components/portal/`
3. Create portal pages in `src/app/portal/`
4. Create real API client in `src/lib/api.ts` (replaces localStorage mocks)
5. Set up Zustand stores for portal state
6. Update navigation to link between landing → portal → dashboard
7. Keep old HTML files in `/client_portal/` for reference

---

## Phase 4: Landing Page Integration

### What needs to change in landing page components:

| Component | Current | After Integration |
|-----------|---------|-------------------|
| `navigation.tsx` | Login → `#` | Login → `/auth/login` |
| `hero-section.tsx` | Hardcoded stats | Fetch from `/api/public/stats` |
| `how-it-works-section.tsx` | Generic countdown | Fetch next batch from `/api/public/batches/next` |
| `infrastructure-section.tsx` | Static pricing | Fetch from `/api/public/pricing` |
| `pricing-section.tsx` | Static plans | Fetch from `/api/public/pricing` |
| `testimonials-section.tsx` | Hardcoded reviews | Fetch from `/api/public/reviews` |
| `cta-section.tsx` | No action | Register → `/auth/signup` |

### New API routes needed in Next.js (proxy layer):

```
src/app/api/
├── proxy.ts              # Backend proxy utility
├── auth/
│   ├── login/route.ts
│   └── signup/route.ts
└── ... (optional: proxy other endpoints)
```

---

## Phase 5: Client Portal Integration

### Replace mocked API calls with real backend calls:

| Mock Function | Real Implementation |
|---------------|-------------------|
| `API.getProfile()` | `GET /users/me` with JWT |
| `API.updateProfile()` | `PUT /users/me` with JWT |
| `API.changePassword()` | `PUT /users/me/password` with JWT |
| `API.getCourses()` | `GET /public/courses` with optional JWT |
| `API.getIndicators()` | `GET /public/indicators` with optional JWT |
| `API.getBots()` | `GET /public/bots` with optional JWT |
| `API.searchCatalog()` | `GET /search` |
| `API.getPurchasedIds()` | `GET /my-purchases` with JWT |
| `API.getLibrary()` | `GET /my-library` with JWT |
| `API.getEnrollmentStatus()` | `GET /api/enrollment-status/:uuid` with JWT |
| `API.purchaseItem()` | `POST /purchase` with JWT |
| `API.getLessons()` | `GET /batches/:id/schedules` |
| `API.getTransactions()` | `GET /api/users/me/transactions` with JWT |
| `API.renewProduct()` | `POST /purchase` (renewal type) |

### Auth flow:
1. User signs up via `/signup` → backend creates user + sends verification email
2. User verifies email → backend activates account
3. User logs in → backend returns JWT + UserUUID
4. JWT stored in httpOnly cookie
5. All portal requests include JWT in Authorization header

---

## Phase 6: Admin Portal Updates

### New admin endpoints needed:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/reviews` | List all reviews |
| PUT | `/api/admin/reviews/:id/approve` | Approve review |
| DELETE | `/api/admin/reviews/:id` | Delete review |
| CRUD | `/api/admin/pricing` | Manage pricing plans |
| CRUD | `/api/admin/lessons` | Manage course lessons |
| GET | `/api/admin/transactions` | View all transactions |

### Admin UI additions:

- Reviews management page
- Pricing plan management page
- Lesson management (per course)
- Transaction history view

---

## Execution Order

1. **Database** - Add new columns + tables (Alembic migration)
2. **Backend** - Add missing API endpoints
3. **Frontend** - Set up unified architecture
4. **Landing Page** - Copy components + add API integration
5. **Client Portal** - Copy components + replace mock API with real calls
6. **Admin Portal** - Add new management pages
7. **Testing** - End-to-end flow testing
8. **Deploy** - Production deployment

---

## Notes

- Keep old `/client_portal/` files as reference (don't delete)
- Keep old `/landing_page/` files as reference
- Backend already has most endpoints needed - just need schema updates
- Client portal is currently 100% mocked - needs real auth + API calls
- Landing page is 100% static - needs dynamic data fetching
- All three apps will share the same shadcn/ui component library


