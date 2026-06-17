# Admin Portal Changes & Backend Pipeline Tracking

## Purpose
This document tracks all UI changes made to the admin portal and maps frontend pages to backend endpoints for easy identification during backend integration.

**Status Legend:**
- `ACTIVE` = Endpoint used by frontend, backend must serve
- `DELETED` = Removed from sidebar/UI, verify backend can remove or keep as dead endpoint
- `NEEDED` = Frontend expects this endpoint, backend must create
- `MOCK` = Frontend has mock/placeholder data, no real endpoint yet

---

## 1. UI Changes Made

### Sidebar Navigation
- **DELETED**: "Client Portal" group (Courses, Indicators, Alerts, Library, History, Settings)
  - **Reason**: These pages belong to the client portal (`/portal/*`), not the admin dashboard
  - **File**: `src/navigation/sidebar/sidebar-items.ts`
  - **Status**: DONE

- **DELETED**: "CRM" from Dashboards group
  - **Reason**: CRM page not needed in admin portal
  - **File**: `src/navigation/sidebar/sidebar-items.ts`
  - **Status**: DONE

### Default Dashboard Page
- **RENAMED**: `/dashboard/default` → `/dashboard/analytics`
  - **Reason**: Merged duplicate pages; Default UI is better, old analytics removed
  - **From**: `app/(main)/dashboard/default/`
  - **To**: `app/(main)/dashboard/analytics/`
  - **Status**: DONE

- **REPLACED**: "Sales by Product" chart with "Where Users Are From" (GeoDistribution)
  - **Reason**: Analytics and Default pages were duplicate; Default UI is better
  - **File**: `app/(main)/dashboard/analytics/page.tsx`
  - **Added**: `app/(main)/dashboard/analytics/_components/geo-distribution.tsx`
  - **Removed**: `SalesByProductChart` import and `buildSalesByProduct()` function
  - **Status**: DONE

### Old Analytics Page
- **DELETED**: Old `/dashboard/analytics` page (user acquisition, section buyers, best sellers, renewals, payment issues)
  - **Reason**: Duplicate of Default; consolidated into single Analytics page
  - **Deleted**: `app/(main)/dashboard/analytics/` (entire old directory)
  - **Status**: DONE

---

## 2. Admin Portal Route Map

| Route | File | Status | Backend Ready |
|-------|------|--------|---------------|
| `/dashboard/analytics` | `app/(main)/dashboard/analytics/page.tsx` | Working | Partial |
| `/dashboard/crm` | `app/(main)/dashboard/crm/page.tsx` | **DELETED** | N/A |
| `/dashboard/finance` | `app/(main)/dashboard/finance/page.tsx` | Working | Partial |
| `/dashboard/academy` | `app/(main)/dashboard/academy/page.tsx` | Working | YES |
| `/dashboard/academy/[courseId]/batches` | `app/(main)/dashboard/academy/[courseId]/batches/page.tsx` | Working | YES |
| `/dashboard/academy/[courseId]/batches/[batchId]` | `app/(main)/dashboard/academy/[courseId]/batches/[batchId]/page.tsx` | Working | YES |
| `/dashboard/academy/[courseId]/batches/[batchId]/participants` | `app/(main)/dashboard/academy/[courseId]/batches/[batchId]/participants/page.tsx` | Working | YES |
| `/dashboard/academy/[courseId]/batches/all/participants` | `app/(main)/dashboard/academy/[courseId]/batches/all/participants/page.tsx` | Working | YES |
| `/dashboard/indicators` | `app/(main)/dashboard/indicators/page.tsx` | Working | Partial |
| `/dashboard/botalerts` | `app/(main)/dashboard/botalerts/page.tsx` | Working | YES |
| `/dashboard/bots` | `app/(main)/dashboard/bots/page.tsx` | Working | YES |
| `/dashboard/batches` | `app/(main)/dashboard/batches/page.tsx` | Mock Only | NO |

---

## 3. Backend Endpoint Mapping

### 3.1 Authentication
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| POST | `/api/admin/login` | `{ username, password }` | `{ access_token }` | ACTIVE |

