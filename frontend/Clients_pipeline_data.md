# Clients Manage Pipeline — Data Requirements

---

## Backend Endpoints (10 total)

| # | Method | Path | Status | Description |
|---|--------|------|--------|-------------|
| 1 | GET | `/api/admin/users` | ✅ Built | List all clients |
| 2 | GET | `/api/admin/users/check-username/{username}` | ✅ Built | Check username availability |
| 3 | POST | `/api/admin/users` | ✅ Built | Create client |
| 4 | PUT | `/api/admin/users/{user_id}` | ✅ Built | Update client |
| 5 | GET | `/api/admin/users/{user_id}/courses` | ✅ Built | User's enrolled courses |
| 6 | GET | `/api/admin/users/{user_id}/indicators` | ✅ Built | User's enrolled indicators |
| 7 | GET | `/api/admin/users/{user_id}/bots` | ✅ Built | User's enrolled bots |
| 8 | PATCH | `/api/admin/courses/members/{member_id}` | ✅ Reuse | Update course expiry |
| 9 | PATCH | `/api/admin/indicators/members/{member_id}` | ✅ Reuse | Update indicator expiry |
| 10 | PATCH | `/api/admin/bots/members/{member_id}` | ✅ Reuse | Update bot expiry |

---

## SQL Table: `users`

| Column | Type | Notes |
|---|---|---|
| `user_id` | INT AUTO_INCREMENT PK | |
| `username` | VARCHAR(255) UNIQUE | Login handle, shown as @username |
| `firstname` | VARCHAR(255) nullable | |
| `lastname` | VARCHAR(255) nullable | |
| `email` | VARCHAR(255) UNIQUE | |
| `password_hash` | VARCHAR(255) | Hashed password |
| `phone_number` | VARCHAR(255) nullable UNIQUE | Mobile number |
| `tvid` | VARCHAR(255) nullable UNIQUE | TradingView ID |
| `telegram_user_id` | VARCHAR(255) nullable UNIQUE | |
| `telegram_chat_id` | VARCHAR(255) nullable | |
| `discord_user_id` | VARCHAR(255) nullable UNIQUE | |
| `discord_chat_id` | VARCHAR(255) nullable | |
| `is_verified` | BOOLEAN | Default false |
| `last_login` | TIMESTAMP nullable | |
| `verification_token` | VARCHAR(255) nullable | |
| `token_expires_at` | TIMESTAMP nullable | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

## API Request/Response Shapes

### 1. `GET /api/admin/users`
**Response**: `[{ id, UserID, UserName, email, tvid, phone_number, telegram_user_id, telegram_chat_id, discord_user_id, discord_chat_id, is_verified, created_at }]`

### 2. `GET /api/admin/users/check-username/{username}`
**Response**: `{ available: boolean }`

### 3. `POST /api/admin/users`
**Request**: `{ username, firstname, lastname, email, phone_number?, tvid?, telegram_user_id?, telegram_chat_id?, discord_user_id?, discord_chat_id?, password? }`
**Response**: `{ id, UserID, UserName, email, ... }` (same shape as list)
**Business rules**: username/email unique; password optional → system-generated if blank

### 4. `PUT /api/admin/users/{user_id}`
**Request**: `{ firstname?, lastname?, email?, phone_number?, tvid?, telegram_user_id?, telegram_chat_id?, discord_user_id?, discord_chat_id?, password? }`
**Response**: Updated user (same shape)
**Business rules**: username immutable; password optional → keep current if blank

### 5. `GET /api/admin/users/{user_id}/courses`
**Response**: `[{ member_id, product_id, title, access_type, joined_at, expiry }]`
**Access type**: Derived from transaction amount (paid > 0, free = 0)

### 6. `GET /api/admin/users/{user_id}/indicators`
**Response**: `[{ member_id, product_id, title, access_type, joined_at, expiry }]`

### 7. `GET /api/admin/users/{user_id}/bots`
**Response**: `[{ member_id, product_id, title, access_type, joined_at, expiry }]`

---

## Field Mapping (Frontend Form → API)

| Add Form Field | Edit Form Field | API Column | Notes |
|---|---|---|---|
| `username` | — | `username` | Create only, immutable |
| `firstname` + `lastname` | `firstname` + `lastname` | `firstname`, `lastname` | Separate fields |
| `email` | `email` | `email` | |
| `mobile` | `mobile` | `phone_number` | |
| `tvid` | `tvid` | `tvid` | |
| `telegramid` | `telegramid` | `telegram_user_id` | |
| `telegramchatid` | `telegramchatid` | `telegram_chat_id` | |
| `discordid` | `discordid` | `discord_user_id` | |
| `discordchatid` | `discordchatid` | `discord_chat_id` | |
| `password` | `password` | `password_hash` | Empty = skip/keep current |

---

## Business Rules

1. **Username unique** — checked via `/check-username/{username}` on blur
2. **Username immutable** after creation (not in PUT body)
3. **Required for create**: username, firstname, lastname, email
4. **Password optional** — blank means system-generated on create, keep current on edit
5. **All search is client-side** — full user list fetched, filtered in browser
6. **All pagination is client-side** — page sizes 10/20/30/40/50
7. **Detail dialog** fetches from 3 API endpoints (courses, indicators, bots)
8. **Expiry edit** uses existing PATCH endpoints from Academy/Indicators/Bots routers

---

## Detail Dialog (Eye Icon)

### Data Source
- Fetches from API on open: `GET /api/admin/users/{id}/courses|indicators|bots`
- No longer reads from zustand store

### Courses Tab
| Column | Source |
|---|---|
| Product | `title` from API |
| ID | `product_id` from API |
| Access | `access_type` badge (paid/free) |
| Enrolled | `joined_at` from API |
| Expiry | `expiry` from API |
| Action | Edit expiry → `PATCH /api/admin/courses/members/{member_id}` |

### Indicators Tab
| Column | Source |
|---|---|
| Product | `title` from API |
| ID | `product_id` from API |
| Access | `access_type` badge |
| Enrolled | `joined_at` |
| Expiry | `expiry` |
| Action | Edit expiry → `PATCH /api/admin/indicators/members/{member_id}` |

### Bots Tab
| Column | Source |
|---|---|
| Product | `title` from API |
| ID | `product_id` from API |
| Access | `access_type` badge |
| Enrolled | `joined_at` |
| Expiry | `expiry` |
| Action | Edit expiry → `PATCH /api/admin/bots/members/{member_id}` |

---

## Stat Cards

| Card | Computation |
|---|---|
| Total Clients | `users.length` |
| Total Enrolments | `members.length` (from zustand store) |
| Paid Access | `members.filter(m => m.accessType === "paid").length` |
| Free Access | `members.filter(m => m.accessType === "free").length` |

---

## Frontend Integration Status

### All Wired to Real API ✅
- `GET /api/admin/users` — client list
- `GET /api/admin/users/check-username/{username}` — availability check
- `POST /api/admin/users` — add client
- `PUT /api/admin/users/{id}` — edit client
- `GET /api/admin/users/{id}/courses` — detail dialog courses tab
- `GET /api/admin/users/{id}/indicators` — detail dialog indicators tab
- `GET /api/admin/users/{id}/bots` — detail dialog bots tab
- `PATCH /api/admin/courses/members/{id}` — course expiry edit
- `PATCH /api/admin/indicators/members/{id}` — indicator expiry edit
- `PATCH /api/admin/bots/members/{id}` — bot expiry edit

### Schemas Added
- `ClientCreate` — create client request body
- `ClientUpdate` — update client request body
- `ClientUserResponse` — user list response shape
- `UserEnrolledProduct` — enrolled product response shape