### 3.2 Dashboard Overview
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| GET | `/` | - | `{ status, latency_ms }` | NEEDED |
| GET | `/api/admin/dashboard/overview` | - | `{ new_signups, active_users, products_sold, participated_users }` | NEEDED |
| GET | `/api/admin/dashboard/enrolling-courses` | - | `[{ id, title, enrolled_count, ... }]` | NEEDED |
| GET | `/api/admin/dashboard/upcoming-sessions` | - | `[{ id, title, date, ... }]` | NEEDED |

### 3.3 Courses (Academy)
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| GET | `/api/admin/courses` | Query: `?skip=N&limit=N` | `[{ id, title, price, purchased_count, ... }]` | ACTIVE |
| GET | `/api/admin/courses/check-id/{courseId}` | - | `{ available: boolean }` | ACTIVE |
| POST | `/api/admin/courses` | `{ title, price, ... }` | `{ id, ... }` | ACTIVE |
| GET | `/api/admin/courses/{courseId}/batches` | - | `[{ id, name, status, ... }]` | ACTIVE |
| POST | `/api/admin/courses/{courseId}/batches` | `{ name, ... }` | `{ id, ... }` | ACTIVE |
| GET | `/api/admin/courses/{courseId}/chapters` | - | `[{ id, title, ... }]` | ACTIVE |
| POST | `/api/admin/courses/{courseId}/chapters` | `{ title, ... }` | `{ id, ... }` | ACTIVE |
| GET | `/api/admin/courses/{courseId}/template` | - | `{ settings, ... }` | ACTIVE |
| PUT | `/api/admin/courses/{courseId}/template` | `{ settings }` | `{ success }` | ACTIVE |
| GET | `/api/admin/courses/{courseId}/waitlist` | - | `[{ user_id, email, ... }]` | ACTIVE |

### 3.4 Indicators
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| GET | `/fetch/indicators` | - | `[{ id, indicator_name, indicator_price, buyers, status, ... }]` | ACTIVE |
| POST | `/add/indicator` | `{ indicator_name, indicator_price, ... }` | `{ id, ... }` | ACTIVE |
| PATCH | `/edit/indicator/{id}` | `{ indicator_name, indicator_price, ... }` | `{ success }` | ACTIVE |
| DELETE | `/delete/indicator/{id}` | - | `{ success }` | ACTIVE |

### 3.5 Bots & Bot Users
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| GET | `/api/admin/bots` | - | `[{ id, bot_name, display_name, ... }]` | ACTIVE |
| POST | `/api/admin/add/bot` | `{ bot_name, display_name, ... }` | `{ id, ... }` | ACTIVE |
| PATCH | `/api/admin/edit/bot/{id}` | `{ bot_name, display_name, ... }` | `{ success }` | ACTIVE |
| DELETE | `/api/admin/delete/bot/{id}` | - | `{ success }` | ACTIVE |
| GET | `/api/admin/botusers` | - | `[{ id, key, user, telegramId, model, expiry, ... }]` | ACTIVE |

### 3.6 Batches
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| GET | `/batches/{batchId}/schedules` | - | `[{ id, date, time, ... }]` | ACTIVE |
| POST | `/batches/{batchId}/schedules` | `{ date, time, ... }` | `{ id, ... }` | ACTIVE |
| GET | `/batches/{batchId}/participants` | - | `[{ id, user_id, name, ... }]` | ACTIVE |
| POST | `/batches/{batchId}/participants` | `{ user_id, ... }` | `{ success }` | ACTIVE |

### 3.7 Uploads
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| POST | `/api/upload/thumbnail` | FormData: `file` | `{ url }` | ACTIVE |

### 3.8 Users
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| GET | `/users/search?q={query}` | - | `[{ id, email, name, ... }]` | ACTIVE |

### 3.9 DELETED Endpoints (CRM - Verify Backend)
| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| GET | `/api/admin/crm/leads` | - | `[{ id, name, email, status, ... }]` | DELETED |
| POST | `/api/admin/crm/leads` | `{ name, email, ... }` | `{ id, ... }` | DELETED |
| PATCH | `/api/admin/crm/leads/{id}` | `{ status, ... }` | `{ success }` | DELETED |
| DELETE | `/api/admin/crm/leads/{id}` | - | `{ success }` | DELETED |
| GET | `/api/admin/crm/pipeline` | - | `[{ stage, count, ... }]` | DELETED |
| GET | `/api/admin/crm/analytics` | - | `{ leads_by_source, ... }` | DELETED |

---

## 4. Pages with Mock/Placeholder Data

| Page | What's Mocked | Needed Backend Endpoint |
|------|---------------|------------------------|
| `/dashboard/analytics` | `RecentPurchasersTable` (empty), `GeoDistribution` (empty) | NEEDED: `/api/admin/recent-purchasers`, `/api/admin/analytics/geo` |
| `/dashboard/batches` | ALL data (3 hardcoded batch rows) | NEEDED: `/api/admin/batches` or remove page |

---

## 5. Duplicate Endpoints

| Endpoint | Used By | Note |
|----------|---------|------|
| `/api/admin/bots` | `/dashboard/bots` AND `/dashboard/botalerts` (BotsTab) | Duplicate page - consider removing one |
| `/api/admin/add/bot` | `/dashboard/bots` AND `/dashboard/botalerts` (BotsTab) | Duplicate page - consider removing one |

**Recommendation**: Remove standalone `/dashboard/bots` page since BotsTab in botalerts already handles bot CRUD.

---

## 6. Backend Pipeline Checklist

### Phase 1: Core Endpoints (Already Exist - Verify)
- [ ] `POST /api/admin/login` - auth flow
- [ ] `GET /api/admin/courses` - course listing
- [ ] `GET /api/admin/bots` - bot listing
- [ ] `GET /api/admin/botusers` - bot user listing
- [ ] `GET /fetch/indicators` - indicator listing

### Phase 2: Dashboard Endpoints (Need Creation)
- [ ] `GET /` - health check ping
- [ ] `GET /api/admin/dashboard/overview` - KPI stats
- [ ] `GET /api/admin/dashboard/enrolling-courses` - active enrollments
- [ ] `GET /api/admin/dashboard/upcoming-sessions` - scheduled sessions
- [ ] `GET /api/admin/recent-purchasers` - recent purchases

### Phase 3: Analytics Enhancement
- [ ] `GET /api/admin/analytics/geo` - geographic distribution
- [ ] `GET /api/admin/analytics/acquisition` - user acquisition
- [ ] `GET /api/admin/analytics/renewals` - renewal queue

### Phase 4: DELETED - Verify Backend Cleanup
- [ ] `GET /api/admin/crm/leads` - DEAD ENDPOINT, verify can remove
- [ ] `POST /api/admin/crm/leads` - DEAD ENDPOINT, verify can remove
- [ ] `PATCH /api/admin/crm/leads/{id}` - DEAD ENDPOINT, verify can remove
- [ ] `DELETE /api/admin/crm/leads/{id}` - DEAD ENDPOINT, verify can remove
- [ ] `GET /api/admin/crm/pipeline` - DEAD ENDPOINT, verify can remove
- [ ] `GET /api/admin/crm/analytics` - DEAD ENDPOINT, verify can remove

---

## 7. FastAPI Router Registration

Ensure all endpoints are registered in FastAPI. Check `backend/app/main.py`:

```python
app.include_router(admin_router, prefix="/api/admin")
# or individual routers:
app.include_router(courses_router, prefix="/api/admin/courses")
app.include_router(bots_router, prefix="/api/admin/bots")
app.include_router(indicators_router, prefix="/api")
```

---

## 8. Notes

- All admin endpoints require Bearer token authentication (NextAuth JWT)
- Frontend sends `Authorization: Bearer {access_token}` header
- Backend must validate JWT and return 401 if invalid/expired
- `NEXT_PUBLIC_API_URL` env var defaults to `http://127.0.0.1:8000`
- DELETED endpoints are kept here for backend verification - confirm they can be safely removed

---

*Last Updated: 2026-06-16*
*Status: UI Changes Complete, Backend Pipeline Pending*
